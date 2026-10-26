// Differential compatibility test. Runs one corpus of checks against the published baseline and
// the candidate, installed side by side by setup-consumer.cjs, and fails on every observable
// difference that allowed-diffs.json does not list. For each check it compares:
//  - the returned value: key order, element order, undefined vs null, NaN and -0;
//  - whether returned rows are the shared dataset rows themselves (written as #row<index>);
//  - for exceptions, the error class and Node's error code. Messages are printed but not
//    compared, because V8 words them differently from one Node version to the next.
// The corpus covers package.json entry fields; export keys in order and their property
// descriptors; the default export; deep requires and Node ESM imports (named and default); the
// dataset file; every method over every code and a set of odd inputs; query() and search()
// option combinations; the utilities; fresh result objects versus shared rows; subclass
// self-calls, prototype patches and replaced datasets; and mutation of the shared dataset.
//
// Usage: node scripts/compat/differential.cjs <consumer-dir> [options]
//   --allow <file>  allow-list to apply (default: scripts/compat/allowed-diffs.json)
//   --no-allow      ignore the allow-list and report every difference
//   --list          print every check id and exit
//   --verbose       also print the allowed differences
//   --max <n>       print at most n failures (default 40)
//   --require-intended
//                   also fail when an allow-listed check still behaves like the baseline, to
//                   confirm that the intended changes are implemented
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./lib.cjs');

// ---------------------------------------------------------------------------------------------
// Text forms

// Stable text for an input value. Check ids are built from it.
function fmt(v) {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  switch (typeof v) {
    case 'number':
      return Object.is(v, -0) ? '-0' : String(v);
    case 'string':
      return JSON.stringify(v);
    case 'boolean':
      return String(v);
    case 'function':
      return 'fn';
    default:
      break;
  }
  if (Array.isArray(v)) return '[' + v.map(fmt).join(',') + ']';
  if (v instanceof String) return `new String(${JSON.stringify(String(v))})`;
  if (v instanceof Number) return `new Number(${fmt(Number(v))})`;
  return (
    '{' +
    Object.keys(v)
      .map((k) => JSON.stringify(k) + ':' + fmt(v[k]))
      .join(',') +
    '}'
  );
}

const fmtArgs = (args) => args.map(fmt).join(',');

// Inputs are rebuilt for each side, so one side can never observe the other side's mutations.
function cloneArg(v) {
  if (Array.isArray(v)) return v.map(cloneArg);
  if (v instanceof String) return new String(String(v));
  if (v instanceof Number) return new Number(Number(v));
  if (v !== null && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = cloneArg(v[k]);
    return out;
  }
  return v;
}

// Text for an output value. Rows of the side's own dataset are written as #row<index>.
function ser(v, rows, seen) {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  switch (typeof v) {
    case 'number':
      return Object.is(v, -0) ? '-0' : String(v);
    case 'string':
      return JSON.stringify(v);
    case 'boolean':
      return String(v);
    case 'bigint':
      return `${v}n`;
    case 'symbol':
      return v.toString();
    case 'function':
      return `[function ${v.name}/${v.length}]`;
    default:
      break;
  }
  if (rows && rows.has(v)) return `#row${rows.get(v)}`;
  if (v === Object.prototype) return '[Object.prototype]';
  if (seen.has(v)) return '[circular]';
  seen.add(v);
  let out;
  if (Array.isArray(v)) {
    const parts = new Array(v.length);
    for (let i = 0; i < v.length; i++) parts[i] = ser(v[i], rows, seen);
    out = '[' + parts.join(',') + ']';
  } else {
    const proto = Object.getPrototypeOf(v);
    let tag = '';
    if (proto === null) tag = 'null-prototype ';
    else if (proto !== Object.prototype)
      tag = `${(proto.constructor && proto.constructor.name) || '?'} `;
    const keys = Object.keys(v);
    out =
      tag + '{' + keys.map((k) => JSON.stringify(k) + ':' + ser(v[k], rows, seen)).join(',') + '}';
  }
  seen.delete(v);
  return out;
}

const ERROR_CLASSES = [TypeError, RangeError, SyntaxError, ReferenceError, EvalError, URIError];
if (typeof globalThis.AggregateError === 'function') ERROR_CLASSES.push(globalThis.AggregateError);

// The standard class an error belongs to, plus Node's error code when there is one.
function errorText(e) {
  if (!(e instanceof Error)) return `non-Error ${typeof e}`;
  let cls = 'Error';
  for (const C of ERROR_CLASSES) {
    if (e instanceof C) {
      cls = C.name;
      break;
    }
  }
  return typeof e.code === 'string' ? `${cls} ${e.code}` : cls;
}

function outcomeSync(fn, rows) {
  try {
    return 'returns ' + ser(fn(), rows, new Set());
  } catch (e) {
    return 'throws ' + errorText(e);
  }
}

async function outcome(run, side) {
  try {
    const value = await run(side);
    return { text: 'returns ' + ser(value, side.rows, new Set()) };
  } catch (e) {
    return { text: 'throws ' + errorText(e), message: e && e.message };
  }
}

function describeProperty(obj, key) {
  const d = Object.getOwnPropertyDescriptor(obj, key);
  if (!d) return `${key}: absent`;
  const flags = (d.enumerable ? 'e' : '-') + (d.configurable ? 'c' : '-');
  if (d.get || d.set) {
    return `${key}: accessor get=${!!d.get} set=${!!d.set} ${flags} ${typeof obj[key]}`;
  }
  return `${key}: data ${d.writable ? 'w' : '-'}${flags} ${typeof d.value}`;
}

// ---------------------------------------------------------------------------------------------
// The two sides

function makeSide(label, spec, dir, req, load) {
  const m = req(spec);
  const data = m.rwandaLocation && m.rwandaLocation.data;
  const rows = new Map();
  if (Array.isArray(data)) data.forEach((row, i) => rows.set(row, i));
  // Found on disk rather than resolved, so that the run still starts when package.json is not
  // resolvable (behind an "exports" map, say) and the checks can report it. It is a real path
  // because require.resolve() returns real paths (on macOS /var is a link to /private/var).
  const root = fs.realpathSync(path.join(dir, 'node_modules', ...spec.split('/')));
  const version = lib.readJson(path.join(root, 'package.json')).version;
  return { label, spec, req, load, m, rows, root, version, rw: new m.RwandaLocation() };
}

// ---------------------------------------------------------------------------------------------
// Corpus

const ODD = () => [
  undefined,
  null,
  0,
  -0,
  NaN,
  '',
  ' ',
  'abc',
  '0',
  '1',
  '101',
  '010101',
  ' 010101',
  10101,
  -1,
  1.5,
  999,
  999999999,
  1e21,
  Infinity,
  -Infinity,
  true,
  false,
  [],
  [1],
  {},
  new String('010101'),
  new Number(1),
];

const QUERY_KEYS = [
  'provinceCode',
  'provinceName',
  'districtCode',
  'districtName',
  'sectorCode',
  'sectorName',
  'cellCode',
  'cellName',
  'villageCode',
  'villageName',
];

// Keys that a plain object inherits from Object.prototype.
const INHERITED_KEYS = [
  '__proto__',
  'constructor',
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
];

const every = (list, n) => list.filter((_, i) => i % n === 0);
const distinct = (list) => Array.from(new Set(list));

function buildCorpus(base) {
  const checks = [];
  const ids = new Set();
  const add = (id, run, meta) => {
    if (ids.has(id)) throw new Error(`duplicate check id: ${id}`);
    ids.add(id);
    checks.push({ id, run, meta: meta || null });
  };
  // Generated argument lists may overlap; the first occurrence wins.
  const call = (method, args) => {
    const id = `rw.${method}(${fmtArgs(args)})`;
    if (!ids.has(id)) add(id, (s) => s.rw[method](...args.map(cloneArg)), { method, args });
  };
  const util = (fn, args) => {
    const id = `${fn}(${fmtArgs(args)})`;
    if (!ids.has(id)) add(id, (s) => s.m[fn](...args.map(cloneArg)), { fn, args });
  };

  // Codes and names to enumerate come from the baseline, so both sides get identical inputs.
  const ref = base.rw;
  const provinces = ref.getProvinces();
  const districts = ref.getDistricts();
  const sectors = ref.getSectors();
  const cells = ref.getCells();
  const villages = ref.getVillages();
  const P = provinces.map((x) => x.code);
  const D = districts.map((x) => x.code);
  const S = sectors.map((x) => x.code);
  const C = cells.map((x) => x.code);
  const V = villages.map((x) => x.code);
  const V0 = V[0];
  const other = (list, value) => list[(list.indexOf(value) + 1) % list.length];
  const methodNames = Object.getOwnPropertyNames(base.m.RwandaLocation.prototype).filter(
    (k) => k !== 'constructor'
  );

  // --- package.json and the CommonJS export surface ------------------------------------------
  add('package.json', (s) => {
    const p = s.req(`${s.spec}/package.json`);
    const fields = {};
    const keys = ['name', 'main', 'types', 'typings', 'exports', 'module', 'browser', 'bin'];
    keys.push('sideEffects', 'typesVersions', 'dependencies', 'peerDependencies');
    keys.push('optionalDependencies', 'bundleDependencies');
    for (const k of keys) fields[k] = p[k];
    fields.effectiveType = p.type || 'commonjs';
    fields.enginesNode = p.engines && p.engines.node;
    return fields;
  });
  add('exports:keys', (s) => Object.keys(s.m));
  add('exports:own-property-names', (s) => Object.getOwnPropertyNames(s.m));
  add('exports:descriptors', (s) =>
    Object.getOwnPropertyNames(s.m).map((k) => describeProperty(s.m, k))
  );
  add('exports:default-is-RwandaLocation', (s) => s.m.default === s.m.RwandaLocation);
  add('exports:function-signatures', (s) =>
    Object.keys(s.m)
      .filter((k) => typeof s.m[k] === 'function')
      .map((k) => `${k}: ${s.m[k].name}/${s.m[k].length}`)
  );
  add('exports:singleton', (s) => ({
    isInstance: s.m.rwandaLocation instanceof s.m.RwandaLocation,
    exactPrototype: Object.getPrototypeOf(s.m.rwandaLocation) === s.m.RwandaLocation.prototype,
  }));
  add('class:static-properties', (s) => {
    const K = s.m.RwandaLocation;
    return Object.getOwnPropertyNames(K)
      .map((k) => describeProperty(K, k))
      .concat([K.name, K.length]);
  });
  add('class:prototype', (s) => {
    const proto = s.m.RwandaLocation.prototype;
    return Object.getOwnPropertyNames(proto).map(
      (k) =>
        `${describeProperty(proto, k)}/${typeof proto[k] === 'function' ? proto[k].length : ''}`
    );
  });
  add('class:prototype-chain', (s) => {
    return Object.getPrototypeOf(s.m.RwandaLocation.prototype) === Object.prototype;
  });
  add('class:instance-properties', (s) => {
    const x = new s.m.RwandaLocation();
    return Object.getOwnPropertyNames(x)
      .map((k) => describeProperty(x, k))
      .concat([Object.getOwnPropertySymbols(x).length]);
  });
  add('class:call-without-new', (s) => s.m.RwandaLocation());
  add('class:constructor-arguments-ignored', (s) =>
    new s.m.RwandaLocation(1, 'x', {}).getStatistics()
  );
  add('class:detached-method', (s) => {
    const detached = s.rw.getProvinces;
    return detached();
  });
  add('class:map-with-this-argument', (s) => [101, 507].map(s.rw.getDistrictByCode, s.rw));
  add('class:map-extra-arguments', (s) => [
    ['010101'].map(s.rw.getCells, s.rw),
    [1010101].map(s.rw.getVillages, s.rw),
    [1, 2].map(s.rw.getDistricts, s.rw),
    [101, 102].map(s.rw.getSectors, s.rw),
  ]);

  // --- data file and deep requires -----------------------------------------------------------
  add('data:singleton-uses-deep-json', (s) => {
    return s.m.rwandaLocation.data === s.req(`${s.spec}/dist/db/locations.json`);
  });
  add('data:new-instance-uses-deep-json', (s) => {
    return new s.m.RwandaLocation().data === s.req(`${s.spec}/dist/db/locations.json`);
  });
  add('data:content', (s) => JSON.stringify(s.req(`${s.spec}/dist/db/locations.json`)));

  const deepRequires = [
    'dist',
    'dist/',
    'dist/index',
    'dist/index.js',
    'dist/lib',
    'dist/lib/RwandaLocation',
    'dist/lib/RwandaLocation.js',
    'dist/lib/utils',
    'dist/lib/utils.js',
    'dist/types',
    'dist/types/index',
    'dist/types/index.js',
    'dist/db',
    'dist/db/locations',
    'dist/db/locations.json',
    'package.json',
  ];
  for (const sub of deepRequires) {
    add(`require:${sub}`, (s) => {
      const specifier = `${s.spec}/${sub}`;
      const resolved = path.relative(s.root, s.req.resolve(specifier)).split(path.sep).join('/');
      const value = s.req(specifier);
      if (sub === 'package.json') return { resolved, name: value.name };
      if (Array.isArray(value)) {
        return { resolved, length: value.length, isDataset: value === s.m.rwandaLocation.data };
      }
      return {
        resolved,
        isRootModule: value === s.m,
        properties: Object.getOwnPropertyNames(value).map((k) => describeProperty(value, k)),
        sameAsRoot: Object.keys(value).filter((k) => value[k] === s.m[k]),
      };
    });
  }

  // --- Node ESM ------------------------------------------------------------------------------
  add('import:root', async (s) => {
    const ns = await s.load(s.spec);
    return {
      keys: Object.keys(ns),
      defaultType: typeof ns.default,
      defaultIsModuleExports: ns.default === s.m,
      defaultDefaultIsClass: !!ns.default && ns.default.default === s.m.RwandaLocation,
      named: Object.keys(s.m).map((k) => `${k}:${ns[k] === s.m[k]}`),
    };
  });
  add('import:construct-default', async (s) => {
    const ns = await s.load(s.spec);
    return new ns.default();
  });
  const deepImports = [
    'dist/index.js',
    'dist/lib/RwandaLocation.js',
    'dist/lib/utils.js',
    'dist/types/index.js',
    'dist/index',
    'dist/lib/RwandaLocation',
    'dist',
    'dist/db/locations.json',
    'package.json',
  ];
  for (const sub of deepImports) {
    add(`import:${sub}`, async (s) => {
      const ns = await s.load(`${s.spec}/${sub}`);
      return { keys: Object.keys(ns), defaultIsRequire: ns.default === s.req(`${s.spec}/${sub}`) };
    });
  }

  // --- RwandaLocation methods ----------------------------------------------------------------
  call('getProvinces', []);
  call('getProvinces', [3]);

  for (const x of P.concat(ODD(), [6])) call('getProvinceByCode', [x]);

  for (const n of provinces.map((p) => p.name)) {
    for (const variant of [n, n.toLowerCase(), n[0] + n.slice(1).toLowerCase(), ` ${n} `]) {
      call('getProvinceByName', [variant]);
    }
  }
  for (const x of ['Kigali City', 'Southern', 'Amajyepfo', 'kigali\n', 'İ', 'ı'].concat(ODD(), [
    new String('south'),
    { toLowerCase: () => 'east' },
    ['kigali'],
  ])) {
    call('getProvinceByName', [x]);
  }

  call('getDistricts', []);
  for (const x of P.concat(ODD(), [6, 101])) call('getDistricts', [x]);
  for (const x of D.concat(ODD(), [100, 104, 150, 599, 600])) call('getDistrictByCode', [x]);

  call('getSectors', []);
  for (const x of D.concat(ODD())) call('getSectors', [x]);
  for (const x of P.concat(ODD())) call('getSectors', [undefined, x]);
  for (const d of districts) {
    call('getSectors', [d.code, d.provinceCode]);
    call('getSectors', [d.code, other(P, d.provinceCode)]);
  }
  call('getSectors', [NaN, NaN]);
  for (const x of S.concat(ODD(), ['10101', 'INVALID', '010100', '050716', '010101 '])) {
    call('getSectorByCode', [x]);
  }

  call('getCells', []);
  for (const x of S.concat(ODD())) call('getCells', [x]);
  for (const x of D.concat(ODD())) call('getCells', [undefined, x]);
  for (const x of P.concat(ODD())) call('getCells', [undefined, undefined, x]);
  for (const s of every(sectors, 8)) {
    call('getCells', [s.code, s.districtCode]);
    call('getCells', [s.code, other(D, s.districtCode)]);
    call('getCells', [s.code, s.districtCode, s.provinceCode]);
    call('getCells', [s.code, undefined, other(P, s.provinceCode)]);
  }
  call('getCells', ['', 0, 0]);
  add('bulk:rw.getCellByCode(<every cell>)', (s) => C.map((c) => s.rw.getCellByCode(c)));
  for (const x of ODD().concat(['1010101'])) call('getCellByCode', [x]);

  call('getVillages', []);
  for (const x of C.concat(ODD(), ['1010101'])) call('getVillages', [x]);
  for (const x of S.concat(ODD())) call('getVillages', [undefined, x]);
  for (const x of D.concat(ODD())) call('getVillages', [undefined, undefined, x]);
  for (const x of P.concat(ODD())) call('getVillages', [undefined, undefined, undefined, x]);
  for (const c of every(cells, 20)) {
    call('getVillages', [c.code, c.sectorCode]);
    call('getVillages', [c.code, other(S, c.sectorCode)]);
    call('getVillages', [c.code, c.sectorCode, c.districtCode, c.provinceCode]);
    call('getVillages', [c.code, undefined, undefined, other(P, c.provinceCode)]);
  }
  for (const method of ['getVillageByCode', 'getHierarchy', 'getFullPath']) {
    add(`bulk:rw.${method}(<every village>)`, (s) => V.map((v) => s.rw[method](v)));
    for (const x of ODD().concat(['101010102', 101010101])) call(method, [x]);
  }

  call('getStatistics', []);
  add('singleton.getStatistics()', (s) => s.m.rwandaLocation.getStatistics());

  // query()
  call('query', []);
  for (const f of [
    {},
    { foo: 1 },
    { province_code: 1 },
    'kigali',
    5,
    true,
    [],
    [1],
    undefined,
    null,
  ]) {
    call('query', [f]);
  }
  for (const k of QUERY_KEYS) for (const x of ODD()) call('query', [{ [k]: x }]);
  for (const x of P) call('query', [{ provinceCode: x }]);
  for (const x of D) call('query', [{ districtCode: x }]);
  for (const x of S) call('query', [{ sectorCode: x }]);
  for (const x of every(C, 10)) call('query', [{ cellCode: x }]);
  for (const x of every(V, 100)) call('query', [{ villageCode: x }]);
  for (const n of distinct(provinces.map((p) => p.name))) {
    call('query', [{ provinceName: n }]);
    call('query', [{ provinceName: n.toLowerCase() }]);
  }
  for (const n of distinct(districts.map((d) => d.name))) {
    call('query', [{ districtName: n }]);
    call('query', [{ districtName: n.toUpperCase() }]);
  }
  for (const n of distinct(sectors.map((x) => x.name))) call('query', [{ sectorName: n }]);
  for (const n of every(distinct(cells.map((x) => x.name)), 10)) call('query', [{ cellName: n }]);
  for (const n of every(distinct(villages.map((x) => x.name)), 100)) {
    call('query', [{ villageName: n }]);
  }
  for (const f of [
    { provinceCode: 1, districtCode: 101, sectorName: 'Gitega' },
    { provinceCode: 1, districtCode: 201 },
    { districtName: 'gasabo', sectorName: 'remera' },
    { sectorCode: '010101', cellName: 'akabahizi' },
    { villageName: 'Gihanga', provinceName: 'KIGALI' },
    { provinceName: ' kigali ' },
    // Name filters throw on non-strings only when a row reaches them.
    { provinceName: 1 },
    { provinceCode: 2, districtName: 5 },
    { provinceCode: 999, districtName: 5 },
    { districtName: 5, provinceCode: 999 },
    { provinceName: ['kigali'] },
    { provinceName: new String('kigali') },
    { districtName: { toLowerCase: () => 'gasabo' } },
  ]) {
    call('query', [f]);
  }

  // search()
  const terms = ['', ' ', 'a', 'A', 'kigali', 'KIGALI', 'Kigali', 'Gihanga', 'gitega', 'east'];
  terms.push('GASABO', 'Katabagemu', '-', "'", '.*', '101', 'zzzz', 'é', 'Cit', 'a'.repeat(50));
  const caseOptions = [[], [false], [true], ['yes']];
  const limits = [[], [undefined], [0], [-0], [1], [10], [1000], [1.5], [0.5], ['5'], ['']];
  limits.push([NaN], [null], [Infinity], [true], [[2]]);
  const searchOptions = (query, cs, limit) => {
    const o = { query };
    if (cs.length) o.caseSensitive = cs[0];
    if (limit.length) o.limit = limit[0];
    return o;
  };
  for (const q of terms) {
    for (const cs of caseOptions) for (const l of limits) call('search', [searchOptions(q, cs, l)]);
  }
  // Negative limits: the intended 1.2.0 change (see allowed-diffs.json).
  for (const q of ['', 'a', 'kigali', 'Gihanga', 'zzzz']) {
    for (const cs of [[], [true]]) {
      for (const l of [-1, -2, -14000, -0.5, -Infinity, '-1', [-1]]) {
        call('search', [searchOptions(q, cs, [l])]);
      }
    }
  }
  for (const n of distinct(provinces.map((p) => p.name).concat(districts.map((d) => d.name)))) {
    call('search', [{ query: n }]);
  }
  for (const n of every(distinct(sectors.map((x) => x.name)), 10)) call('search', [{ query: n }]);
  for (const n of every(distinct(villages.map((x) => x.name)), 100)) call('search', [{ query: n }]);
  call('search', []);
  for (const o of [
    undefined,
    null,
    {},
    'kigali',
    { query: undefined },
    { query: undefined, caseSensitive: true },
    { query: null },
    { query: null, caseSensitive: true },
    { query: 1 },
    { query: 1, caseSensitive: true },
    { query: ['a'] },
    { query: ['a'], caseSensitive: true },
    { query: new String('kigali') },
    { query: { toLowerCase: () => 'kigali' } },
  ]) {
    call('search', [o]);
  }

  // --- utilities -----------------------------------------------------------------------------
  const strings = ['  KiGaLi  ', '\tX\n', ' X', 'a  b', 'É', 'İ'];
  for (const x of strings.concat(ODD())) util('normalizeString', [x]);
  for (const pair of [
    [' KIGALI ', 'kigali'],
    ['a  b', 'a b'],
    ['', '  '],
    ['é', 'é'],
    [undefined, 'x'],
    ['x', null],
    ['1', 1],
  ]) {
    util('matchesString', pair);
  }
  for (const x of ODD().concat([2, 3, 4, 5, 6, 4.9, '3', ' 2 ', [3]]))
    util('isValidProvinceCode', [x]);
  for (const x of ODD().concat([100, 150, 209, 308, 500, 599, 600, 101.5])) {
    util('isValidDistrictCode', [x]);
  }
  const levels = ['province', 'district', 'sector', 'cell', 'village', 'Village', 'foo', ' cell'];
  const levelInputs = levels.concat(ODD(), [new String('cell'), ['village']]);
  for (const fn of ['getParentLevel', 'getChildLevel']) {
    for (const x of levelInputs.concat(INHERITED_KEYS)) util(fn, [x]);
  }
  const mixed = () => [
    { a: 2, t: 'x' },
    { a: '1', t: 'y' },
    { a: 1, t: 'z' },
    { a: NaN, t: 'n' },
    { t: 'u' },
    { a: null, t: 'l' },
    { a: 0, t: 'o' },
    { a: '010101', t: 's' },
  ];
  for (const fn of ['getUniqueByKey', 'sortByNumericKey', 'sortByStringKey']) {
    add(`${fn}(<mixed>)`, (s) => {
      const input = mixed();
      const result = s.m[fn](input, 'a');
      return { result, sameReference: result === input, inputAfter: input };
    });
    add(`${fn}(null)`, (s) => s.m[fn](null, 'a'));
    add(`${fn}([])`, (s) => s.m[fn]([], 'a'));
  }
  add('sortByStringKey(<locale order>)', (s) => {
    const items = ['b', 'B', 'a', 'A', '_', '1', 'é', 'e', 'Z', 10, 9, 100].map((n) => ({ n }));
    return s.m.sortByStringKey(items, 'n');
  });
  add('sortByNumericKey(<stable ties>)', (s) => {
    const items = ['x', 'a', 'b', 'c'].map((t, i) => ({ k: i === 0 ? 0 : 1, t }));
    return s.m.sortByNumericKey(items, 'k');
  });
  const formatInputs = [
    ['row', (s) => s.m.rwandaLocation.data[0]],
    ['Village', (s) => s.rw.getVillageByCode(V0)],
    ['Cell', (s) => s.rw.getCellByCode(1010101)],
    ['{}', () => ({})],
    ['"x"', () => 'x'],
    ['5', () => 5],
    ['[]', () => []],
    ['null', () => null],
    ['undefined', () => undefined],
    ['partial-row', () => ({ village_name: 'A' })],
    ['mixed', () => ({ village_name: 'A', cellName: 'B', name: 'C' })],
  ];
  for (const [label, make] of formatInputs) {
    add(`formatLocation(<${label}>)`, (s) => s.m.formatLocation(make(s)));
  }

  // --- fresh objects and shared rows ---------------------------------------------------------
  const lists = [
    ['getProvinces', []],
    ['getDistricts', []],
    ['getDistricts', [2]],
    ['getSectors', []],
    ['getSectors', [101]],
    ['getCells', []],
    ['getCells', ['010101']],
    ['getVillages', []],
    ['getVillages', [1010101]],
  ];
  for (const [method, args] of lists) {
    add(`fresh:rw.${method}(${fmtArgs(args)})`, (s) => {
      const first = s.rw[method](...args);
      const second = s.rw[method](...args);
      const report = {
        newArray: first !== second,
        newElements: first.every((x, i) => x !== second[i]),
      };
      first[0].name = 'MUTATED';
      first[0].code = -1;
      first.length = 0;
      const third = s.rw[method](...args);
      report.afterMutation = [third.length, third[0]];
      return report;
    });
  }
  const lookups = [
    ['getProvinceByCode', 1],
    ['getProvinceByName', 'kigali'],
    ['getDistrictByCode', 101],
    ['getSectorByCode', '010101'],
    ['getCellByCode', 1010101],
    ['getVillageByCode', V0],
    ['getHierarchy', V0],
  ];
  for (const [method, arg] of lookups) {
    add(`fresh:rw.${method}(${fmt(arg)})`, (s) => {
      const first = s.rw[method](arg);
      const same = first === s.rw[method](arg);
      first.name = 'MUTATED';
      first.code = -1;
      return { same, after: s.rw[method](arg) };
    });
  }
  add('fresh:rw.getFullPath(<hit>)', (s) => {
    const a = s.rw.getFullPath(V0);
    const b = s.rw.getFullPath(V0);
    const report = {
      same: a === b,
      sameParts: Object.keys(a).map((k) => a[k] === b[k]),
      villageIsNewObject: a.village !== s.rw.getVillageByCode(V0),
    };
    a.province.name = 'MUTATED';
    a.village.name = 'MUTATED';
    report.after = s.rw.getFullPath(V0);
    return report;
  });
  add('fresh:rw.getFullPath(<miss>)', (s) => {
    const a = s.rw.getFullPath(1);
    const same = a === s.rw.getFullPath(1);
    a.province = 'MUTATED';
    return { same, after: s.rw.getFullPath(1) };
  });
  add('fresh:rw.getStatistics()', (s) => {
    const a = s.rw.getStatistics();
    const same = a === s.rw.getStatistics();
    a.totalVillages = 0;
    return { same, after: s.rw.getStatistics() };
  });
  add('shared:query-rows', (s) => {
    const a = s.rw.query({});
    return {
      newArray: a !== s.rw.query({}),
      notTheDataset: a !== s.rw.data,
      sameRows: a.length === s.rw.data.length && a.every((row, i) => row === s.rw.data[i]),
      acrossInstances:
        new s.m.RwandaLocation().query({ villageCode: V0 })[0] ===
        s.m.rwandaLocation.query({ villageCode: V0 })[0],
    };
  });
  add('shared:search-rows', (s) => {
    const a = s.rw.search({ query: '' });
    return {
      newArray: a !== s.rw.search({ query: '' }),
      notTheDataset: a !== s.rw.data,
      sameRows: a.length === s.rw.data.length && a.every((row, i) => row === s.rw.data[i]),
    };
  });

  // --- subclasses, prototype patches and replaced datasets -----------------------------------
  const spyCalls = [
    ['getProvinces', []],
    ['getProvinceByCode', [1]],
    ['getProvinceByName', ['kigali']],
    ['getDistricts', [1]],
    ['getDistrictByCode', [101]],
    ['getSectors', [101]],
    ['getSectorByCode', ['010101']],
    ['getCells', ['010101']],
    ['getCellByCode', [1010101]],
    ['getVillages', [1010101]],
    ['getVillageByCode', [V0]],
    ['query', [{ provinceCode: 1 }]],
    ['search', [{ query: 'Gihanga' }]],
    ['getHierarchy', [V0]],
    ['getStatistics', []],
    ['getFullPath', [V0]],
    ['getFullPath', [1]],
  ];
  add('subclass:self-calls', (s) => {
    const Base = s.m.RwandaLocation;
    const log = [];
    class Spy extends Base {}
    for (const name of methodNames) {
      Spy.prototype[name] = function (...args) {
        log.push(`${name}(${fmtArgs(args)})`);
        return Base.prototype[name].apply(this, args);
      };
    }
    const spy = new Spy();
    return spyCalls.map(([name, args]) => {
      log.length = 0;
      const result = outcomeSync(() => spy[name](...args.map(cloneArg)), s.rows);
      return { calls: log.slice(), result };
    });
  });
  add('subclass:getVillageByCode-override', (s) => {
    class Nulls extends s.m.RwandaLocation {
      getVillageByCode() {
        return null;
      }
    }
    class Custom extends s.m.RwandaLocation {
      getVillageByCode(code) {
        return {
          code,
          name: 'V',
          cellCode: 2,
          cellName: 'C',
          sectorCode: '3',
          sectorName: 'S',
          districtCode: 4,
          districtName: 'D',
          provinceCode: 5,
          provinceName: 'P',
        };
      }
    }
    const n = new Nulls();
    const c = new Custom();
    return [n.getHierarchy(V0), n.getFullPath(V0), c.getHierarchy(7), c.getFullPath(7)];
  });
  add('subclass:list-overrides-in-getStatistics', (s) => {
    class Few extends s.m.RwandaLocation {
      getProvinces() {
        return [];
      }
      getVillages() {
        return [1];
      }
    }
    return new Few().getStatistics();
  });
  add('prototype-patch:getStatistics', (s) => {
    const proto = s.m.RwandaLocation.prototype;
    const original = proto.getCells;
    proto.getCells = function () {
      return [1, 2, 3];
    };
    try {
      return [new s.m.RwandaLocation().getStatistics(), s.m.rwandaLocation.getStatistics()];
    } finally {
      proto.getCells = original;
    }
  });
  add('prototype-patch:restored', (s) => [s.rw.getStatistics(), s.rw.getCells().length]);

  const datasetCalls = [
    ['getProvinces', []],
    ['getProvinceByCode', [2]],
    ['getProvinceByName', ['south']],
    ['getDistricts', []],
    ['getDistricts', [1]],
    ['getDistrictByCode', [102]],
    ['getSectors', []],
    ['getSectors', [101]],
    ['getSectors', [102]],
    ['getSectors', [undefined, 1]],
    ['getSectorByCode', ['010101']],
    ['getCells', []],
    ['getCells', ['010101']],
    ['getCells', [undefined, 101]],
    ['getCells', [undefined, 102]],
    ['getCellByCode', [1010101]],
    ['getVillages', []],
    ['getVillages', [1010101]],
    ['getVillages', [undefined, '010101']],
    ['getVillageByCode', [V0]],
    ['getVillageByCode', [V[V.length - 1]]],
    ['query', [{ provinceCode: 1 }]],
    ['query', [{ villageName: 'gihanga' }]],
    ['search', [{ query: 'a', limit: 5 }]],
    ['search', [{ query: 'kigali' }]],
    ['getStatistics', []],
    ['getFullPath', [V0]],
  ];
  // Small dataset whose codes disagree about their parents, plus duplicate and NaN codes.
  const inconsistent = (data) => {
    const rows = data.slice(0, 60).map((row) => Object.assign({}, row));
    rows.push(Object.assign({}, data[0], { district_code: 102, district_name: 'Elsewhere' }));
    rows.push(Object.assign({}, data[3], { village_name: 'Duplicate code' }));
    rows.push(Object.assign({}, data[5], { province_code: 2, province_name: 'SOUTH' }));
    rows.push(Object.assign({}, data[7], { village_code: NaN, cell_code: NaN }));
    rows.unshift(Object.assign({}, data[59], { sector_code: '010101', sector_name: 'First' }));
    return rows;
  };
  const datasets = [
    ['subset', (data) => data.slice(0, 400)],
    ['reversed', (data) => data.slice().reverse()],
    ['empty', () => []],
    ['inconsistent', inconsistent],
  ];
  for (const [name, build] of datasets) {
    add(`dataset:${name}`, (s) => {
      const data = build(s.m.rwandaLocation.data);
      class Replaced extends s.m.RwandaLocation {
        constructor() {
          super();
          this.data = data;
        }
      }
      const x = new Replaced();
      return datasetCalls.map(([method, args]) =>
        outcomeSync(() => x[method](...args.map(cloneArg)), s.rows)
      );
    });
  }
  add('dataset:reassigned-on-one-instance', (s) => {
    const x = new s.m.RwandaLocation();
    x.data = [];
    return [x.getStatistics(), new s.m.RwandaLocation().getStatistics(), s.rw.getVillages().length];
  });

  // --- mutation of the shared dataset (last, so every lazily built structure is warm) --------
  add('mutation:renamed-row-is-visible', (s) => {
    const row = s.rw.query({ villageCode: V0 })[0];
    const saved = row.province_name;
    row.province_name = 'MUTATED';
    try {
      const x = new s.m.RwandaLocation();
      return [
        x.getProvinceByCode(1),
        x.getProvinces()[0],
        x.getDistrictByCode(101),
        x.getVillageByCode(V0),
        x.getFullPath(V0).province,
        s.m.rwandaLocation.getCellByCode(1010101),
      ];
    } finally {
      row.province_name = saved;
    }
  });
  add('mutation:pushed-row-is-visible', (s) => {
    const data = s.m.rwandaLocation.data;
    const extra = Object.assign({}, data[0], {
      id: 'compat-extra',
      village_code: 101010199,
      village_name: 'Compatvillage',
    });
    data.push(extra);
    let during;
    try {
      const x = new s.m.RwandaLocation();
      during = [
        x.getStatistics(),
        s.m.rwandaLocation.getStatistics(),
        x.getVillageByCode(101010199),
        x.getVillages(1010101).length,
        x.query({ villageCode: 101010199 }).length,
        x.search({ query: 'compatvillage' }).length,
      ];
    } finally {
      data.pop();
    }
    const after = [
      s.rw.getStatistics(),
      s.rw.getVillageByCode(101010199),
      s.rw.getVillages(1010101).length,
    ];
    return { during, after };
  });

  return checks;
}

// ---------------------------------------------------------------------------------------------
// Allow-list

const isObject = (v) => v !== null && typeof v === 'object';

// What the candidate must return for an allow-listed check, by kind of intended change.
const EXPECTATIONS = {
  // search({ limit }) where (limit < 0) is true returns every match, as if no limit were given.
  'search-negative-limit-returns-all': {
    applies: (meta) =>
      !!meta &&
      meta.method === 'search' &&
      meta.args.length === 1 &&
      isObject(meta.args[0]) &&
      'limit' in meta.args[0] &&
      meta.args[0].limit < 0,
    expected: (meta, base) => {
      const options = cloneArg(meta.args[0]);
      delete options.limit;
      return outcome(() => base.rw.search(options), base);
    },
  },
  // getParentLevel/getChildLevel return undefined for keys inherited from Object.prototype.
  'inherited-level-key-returns-undefined': {
    applies: (meta) =>
      !!meta &&
      (meta.fn === 'getParentLevel' || meta.fn === 'getChildLevel') &&
      typeof meta.args[0] === 'string' &&
      meta.args[0] in {},
    expected: () => Promise.resolve({ text: 'returns undefined' }),
  },
};

function loadAllowList(file, baselineVersion, checksById) {
  const allowed = new Map();
  const problems = [];
  if (!file) return { allowed, problems };
  const json = lib.readJson(file);
  for (const change of json.changes || []) {
    if (change.baselineBelow && lib.compareVersions(baselineVersion, change.baselineBelow) >= 0) {
      continue;
    }
    const expectation = EXPECTATIONS[change.expect];
    if (!expectation) {
      problems.push(`${change.id}: unknown expectation "${change.expect}"`);
      continue;
    }
    for (const id of change.checks || []) {
      const check = checksById.get(id);
      if (!check) problems.push(`${change.id}: no check has the id ${id}`);
      else if (!expectation.applies(check.meta))
        problems.push(`${change.id}: ${id} is out of scope`);
      else if (allowed.has(id)) problems.push(`${change.id}: ${id} is listed twice`);
      else allowed.set(id, { change, expectation });
    }
  }
  return { allowed, problems };
}

// ---------------------------------------------------------------------------------------------
// Reporting

function excerpt(a, b) {
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i++;
  const from = Math.max(0, i - 100);
  const cut = (t) =>
    (from > 0 ? '...' : '') + t.slice(from, i + 200) + (t.length > i + 200 ? '...' : '');
  return { at: i, a: cut(a), b: cut(b) };
}

function printDiff(title, id, b, c) {
  const e = excerpt(b.text, c.text);
  console.log(`\n${title} ${id}`);
  console.log(`  baseline : ${e.a}`);
  console.log(`  candidate: ${e.b}`);
  if (e.at > 100) console.log(`  (first difference at character ${e.at})`);
  if (b.message) console.log(`  baseline error message : ${b.message}`);
  if (c.message) console.log(`  candidate error message: ${c.message}`);
}

function parseArgs(argv) {
  const opts = {
    dir: null,
    allow: path.join(__dirname, 'allowed-diffs.json'),
    list: false,
    verbose: false,
    max: 40,
    requireIntended: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--allow') opts.allow = path.resolve(argv[++i]);
    else if (a === '--no-allow') opts.allow = null;
    else if (a === '--list') opts.list = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '--max') opts.max = Number(argv[++i]);
    else if (a === '--require-intended') opts.requireIntended = true;
    else if (!opts.dir && !a.startsWith('--')) opts.dir = path.resolve(a);
    else throw new Error(`unknown argument: ${a}`);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.dir) {
    console.error('usage: node scripts/compat/differential.cjs <consumer-dir> [options]');
    process.exit(2);
  }
  const req = lib.consumerRequire(opts.dir);
  const load = await lib.esmLoader(opts.dir);
  const base = makeSide('baseline', lib.BASELINE_ALIAS, opts.dir, req, load);
  const cand = makeSide('candidate', lib.PACKAGE_NAME, opts.dir, req, load);
  const baseVersion = base.version;
  const candVersion = cand.version;

  const checks = buildCorpus(base);
  if (opts.list) {
    for (const c of checks) console.log(c.id);
    return;
  }
  const checksById = new Map(checks.map((c) => [c.id, c]));
  const { allowed, problems } = loadAllowList(opts.allow, baseVersion, checksById);
  console.log(
    `differential: baseline ${baseVersion} vs candidate ${candVersion} on node ${process.version}, ` +
      `${checks.length} checks, ${allowed.size} allow-listed`
  );

  const started = Date.now();
  const failures = [];
  const allowedDiffs = [];
  let identical = 0;
  for (const check of checks) {
    const b = await outcome(check.run, base);
    const c = await outcome(check.run, cand);
    const entry = allowed.get(check.id);
    if (b.text === c.text) {
      identical++;
      if (entry && opts.requireIntended) {
        const expected = await entry.expectation.expected(check.meta, base);
        if (expected.text !== c.text) {
          failures.push({ title: `NOT IMPLEMENTED (${entry.change.id})`, check, b: expected, c });
        }
      }
      continue;
    }
    if (!entry) {
      failures.push({ title: 'DIFF', check, b, c });
      continue;
    }
    const expected = await entry.expectation.expected(check.meta, base);
    if (expected.text === c.text) allowedDiffs.push({ check, b, c, change: entry.change });
    else failures.push({ title: `NOT AS INTENDED (${entry.change.id})`, check, b: expected, c });
  }

  for (const f of failures.slice(0, opts.max)) printDiff(f.title, f.check.id, f.b, f.c);
  if (failures.length > opts.max) console.log(`\n... and ${failures.length - opts.max} more`);
  if (opts.verbose)
    for (const d of allowedDiffs) printDiff(`ALLOWED (${d.change.id})`, d.check.id, d.b, d.c);
  for (const p of problems) console.log(`ALLOW-LIST ERROR ${p}`);

  const byChange = {};
  for (const d of allowedDiffs) byChange[d.change.id] = (byChange[d.change.id] || 0) + 1;
  const breakdown = Object.keys(byChange)
    .map((k) => `${k}: ${byChange[k]}`)
    .join(', ');
  console.log(
    `\ndifferential: ${checks.length} checks in ${((Date.now() - started) / 1000).toFixed(1)} s: ` +
      `${identical} identical, ${allowedDiffs.length} intended changes${breakdown ? ` (${breakdown})` : ''}, ` +
      `${failures.length} failures, ${problems.length} allow-list errors`
  );
  if (failures.length || problems.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
