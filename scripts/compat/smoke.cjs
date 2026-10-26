// CommonJS smoke test of an installed package. It pins the parts of the 1.x contract that
// existing users rely on: package.json entry points, the export surface, deep requires and a
// set of golden outputs. It needs no baseline and no network.
//
// Usage: node scripts/compat/smoke.cjs <consumer-dir> [package-specifier]
//   package-specifier defaults to @devrw/rwanda-location; pass `baseline` to check the
//   installed baseline with the same assertions.
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const lib = require('./lib.cjs');

const EXPORT_KEYS = [
  'rwandaLocation',
  'RwandaLocation',
  'normalizeString',
  'matchesString',
  'getUniqueByKey',
  'sortByNumericKey',
  'sortByStringKey',
  'isValidProvinceCode',
  'isValidDistrictCode',
  'formatLocation',
  'getParentLevel',
  'getChildLevel',
  'default',
];
const UTILS = EXPORT_KEYS.slice(2, 12);

// First 16 hex characters of sha256(JSON.stringify(output)), recorded from 1.1.2.
const FINGERPRINTS = [
  ['getProvinces()', (rw) => rw.getProvinces(), 5, '5c8be40b400985c2'],
  ['getDistricts()', (rw) => rw.getDistricts(), 30, 'b4691358283e746c'],
  ['getSectors()', (rw) => rw.getSectors(), 416, '6d5511aec33ace8d'],
  ['getCells()', (rw) => rw.getCells(), 2148, '5f9b6faf2213ba2a'],
  ['getVillages()', (rw) => rw.getVillages(), 14842, '575190304888fa52'],
  ['query({})', (rw) => rw.query({}), 14842, '7b067bae7b7e8a61'],
  ['search({query:"a"})', (rw) => rw.search({ query: 'a' }), 14774, '4a6742d75263c43c'],
  ['search({query:"kigali"})', (rw) => rw.search({ query: 'kigali' }), 1182, '5b3a19c24ba263f7'],
  ['getStatistics()', (rw) => rw.getStatistics(), null, '1ea915d8a4067863'],
  ['getFullPath(101010102)', (rw) => rw.getFullPath(101010102), null, '0029e65725997c96'],
];

const fingerprint = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

function main() {
  const dir = process.argv[2];
  const spec = process.argv[3] || lib.PACKAGE_NAME;
  if (!dir) {
    console.error('usage: node scripts/compat/smoke.cjs <consumer-dir> [package-specifier]');
    process.exit(2);
  }
  const req = lib.consumerRequire(dir);
  const pkg = req(`${spec}/package.json`);
  console.log(`smoke.cjs: ${pkg.name}@${pkg.version} (${spec}) on node ${process.version}`);

  // package.json: how require(), import and TypeScript find the package.
  assert.strictEqual(pkg.name, lib.PACKAGE_NAME);
  assert.strictEqual(pkg.main, 'dist/index.js');
  assert.strictEqual(pkg.types, 'dist/index.d.ts');
  assert.ok(pkg.type === undefined || pkg.type === 'commonjs', `"type" is ${pkg.type}`);
  // An exports map would block every deep import that 1.x users make today.
  assert.strictEqual(pkg.exports, undefined, 'package.json must not have an "exports" map in 1.x');
  assert.strictEqual(pkg.module, undefined, 'a "module" entry changes what bundlers load');
  assert.deepStrictEqual(Object.keys(pkg.dependencies || {}), [], 'no runtime dependencies');
  assert.strictEqual(pkg.engines && pkg.engines.node, '>=14.0.0');
  // Install hooks and platform fields would change what `npm install` does for every user.
  const hooks = [
    'preinstall',
    'install',
    'postinstall',
    'preuninstall',
    'uninstall',
    'postuninstall',
  ];
  for (const hook of hooks) {
    assert.strictEqual((pkg.scripts || {})[hook], undefined, `package.json has a "${hook}" script`);
  }
  const fields = ['os', 'cpu', 'libc', 'gypfile', 'bin', 'imports'];
  const depFields = [
    'peerDependencies',
    'optionalDependencies',
    'bundleDependencies',
    'bundledDependencies',
  ];
  for (const field of fields.concat(depFields)) {
    assert.strictEqual(pkg[field], undefined, `package.json has "${field}"`);
  }

  // Export surface: key order, property kinds and the default export.
  const m = req(spec);
  assert.deepStrictEqual(Object.keys(m), EXPORT_KEYS);
  const esModule = Object.getOwnPropertyDescriptor(m, '__esModule');
  assert.ok(esModule && esModule.value === true && !esModule.enumerable, '__esModule marker');
  for (const key of ['rwandaLocation', 'default']) {
    const d = Object.getOwnPropertyDescriptor(m, key);
    assert.ok(d.writable && d.enumerable && d.configurable && !d.get, `${key} is a data property`);
  }
  for (const key of ['RwandaLocation'].concat(UTILS)) {
    const d = Object.getOwnPropertyDescriptor(m, key);
    assert.ok(typeof d.get === 'function' && d.enumerable && !d.configurable, `${key} is a getter`);
    assert.strictEqual(typeof m[key], 'function', `${key} is a function`);
  }
  assert.strictEqual(m.default, m.RwandaLocation, 'default export is the RwandaLocation class');
  assert.ok(m.rwandaLocation instanceof m.RwandaLocation);

  // Deep requires that work in 1.1.2 and are used in the wild.
  const data = req(`${spec}/dist/db/locations.json`);
  assert.ok(Array.isArray(data) && data.length === 14842, 'dist/db/locations.json has 14842 rows');
  assert.strictEqual(m.rwandaLocation.data, data, 'the singleton reads the deep-imported array');
  assert.strictEqual(new m.RwandaLocation().data, data, 'instances share the deep-imported array');
  assert.strictEqual(req(`${spec}/dist/db/locations`), data);
  for (const sub of ['dist/lib/RwandaLocation', 'dist/lib/RwandaLocation.js']) {
    assert.strictEqual(req(`${spec}/${sub}`).RwandaLocation, m.RwandaLocation, sub);
  }
  for (const sub of ['dist/lib/utils', 'dist/lib/utils.js']) {
    const utils = req(`${spec}/${sub}`);
    for (const key of UTILS) assert.strictEqual(utils[key], m[key], `${sub} ${key}`);
  }
  for (const sub of ['dist/index', 'dist/index.js', 'dist']) {
    assert.strictEqual(req(`${spec}/${sub}`), m, sub);
  }
  assert.deepStrictEqual(Object.keys(req(`${spec}/dist/types`)), []);
  const root = path.dirname(req.resolve(`${spec}/package.json`));
  assert.strictEqual(path.relative(root, req.resolve(spec)).split(path.sep).join('/'), pkg.main);

  // Golden outputs.
  const rw = new m.RwandaLocation();
  for (const [label, fn, length, expected] of FINGERPRINTS) {
    const out = fn(rw);
    if (length !== null) assert.strictEqual(out.length, length, `${label} length`);
    assert.strictEqual(fingerprint(out), expected, `${label} fingerprint`);
  }
  assert.deepStrictEqual(rw.getStatistics(), {
    totalProvinces: 5,
    totalDistricts: 30,
    totalSectors: 416,
    totalCells: 2148,
    totalVillages: 14842,
  });
  assert.deepStrictEqual(rw.getVillageByCode(101010102), {
    code: 101010102,
    name: 'Gihanga',
    cellCode: 1010101,
    cellName: 'Akabahizi',
    sectorCode: '010101',
    sectorName: 'Gitega',
    districtCode: 101,
    districtName: 'Nyarugenge',
    provinceCode: 1,
    provinceName: 'KIGALI',
  });
  // Quirks that 1.x keeps: a falsy filter means "no filter", codes are compared with ===.
  assert.strictEqual(rw.getDistricts(0).length, 30);
  assert.strictEqual(rw.getDistricts(999).length, 0);
  assert.strictEqual(rw.getSectorByCode(10101), null);
  assert.strictEqual(rw.getProvinceByCode(999), null);
  assert.strictEqual(rw.search({ query: 'Kigali', limit: 10 }).length, 10);
  // query() and search() return the shared rows themselves; list methods return new objects.
  assert.strictEqual(rw.query({ villageCode: 101010102 })[0], data[0]);
  assert.strictEqual(rw.search({ query: 'Gihanga' })[0], data[0]);
  assert.notStrictEqual(rw.getProvinces()[0], rw.getProvinces()[0]);
  assert.throws(() => m.RwandaLocation(), TypeError);

  console.log('smoke.cjs: OK');
}

main();
