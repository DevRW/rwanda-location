/**
 * Differential test: the current implementation against the frozen 1.1.2 code in
 * ./oracle/v1.1.2, copied verbatim from the published package (never edit it).
 *
 * Both read the same imported dataset, so query() and search() results are compared row by
 * row, by identity and order. Every other result is compared by value, including key order and
 * the difference between undefined, null, NaN and -0. A call that throws must throw the same
 * error class; the messages may differ.
 *
 * 1.2.0 changes exactly two behaviours, and the tests assert both explicitly:
 *  - search(): a limit for which `limit < 0` is true means "no limit". 1.1.2 passed it to
 *    slice(), which dropped results from the end.
 *  - getParentLevel() and getChildLevel(): inherited keys such as '__proto__' or 'toString'
 *    give undefined. 1.1.2 returned Object.prototype members.
 *
 * Deliberately not compared: editing the code or name fields of the shared rows in place after
 * the lookup tables are built. 1.1.2 rescanned the rows on every call and saw such edits; 1.2.0
 * keeps its tables. The rows are documented as read-only.
 */
import { inspect } from 'util';
import { RwandaLocation } from '../lib/RwandaLocation';
import * as utils from '../lib/utils';
import locations from '../db/locations.json';
import { LocationData } from '../types';

type OracleModule = { RwandaLocation: new () => RwandaLocation };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const oracle: OracleModule = require('./oracle/v1.1.2/RwandaLocation.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const oracleUtils: typeof utils = require('./oracle/v1.1.2/utils.js');

type Api = Record<string, (...args: unknown[]) => unknown>;

const data = locations as LocationData[];
const dataRows = rowIndexes(data);

function rowIndexes(rows: LocationData[]): Map<object, number> {
  return new Map(rows.map((row, i) => [row, i]));
}

function asApi(rw: RwandaLocation): Api {
  return rw as unknown as Api;
}

/** Points an instance at another data array, as `rw['data'] = rows` would. */
function withData<T extends RwandaLocation>(rw: T, rows: LocationData[]): T {
  (rw as unknown as { data: LocationData[] }).data = rows;
  return rw;
}

/** A JSON-friendly form of a value that keeps every difference the comparison cares about. */
function encode(value: unknown, rows: Map<object, number>): unknown {
  if (value === undefined) return { $: 'undefined' };
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { $: 'NaN' };
    if (Object.is(value, -0)) return { $: '-0' };
    if (!Number.isFinite(value)) return { $: String(value) };
    return value;
  }
  if (typeof value === 'function') return { $: `function ${value.name}` };
  if (typeof value === 'symbol') return { $: String(value) };
  if (value === null || typeof value !== 'object') return value;
  if (value === Object.prototype) return { $: 'Object.prototype' };
  if (rows.has(value)) return { $row: rows.get(value) };
  if (Array.isArray(value)) {
    const positions = rowPositions(value, rows);
    if (positions) return positions;
    // Lists of records that JSON keeps exactly (the get* results): stringify them directly.
    if (value.every(isSimpleRecord)) return { $records: JSON.stringify(value) };
    return value.map((item) => encode(item, rows));
  }
  return { $object: Object.entries(value).map(([key, item]) => [key, encode(item, rows)]) };
}

/** Shared dataset rows are identified by their positions. Long lists are hashed to stay fast. */
function rowPositions(list: unknown[], rows: Map<object, number>): object | null {
  if (list.length === 0) return null;
  let hash = 0x811c9dc5;
  for (const item of list) {
    const position = rows.get(item as object);
    if (position === undefined) return null;
    hash = Math.imul(hash ^ position, 16777619);
  }
  return { $rows: list.length, first: rows.get(list[0] as object), hash };
}

/** A plain object whose values are strings or finite numbers other than -0. */
function isSimpleRecord(item: unknown): boolean {
  if (!item || typeof item !== 'object' || Object.getPrototypeOf(item) !== Object.prototype) {
    return false;
  }
  const record = item as Record<string, unknown>;
  for (const key in record) {
    const value = record[key];
    if (typeof value === 'string') continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0)) return false;
  }
  return true;
}

function outcome(call: () => unknown, rows: Map<object, number>): string {
  try {
    return JSON.stringify(encode(call(), rows));
  } catch (error) {
    return `throws ${(error as Error).constructor.name}`;
  }
}

/** A new copy of plain-object arguments, so neither implementation sees the other's changes. */
function copy(arg: unknown): unknown {
  return arg && typeof arg === 'object' && Object.getPrototypeOf(arg) === Object.prototype
    ? { ...arg }
    : arg;
}

function show(args: unknown[]): string {
  return args.map((arg) => inspect(arg, { depth: 1, breakLength: Infinity })).join(', ');
}

/** Runs calls on both implementations and records the ones whose outcomes differ. */
class Differ {
  calls = 0;
  failures = 0;
  readonly examples: string[] = [];

  constructor(
    private readonly oldApi: Api,
    private readonly newApi: Api,
    private readonly rows: Map<object, number> = dataRows
  ) {}

  /** The new implementation must do exactly what 1.1.2 did. */
  same(method: string, ...args: unknown[]): void {
    this.expectLike(method, args, () => this.oldApi[method](...args.map(copy)));
  }

  /** The new implementation must do what `expected` does on the oracle. */
  expectLike(method: string, args: unknown[], expected: () => unknown): void {
    this.calls++;
    const want = outcome(expected, this.rows);
    const got = outcome(() => this.newApi[method](...args.map(copy)), this.rows);
    if (got === want) return;
    this.failures++;
    if (this.examples.length < 10) {
      this.examples.push(
        `${method}(${show(args)}): 1.1.2 ${want.slice(0, 160)}, now ${got.slice(0, 160)}`
      );
    }
  }

  /** Asserts that nothing differed, and that at least `minCalls` calls were compared. */
  verify(minCalls: number): void {
    expect({ failures: this.failures, examples: this.examples }).toEqual({
      failures: 0,
      examples: [],
    });
    expect(this.calls).toBeGreaterThanOrEqual(minCalls);
  }
}

const distinct = <T>(rows: LocationData[], pick: (row: LocationData) => T): T[] =>
  Array.from(new Set(rows.map(pick)));

/** About `n` items spread evenly over `items`, always including the first and last. */
function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = (items.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => items[Math.round(i * step)]);
}

const PROVINCES = distinct(data, (row) => row.province_code);
const DISTRICTS = distinct(data, (row) => row.district_code);
const SECTORS = distinct(data, (row) => row.sector_code);
const CELLS = distinct(data, (row) => row.cell_code);
const VILLAGES = distinct(data, (row) => row.village_code);
const firstRowWith = new Map<unknown, LocationData>();
for (const row of [...data].reverse()) {
  for (const code of [row.district_code, row.sector_code, row.cell_code]) {
    firstRowWith.set(code, row);
  }
}
const rowOf = (code: unknown): LocationData => firstRowWith.get(code) as LocationData;
const otherProvince = (p: number): number => (p % 5) + 1;
const nextOf = <T>(items: T[], item: T): T => items[(items.indexOf(item) + 1) % items.length];

const ODD: unknown[] = [
  undefined,
  null,
  0,
  -0,
  NaN,
  '',
  false,
  true,
  '1',
  '101',
  '1010101',
  '010101',
  ' 010101',
  '10101',
  10101,
  1.5,
  -1,
  999,
  Infinity,
  -Infinity,
  {},
  [],
  [1],
  'abc',
  '__proto__',
  new String('010101'),
];

/** Case and whitespace variants of a name. */
const variants = (name: string): string[] => [
  name,
  name.toLowerCase(),
  name.toUpperCase(),
  name.charAt(0) + name.slice(1).toLowerCase(),
  ` ${name}`,
  `${name} `,
  `${name}\n`,
];

describe('1.1.2 compatibility (differential against the frozen 1.1.2 code)', () => {
  const oldRw = new oracle.RwandaLocation();
  const newRw = new RwandaLocation();
  const differ = (): Differ => new Differ(asApi(oldRw), asApi(newRw));

  it('keeps the class shape: prototype methods, arities and instance keys', () => {
    const names = (proto: object): string[] => Object.getOwnPropertyNames(proto);
    const arities = (proto: Record<string, unknown>): number[] =>
      names(proto).map((name) => (proto[name] as () => void).length);

    expect(names(RwandaLocation.prototype)).toEqual(names(oracle.RwandaLocation.prototype));
    expect(arities(RwandaLocation.prototype as never)).toEqual(
      arities(oracle.RwandaLocation.prototype as never)
    );
    expect(Object.keys(newRw)).toEqual(['data']);
    expect(Object.keys(newRw)).toEqual(Object.keys(oldRw));
    expect((newRw as unknown as { data: unknown }).data).toBe(data);
    expect((oldRw as unknown as { data: unknown }).data).toBe(data);
  });

  it('builds nothing at import or construction: lookup tables are built on first use', () => {
    const set = jest.spyOn(Map.prototype, 'set');
    const counts: number[] = [];
    try {
      jest.isolateModules(() => {
        // Loads a fresh copy of the package entry, which creates the `rwandaLocation` singleton.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../index');
      });
      counts.push(set.mock.calls.length);
      const rw = new RwandaLocation();
      counts.push(set.mock.calls.length);
      withData(rw, data.slice(0, 20)).getProvinces();
      counts.push(set.mock.calls.length);
    } finally {
      set.mockRestore();
    }
    const [atImport, atConstruction, afterFirstCall] = counts;
    expect({ atImport, atConstruction }).toEqual({ atImport: 0, atConstruction: 0 });
    expect(afterFirstCall).toBeGreaterThan(0);
  });

  it('matches every by-code lookup at every level, and odd inputs', () => {
    const d = differ();
    for (const x of [...PROVINCES, ...DISTRICTS.slice(0, 3), ...ODD])
      d.same('getProvinceByCode', x);
    for (const x of [...DISTRICTS, ...PROVINCES, 1010101, ...ODD]) d.same('getDistrictByCode', x);
    for (const x of [...SECTORS, ...DISTRICTS, '0101', '0101011', ...ODD]) {
      d.same('getSectorByCode', x);
    }
    for (const x of [...CELLS, ...VILLAGES.slice(0, 5), ...ODD]) d.same('getCellByCode', x);
    for (const x of [...VILLAGES, 101010101, 101010199, ...CELLS.slice(0, 5), ...ODD]) {
      d.same('getVillageByCode', x);
    }
    d.verify(14842 + 2148 + 416 + 30 + 5);
  });

  it('matches getProvinceByName for case and whitespace variants, and odd inputs', () => {
    const d = differ();
    for (const name of distinct(data, (row) => row.province_name)) {
      for (const x of variants(name)) d.same('getProvinceByName', x);
    }
    const custom = [{ toLowerCase: (): string => 'east' }, { toLowerCase: (): number => 5 }];
    for (const x of [...ODD, ...custom, 'Kigali City', 'Southern', 'Nyarugenge', 'İ']) {
      d.same('getProvinceByName', x);
    }
    d.same('getProvinceByName');
    d.verify(60);
  });

  it('matches every list method for every parent code, including mismatched parents', () => {
    const d = differ();
    d.same('getProvinces');
    d.same('getProvinces', 3);
    for (const p of [...PROVINCES, ...DISTRICTS.slice(0, 3), ...ODD]) d.same('getDistricts', p);
    d.same('getDistricts');

    d.same('getSectors');
    for (const p of [...PROVINCES, ...ODD]) d.same('getSectors', undefined, p);
    for (const district of [...DISTRICTS, ...ODD]) {
      for (const p of [undefined, ...PROVINCES, 0, NaN, '1']) d.same('getSectors', district, p);
    }

    d.same('getCells');
    for (const s of SECTORS) {
      const row = rowOf(s);
      d.same('getCells', s);
      d.same('getCells', s, row.district_code);
      d.same('getCells', s, row.district_code, row.province_code);
      d.same('getCells', s, nextOf(DISTRICTS, row.district_code));
      d.same('getCells', s, undefined, otherProvince(row.province_code));
      d.same('getCells', s, 0, NaN);
    }
    for (const district of DISTRICTS) {
      for (const p of [undefined, ...PROVINCES]) d.same('getCells', undefined, district, p);
      d.same('getCells', '', district, 0);
    }
    for (const p of PROVINCES) d.same('getCells', undefined, undefined, p);
    for (const x of ODD) {
      d.same('getCells', x);
      d.same('getCells', undefined, x);
      d.same('getCells', undefined, undefined, x);
      d.same('getCells', '010101', x);
    }

    d.same('getVillages');
    for (const c of CELLS) {
      const row = rowOf(c);
      d.same('getVillages', c);
      d.same('getVillages', c, nextOf(SECTORS, row.sector_code));
    }
    for (const c of spread(CELLS, 500)) {
      const row = rowOf(c);
      d.same('getVillages', c, row.sector_code);
      d.same('getVillages', c, row.sector_code, row.district_code, row.province_code);
      d.same('getVillages', c, undefined, nextOf(DISTRICTS, row.district_code));
      d.same('getVillages', c, undefined, undefined, otherProvince(row.province_code));
    }
    for (const s of SECTORS) {
      const row = rowOf(s);
      d.same('getVillages', undefined, s);
      d.same('getVillages', NaN, s, row.district_code);
      d.same('getVillages', undefined, s, nextOf(DISTRICTS, row.district_code));
      d.same('getVillages', 0, s, undefined, otherProvince(row.province_code));
    }
    for (const district of DISTRICTS) {
      for (const p of [undefined, ...PROVINCES]) {
        d.same('getVillages', undefined, undefined, district, p);
      }
    }
    for (const p of PROVINCES) d.same('getVillages', undefined, undefined, undefined, p);
    for (const x of ODD) {
      d.same('getVillages', x);
      d.same('getVillages', undefined, x);
      d.same('getVillages', undefined, undefined, x);
      d.same('getVillages', undefined, undefined, undefined, x);
      d.same('getVillages', 1010101, x);
    }
    d.verify(2148 * 2 + 500 * 4 + 416 * 10);
  }, 60000);

  it('matches query() for code filters, name filters and combinations', () => {
    const d = differ();
    for (const p of PROVINCES) d.same('query', { provinceCode: p });
    for (const district of DISTRICTS) {
      const p = rowOf(district).province_code;
      d.same('query', { districtCode: district });
      d.same('query', { districtCode: district, provinceCode: p, provinceName: 'kigali' });
      d.same('query', { districtCode: district, provinceCode: otherProvince(p) });
    }
    for (const s of SECTORS) {
      const row = rowOf(s);
      d.same('query', { sectorCode: s });
      d.same('query', {
        sectorCode: s,
        districtCode: row.district_code,
        sectorName: row.sector_name.toUpperCase(),
      });
      d.same('query', { sectorCode: s, districtName: 'nope' });
    }
    for (const c of CELLS) d.same('query', { cellCode: c });
    for (const c of spread(CELLS, 500)) {
      const row = rowOf(c);
      d.same('query', {
        cellCode: c,
        cellName: row.cell_name.toLowerCase(),
        sectorCode: row.sector_code,
      });
      d.same('query', { cellCode: c, sectorCode: nextOf(SECTORS, row.sector_code) });
    }
    for (const v of spread(VILLAGES, 600)) d.same('query', { villageCode: v });

    const levels = ['province', 'district', 'sector', 'cell', 'village'] as const;
    for (const level of levels) {
      const names = distinct(data, (row) => row[`${level}_name` as const]);
      for (const name of spread(names, 250)) d.same('query', { [`${level}Name`]: name });
      for (const name of spread(names, 25)) {
        for (const x of variants(name).slice(1)) d.same('query', { [`${level}Name`]: x });
      }
    }
    for (const row of spread(data, 150)) {
      d.same('query', {
        sectorName: row.sector_name,
        districtName: row.district_name.toUpperCase(),
      });
      d.same('query', { villageName: row.village_name, cellCode: row.cell_code });
      d.same('query', { villageName: row.village_name, cellCode: row.cell_code + 1 });
      d.same('query', {
        provinceName: row.province_name.toLowerCase(),
        villageCode: row.village_code,
      });
      d.same('query', {
        provinceCode: row.province_code,
        provinceName: row.province_name,
        districtCode: row.district_code,
        districtName: row.district_name,
        sectorCode: row.sector_code,
        sectorName: row.sector_name,
        cellCode: row.cell_code,
        cellName: row.cell_name,
        villageCode: row.village_code,
        villageName: row.village_name,
      });
    }

    const keys = ['provinceCode', 'districtCode', 'sectorCode', 'cellCode', 'villageCode'];
    const nameKeys = ['provinceName', 'districtName', 'sectorName', 'cellName', 'villageName'];
    for (const key of [...keys, ...nameKeys]) {
      for (const x of ODD) {
        d.same('query', { [key]: x });
        d.same('query', { [key]: x, provinceCode: 999 });
        d.same('query', { [key]: x, villageCode: 101010102 });
      }
    }
    // A truthy non-string name throws in 1.1.2 only if some row reaches that check.
    const badNames = [
      5,
      true,
      {},
      ['kigali'],
      new String('KIGALI'),
      { toLowerCase: (): string => 'kigali' },
    ];
    const others = [
      {},
      { provinceCode: 999 },
      { villageCode: 999 },
      { provinceCode: 1 },
      { sectorCode: '010101' },
      { districtCode: 101 },
      { cellCode: 1010101 },
    ];
    for (const other of others) {
      for (const key of nameKeys)
        for (const bad of badNames) d.same('query', { ...other, [key]: bad });
    }
    for (const filter of [{}, undefined, null, 5, 'kigali', [], (): number => 1, { foo: 1 }]) {
      d.same('query', filter);
    }
    d.same('query');
    d.verify(6000);
  }, 60000);

  it('matches search() for terms, case options and limits; a negative limit means no limit', () => {
    const d = differ();
    const terms = ['a', 'ga', 'kigali', 'KIGALI', 'gitega', 'Gihanga', '', ' ', 'zzzz'];
    terms.push('east', '101', 'é', '-', 'a'.repeat(1000));
    const sameLimits: unknown[] = [undefined, 0, -0, 1, 10, 2.5, 0.5, NaN, null, Infinity, 1e21];
    sameLimits.push('5', '-0', 'abc', '', {}, [], [2], true, false);
    const negativeLimits: unknown[] = [-1, -100, -0.5, -Infinity, '-1', [-1]];
    for (const query of terms) {
      // Other truthy and falsy caseSensitive values are covered by the terms just below.
      for (const caseSensitive of [undefined, true]) {
        for (const limit of sameLimits) d.same('search', { query, caseSensitive, limit });
        for (const limit of negativeLimits) {
          const options = { query, caseSensitive, limit };
          const unlimited = { ...options, limit: undefined };
          d.expectLike('search', [options], () => asApi(oldRw).search(unlimited));
        }
      }
    }
    for (const query of ['kigali', 'GITEGA', '']) {
      for (const caseSensitive of ['yes', 1, 0, null, false]) {
        for (const limit of [undefined, 3, -1]) {
          const options = { query, caseSensitive, limit };
          if (limit === -1) {
            const unlimited = { ...options, limit: undefined };
            d.expectLike('search', [options], () => asApi(oldRw).search(unlimited));
          } else d.same('search', options);
        }
      }
    }
    for (const level of ['province', 'district', 'sector', 'cell', 'village'] as const) {
      for (const name of spread(
        distinct(data, (row) => row[`${level}_name` as const]),
        40
      )) {
        d.same('search', { query: name });
        d.same('search', { query: name, caseSensitive: true, limit: 3 });
        d.same('search', { query: name.toLowerCase().slice(1, 4), limit: 7 });
      }
    }
    // Non-string terms: some coerce (caseSensitive, custom toLowerCase), some throw.
    const odd = [5, 1, undefined, null, /a/, {}, ['ga'], new String('Ga'), Symbol('x')];
    odd.push({ toLowerCase: () => 'ga' }, { toLowerCase: () => 5 });
    for (const query of odd) {
      for (const caseSensitive of [undefined, true]) {
        for (const limit of [undefined, 3]) d.same('search', { query, caseSensitive, limit });
      }
    }
    for (const options of [undefined, null, {}, 'ga', 5]) d.same('search', options);
    d.same('search');
    d.verify(14 * 2 * 26);
  }, 60000);

  it('matches getStatistics, getFullPath and getHierarchy', () => {
    const d = differ();
    d.same('getStatistics');
    for (const v of [...spread(VILLAGES, 5000), 101010101, ...CELLS.slice(0, 3), ...ODD]) {
      d.same('getFullPath', v);
      d.same('getHierarchy', v);
    }
    d.verify(10000);
  });

  it('calls overridden list methods from getStatistics, as 1.1.2 did', () => {
    const counts = (L: new () => RwandaLocation): unknown[] => {
      class Sub extends L {
        getVillages(): never[] {
          return [];
        }
        getProvinces(): never[] {
          return [1, 2] as never[];
        }
      }
      const own = new L();
      own.getCells = (): never[] => [];
      const results: unknown[] = [new Sub().getStatistics(), own.getStatistics()];
      for (const method of ['getDistricts', 'getSectors'] as const) {
        const spy = jest.spyOn(L.prototype, method).mockReturnValue([]);
        try {
          results.push(new L().getStatistics(), spy.mock.calls);
        } finally {
          spy.mockRestore();
        }
      }
      results.push(new L().getStatistics());
      return results;
    };
    expect(counts(RwandaLocation)).toEqual(counts(oracle.RwandaLocation));
    expect(counts(RwandaLocation)[0]).toEqual({
      totalProvinces: 2,
      totalDistricts: 30,
      totalSectors: 416,
      totalCells: 2148,
      totalVillages: 0,
    });
  });

  it('returns fresh objects: changing a result never changes a later result', () => {
    const calls: [string, unknown[]][] = [
      ['getProvinces', []],
      ['getDistricts', [1]],
      ['getSectors', []],
      ['getSectors', [101]],
      ['getCells', ['010101']],
      ['getCells', [undefined, 101]],
      ['getVillages', []],
      ['getVillages', [1010101]],
      ['getProvinceByCode', [1]],
      ['getProvinceByName', ['kigali']],
      ['getDistrictByCode', [101]],
      ['getSectorByCode', ['010101']],
      ['getCellByCode', [1010101]],
      ['getVillageByCode', [101010102]],
      ['getHierarchy', [101010102]],
      ['getFullPath', [101010102]],
      ['getFullPath', [1]],
      ['getStatistics', []],
    ];
    const vandalize = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(vandalize);
        value.push('extra');
      } else if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        for (const key of Object.keys(record)) {
          if (record[key] && typeof record[key] === 'object') vandalize(record[key]);
          else record[key] = typeof record[key] === 'number' ? -1 : 'CHANGED';
        }
      }
    };
    for (const rw of [newRw, new RwandaLocation()]) {
      for (const [method, args] of calls) vandalize(asApi(rw)[method](...args));
    }
    // query() and search() return the shared rows (so those are not changed here), but the
    // arrays holding them are new on every call.
    for (const rw of [newRw, new RwandaLocation()]) {
      rw.query({ provinceCode: 1 }).push(data[0]);
      rw.search({ query: 'gitega', limit: 5 }).length = 0;
      rw.query({}).pop();
    }

    const d = differ();
    for (const [method, args] of calls) d.same(method, ...args);
    d.same('query', { provinceCode: 1 });
    d.same('search', { query: 'gitega', limit: 5 });
    d.same('query', {});
    d.verify(calls.length + 3);

    const shared: string[] = [];
    for (const [method, args] of calls) {
      const first = asApi(newRw)[method](...args) as Record<string, unknown>;
      const second = asApi(newRw)[method](...args) as Record<string, unknown>;
      if (second === first) shared.push(method);
      for (const key of Object.keys(first)) {
        const value = first[key];
        if (value && typeof value === 'object' && second[key] === value)
          shared.push(`${method}.${key}`);
      }
    }
    expect(shared).toEqual([]);
  });

  it('matches the utils, except that inherited keys are now unknown levels', () => {
    const d = new Differ(oracleUtils as unknown as Api, utils as unknown as Api);
    const levels = ['village', 'cell', 'sector', 'district', 'province'];
    const inherited = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf'];
    const inputs: unknown[] = [...ODD, ...levels, ...inherited, 'Village', 'foo', '  KiGaLi  '];
    inputs.push('a  b', '\tX\n', 1, 5, 6, 101, 150, 599, 600, 4.9, '3', [3], ' 2 ');
    const fns = ['normalizeString', 'isValidProvinceCode', 'isValidDistrictCode', 'formatLocation'];
    for (const fn of fns) for (const x of inputs) d.same(fn, x);
    for (const fn of ['getParentLevel', 'getChildLevel']) {
      for (const x of inputs) {
        if (inherited.includes(x as string)) d.expectLike(fn, [x], () => undefined);
        else d.same(fn, x);
      }
    }
    for (const pair of [
      [' KIGALI ', 'kigali'],
      ['a  b', 'a b'],
      ['', '  '],
      ['é', 'é'],
      [undefined, 'x'],
    ]) {
      d.same('matchesString', ...pair);
    }
    const items = (): object[] => [
      { a: 2 },
      { a: '1' },
      { a: 1 },
      { a: NaN },
      {},
      { a: 0 },
      { a: '010101' },
    ];
    for (const fn of ['getUniqueByKey', 'sortByNumericKey', 'sortByStringKey']) {
      d.same(fn, items(), 'a');
      d.same(fn, null, 'a');
      const before = items();
      const after = items();
      const oldResult = (oracleUtils as unknown as Api)[fn](before, 'a');
      const newResult = (utils as unknown as Api)[fn](after, 'a');
      expect(JSON.stringify(after)).toBe(JSON.stringify(before));
      expect(newResult === after).toBe(oldResult === before);
    }
    for (const x of [data[0], newRw.getVillageByCode(101010102), {}, null, 'x', 5]) {
      d.same('formatLocation', x);
    }
    d.verify(inputs.length * 6);

    expect(utils.getParentLevel('__proto__' as never)).toBeUndefined();
    expect(utils.getChildLevel('toString' as never)).toBeUndefined();
    expect(oracleUtils.getParentLevel('__proto__' as never)).toBe(Object.prototype);
  });
});

describe('1.1.2 compatibility on other data arrays (injected through `data`)', () => {
  const real = data;
  const clone = (row: LocationData): LocationData => ({ ...row });
  const everyNth = (n: number): LocationData[] => real.filter((_, i) => i % n === 0).map(clone);

  const inconsistent = (): LocationData[] => {
    const rows: LocationData[] = [];
    everyNth(50).forEach((row, i) => {
      rows.push(row);
      // same codes with other names, a code under other parents, a duplicated village code
      if (i % 10 === 0)
        rows.push({ ...row, id: `${row.id}-n`, village_name: 'Renamed', cell_name: 'Other' });
      if (i % 13 === 0)
        rows.push({
          ...row,
          id: `${row.id}-m`,
          sector_code: '999999',
          district_code: 999,
          province_code: 9,
        });
      if (i % 17 === 0) rows.push({ ...row, id: `${row.id}-v`, cell_code: row.cell_code + 1 });
      if (i % 29 === 0)
        rows.push({ ...row, id: `${row.id}-p`, province_code: row.province_code + 10 });
    });
    return rows.reverse();
  };
  const duplicated = (): LocationData[] => {
    const rows = everyNth(9);
    return [...rows, ...rows.slice(0, 300).map(clone), ...rows.slice(100, 200)];
  };
  const oddTypes = (): LocationData[] => {
    const rows = everyNth(40);
    const [a, b, c, e] = rows;
    rows.push({ ...a, id: 'nan', village_code: NaN, cell_code: NaN });
    rows.push({
      ...b,
      id: 'string',
      village_code: '101010102' as never,
      cell_code: '9999999' as never,
    });
    rows.push({
      ...c,
      id: 'number-sector',
      sector_code: 10101 as never,
      cell_code: 8888888,
      village_code: 888888801,
    });
    rows.push({ ...e, id: 'zero', village_code: 0, cell_code: 0 });
    return rows;
  };

  const datasets: [string, () => LocationData[]][] = [
    ['empty', (): LocationData[] => []],
    ['one row', (): LocationData[] => [clone(real[5])]],
    ['reversed', (): LocationData[] => [...real].reverse()],
    ['subset', (): LocationData[] => everyNth(37)],
    ['inconsistent parents', inconsistent],
    ['duplicated rows', duplicated],
    ['unexpected code types', oddTypes],
  ];

  it.each(datasets)(
    'matches 1.1.2 on %s',
    (_, make) => {
      const rows = make();
      const d = new Differ(
        asApi(withData(new oracle.RwandaLocation(), rows)),
        asApi(withData(new RwandaLocation(), rows)),
        rowIndexes(rows)
      );
      const codes = <T>(pick: (row: LocationData) => T, n: number): T[] =>
        spread(distinct(rows, pick), n);
      const P = codes((row) => row.province_code, 20);
      const D = codes((row) => row.district_code, 40);
      const S = codes((row) => row.sector_code, 60);
      const C = codes((row) => row.cell_code, 80);
      const V = codes((row) => row.village_code, 150);
      const odd = [undefined, null, 0, NaN, '', '1', 1.5, 999, true, {}, '010101', 10101];

      d.same('getProvinces');
      d.same('getStatistics');
      for (const p of [...P, ...odd]) {
        d.same('getProvinceByCode', p);
        d.same('getDistricts', p);
        d.same('getSectors', undefined, p);
        d.same('getCells', undefined, undefined, p);
        d.same('getVillages', undefined, undefined, undefined, p);
        d.same('query', { provinceCode: p });
      }
      for (const name of [
        ...distinct(rows, (row) => row.province_name),
        'kigali',
        'South',
        undefined,
        5,
      ]) {
        d.same('getProvinceByName', name);
        d.same('query', { provinceName: name });
      }
      for (const district of [...D, ...odd]) {
        d.same('getDistrictByCode', district);
        d.same('getSectors', district);
        for (const p of P) d.same('getSectors', district, p);
        d.same('getCells', undefined, district);
        d.same('getVillages', 0, '', district);
        d.same('query', { districtCode: district });
      }
      for (const s of [...S, ...odd]) {
        d.same('getSectorByCode', s);
        d.same('getCells', s);
        for (const district of D.slice(0, 6)) d.same('getCells', s, district);
        d.same('getVillages', undefined, s);
        d.same('query', { sectorCode: s });
      }
      for (const c of [...C, ...odd]) {
        d.same('getCellByCode', c);
        d.same('getVillages', c);
        for (const s of S.slice(0, 4)) d.same('getVillages', c, s);
        d.same('query', { cellCode: c });
      }
      for (const v of [...V, ...odd]) {
        d.same('getVillageByCode', v);
        d.same('getFullPath', v);
        d.same('getHierarchy', v);
        d.same('query', { villageCode: v });
      }
      for (const level of ['district', 'sector', 'cell', 'village'] as const) {
        for (const name of spread(
          distinct(rows, (row) => row[`${level}_name` as const]),
          30
        )) {
          d.same('query', { [`${level}Name`]: name.toLowerCase() });
          d.same('query', { [`${level}Name`]: name, provinceCode: P[0] });
          d.same('search', { query: name });
          d.same('search', { query: name.slice(0, 3), caseSensitive: true, limit: 5 });
        }
      }
      for (const query of ['a', 'ki', 'Renamed', '', 'zzz']) {
        for (const caseSensitive of [undefined, true]) {
          for (const limit of [undefined, 0, 3, 2.5, '2'])
            d.same('search', { query, caseSensitive, limit });
        }
      }
      for (const filter of [{}, { villageName: 5 }, null]) d.same('query', filter);
      d.same('search', { query: 5, caseSensitive: true });
      d.same('search', {});
      d.verify(rows.length === 0 ? 100 : 400);
    },
    60000
  );

  it('sees rows added to or removed from the data array after the tables are built', () => {
    const rows = everyNth(30);
    const oldRw = withData(new oracle.RwandaLocation(), rows);
    const newRw = withData(new RwandaLocation(), rows);
    const added = clone(real[1]);
    const compareAll = (): Differ => {
      const d = new Differ(asApi(oldRw), asApi(newRw), rowIndexes(rows));
      d.same('getStatistics');
      d.same('getVillages');
      d.same('getVillages', added.cell_code);
      d.same('getVillageByCode', added.village_code);
      d.same('getProvinceByName', 'kigali');
      d.same('query', { villageCode: added.village_code });
      d.same('query', { villageName: added.village_name });
      d.same('search', { query: added.village_name });
      return d;
    };

    compareAll().verify(8); // builds the tables
    rows.push(added);
    compareAll().verify(8);
    rows.pop();
    rows.pop();
    compareAll().verify(8);
  });
});
