/**
 * Lookup tables behind RwandaLocation. Internal: nothing here is re-exported from the package
 * entry point, and it may change in any release.
 *
 * Every answer must equal what 1.1.2's linear scans returned for the same data. These rules
 * make sure it does:
 *  - Tables are built lazily, one at a time, on first use. They are cached per data array in a
 *    WeakMap, so every instance that uses the bundled dataset shares them, construction does no
 *    work, and instances get no new properties. If rows are added or removed, the tables are
 *    rebuilt.
 *  - Tables hold references to the data rows, never copies, and are never changed after they
 *    are built. Every call returns new arrays. The one piece of reused scratch memory, the
 *    search() memo, is lent to one call at a time (see NameTable.spareMemo).
 *  - The row used for a code is the first row in data order that has it ("first row wins"),
 *    which is the row 1.1.2's find() and Map picked.
 *  - Lists are sorted with 1.1.2's comparators: numeric, and String#localeCompare for sector
 *    codes. Codes in a list are distinct, so an in-order subset of the sorted list equals the
 *    sorted subset.
 *  - Filters keep 1.1.2's truthiness gate (0, NaN, '', null, undefined and false mean "no
 *    filter") and compare with ===. Map lookups use SameValueZero, which differs from === only
 *    for NaN, so NaN never reaches a lookup.
 *  - A level is answered from its tables only when its data is regular: every code has the
 *    expected type and, for filtered lists, every row of a code has the same ancestor codes.
 *    Otherwise the 1.1.2 algorithm runs, so results stay identical for a replaced data array.
 *
 * Not tracked: editing the code or name fields of shared rows in place after a table is built.
 * 1.1.2 would see such edits on its next scan. The rows are documented as read-only.
 */
import { LocationData, QueryFilter } from '../../types';

/** A row field that holds a code. */
export type CodeKey =
  'province_code' | 'district_code' | 'sector_code' | 'cell_code' | 'village_code';
/** A row field that holds a name. */
export type NameKey =
  'province_name' | 'district_name' | 'sector_name' | 'cell_name' | 'village_name';

type Code = LocationData[CodeKey];

/** The ancestor code fields of each level, nearest first: the order of the list filters. */
const ANCESTORS: Record<CodeKey, readonly CodeKey[]> = {
  province_code: [],
  district_code: ['province_code'],
  sector_code: ['district_code', 'province_code'],
  cell_code: ['sector_code', 'district_code', 'province_code'],
  village_code: ['cell_code', 'sector_code', 'district_code', 'province_code'],
};

/** query() code filters and the fields they compare, most specific first. */
const QUERY_CODES: readonly (readonly [keyof QueryFilter, CodeKey])[] = [
  ['villageCode', 'village_code'],
  ['cellCode', 'cell_code'],
  ['sectorCode', 'sector_code'],
  ['districtCode', 'district_code'],
  ['provinceCode', 'province_code'],
];

/** query() name filters and the fields they compare. */
const QUERY_NAMES: readonly (readonly [keyof QueryFilter, NameKey])[] = [
  ['provinceName', 'province_name'],
  ['districtName', 'district_name'],
  ['sectorName', 'sector_name'],
  ['cellName', 'cell_name'],
  ['villageName', 'village_name'],
];

/** The name fields search() matches against, in 1.1.2's order. */
const SEARCH_FIELDS: readonly NameKey[] = [
  'province_name',
  'district_name',
  'sector_name',
  'cell_name',
  'village_name',
];

const EMPTY: readonly LocationData[] = [];

/** The tables for one level of the hierarchy. Optional members are built on first use. */
interface LevelTables {
  /** Code -> first row with that code, in data order. */
  first: Map<Code, LocationData>;
  /**
   * Every code has the level's type (a number that is not NaN; a string for sectors), so
   * 1.1.2's comparator is a strict total order that cannot throw.
   */
  typed: boolean;
  /** Every row of a code has the same ancestor codes as that code's first row. */
  consistent?: boolean;
  /** The first rows, sorted with 1.1.2's comparator. */
  sorted?: LocationData[];
  /** The sorted first rows, grouped by one ancestor code. */
  byAncestor: Partial<Record<CodeKey, Map<Code, LocationData[]>>>;
  /** Code -> every row with that code, in data order. */
  rows?: Map<Code, LocationData[]>;
}

/** The distinct values of one name field, and which of them each row has. */
interface NameTable {
  /** Distinct names as stored, in order of first appearance. */
  raw: string[];
  /** `raw[i].toLowerCase()`. */
  lower: string[];
  /** Index of the first row named `raw[i]`. Increasing, because of the order of `raw`. */
  first: number[];
  /** `rowName[r]` is the index in `raw` of row r's name. */
  rowName: Int32Array;
  /**
   * A cleared search() memo, waiting for the next call. A call takes it and puts it back
   * cleared when done, so a nested call, or one after a call that failed, gets a new memo and
   * no call can see another call's results. Reusing it matters for short limited searches:
   * allocating the memos (about 8.5 KB in all) made `search({ query: 'a', limit: 10 })` 4 to 6
   * times slower (about 1.2 µs instead of 0.25 µs), while full searches were unaffected.
   */
  spareMemo?: Uint8Array;
}

/** One name field during a search() call, with a memo that belongs to that call only. */
interface SearchField {
  values: string[];
  rowName: Int32Array;
  /** Per distinct name: 0 = not tested yet, 1 = no match, 2 = match. */
  memo: Uint8Array;
}

/** Lookup tables for one data array. Get it with {@link indexFor}. */
export class LocationIndex {
  /** Row count when the tables were started. A different count means rows were added or removed. */
  readonly length: number;
  private readonly levels: Partial<Record<CodeKey, LevelTables>> = {};
  private readonly names: Partial<Record<NameKey, NameTable>> = {};

  constructor(private readonly data: LocationData[]) {
    this.length = data.length;
  }

  /** The first row whose `key` field is `=== code`, or null: 1.1.2's `find()`. */
  first(key: CodeKey, code: unknown): LocationData | null {
    if (code !== code) return null; // NaN: === never matches it, but Map#get would.
    return this.level(key).first.get(code as Code) || null;
  }

  /** The first row whose `key` field, lowercased, is `=== lowerName`, or null. */
  firstNamed(key: NameKey, lowerName: unknown): LocationData | null {
    const names = this.nameTable(key);
    const i = names.lower.indexOf(lowerName as string);
    return i < 0 ? null : this.data[names.first[i]];
  }

  /** The number of distinct codes at a level: the length of 1.1.2's unfiltered list. */
  count(key: CodeKey): number {
    const level = this.level(key);
    // An unexpected code type can make 1.1.2's sort throw, so run the full list then.
    return level.typed ? level.first.size : this.list(key, []).length;
  }

  /**
   * The rows behind 1.1.2's list methods: the first row of each code among the rows that pass
   * the filters, sorted by code. `filters` are the list method's arguments, nearest ancestor
   * first (getVillages passes cell, sector, district and province codes). Falsy ones are
   * ignored.
   */
  list(key: CodeKey, filters: readonly unknown[]): LocationData[] {
    const active = activeFilters(ANCESTORS[key], filters);
    const pass = (row: LocationData): boolean => matchesAll(row, active);
    const level = this.level(key);

    if (!level.typed || (active.length > 0 && !this.isConsistent(key))) {
      return firstPerCode(this.data, key, pass);
    }
    if (active.length === 0) return this.sorted(key).slice();
    // Only codes under the nearest filtered ancestor can pass. Check those against every filter.
    const [ancestor, code] = active[0];
    return (this.byAncestor(key, ancestor).get(code as Code) || EMPTY).filter(pass);
  }

  /**
   * 1.1.2's query() for a filter object whose name filters are strings or falsy. The caller
   * sends every other filter to the original scan. Rows come back in data order.
   */
  query(filter: QueryFilter): LocationData[] {
    const codes: [CodeKey, unknown][] = [];
    for (const [option, field] of QUERY_CODES) {
      const code = filter[option];
      if (code) codes.push([field, code]);
    }
    const names: [NameKey, string][] = [];
    for (const [option, field] of QUERY_NAMES) {
      const name = filter[option] as string;
      if (name) names.push([field, name.toLowerCase()]);
    }
    const namesMatch = (row: LocationData): boolean =>
      names.every(([field, name]) => row[field].toLowerCase() === name);

    if (codes.length > 0) {
      // Only rows with the most specific code can match. Check those against every filter.
      const [field, code] = codes[0];
      const rows = this.rowsWithCode(field, code);
      if (codes.length === 1 && names.length === 0) return rows.slice();
      return rows.filter((row) => matchesAll(row, codes) && namesMatch(row));
    }
    if (names.length === 0) return this.data.slice();
    return this.rowsNamed(names);
  }

  /**
   * 1.1.2's search() scan for a string term: the rows where some name field, lowercased unless
   * `caseSensitive`, includes `term`. Rows come back in data order. The scan stops once it has
   * `maxResults` rows.
   */
  search(term: string, caseSensitive: boolean, maxResults: number): LocationData[] {
    const tables = SEARCH_FIELDS.map((key) => this.nameTable(key));
    const fields = tables.map((table): SearchField => ({
      values: caseSensitive ? table.raw : table.lower,
      rowName: table.rowName,
      memo: takeMemo(table),
    }));
    const [province, district, sector, cell, village] = fields;
    // Each distinct name is tested at most once per call, and only when a row needs it.
    const matches = (field: SearchField, row: number): boolean => {
      const id = field.rowName[row];
      if (field.memo[id] === 0) field.memo[id] = field.values[id].includes(term) ? 2 : 1;
      return field.memo[id] === 2;
    };

    const data = this.data;
    const results: LocationData[] = [];
    for (let r = 0; r < data.length && results.length < maxResults; r++) {
      if (
        matches(province, r) ||
        matches(district, r) ||
        matches(sector, r) ||
        matches(cell, r) ||
        matches(village, r)
      ) {
        results.push(data[r]);
      }
    }
    tables.forEach((table, i) => returnMemo(table, fields[i].memo));
    return results;
  }

  private level(key: CodeKey): LevelTables {
    let level = this.levels[key];
    if (!level) {
      const data = this.data;
      const first = new Map<Code, LocationData>();
      let typed = true;
      for (let i = 0; i < data.length; i++) {
        const code = data[i][key];
        if (first.has(code)) continue;
        first.set(code, data[i]);
        if (!hasLevelType(key, code)) typed = false;
      }
      level = { first, typed, byAncestor: {} };
      this.levels[key] = level;
    }
    return level;
  }

  private isConsistent(key: CodeKey): boolean {
    const level = this.level(key);
    if (level.consistent === undefined) {
      const ancestors = ANCESTORS[key];
      level.consistent = this.data.every((row) => {
        const first = level.first.get(row[key]) as LocationData;
        return first === row || ancestors.every((ancestor) => row[ancestor] === first[ancestor]);
      });
    }
    return level.consistent;
  }

  private sorted(key: CodeKey): LocationData[] {
    const level = this.level(key);
    if (!level.sorted) level.sorted = sortByCode(Array.from(level.first.values()), key);
    return level.sorted;
  }

  private byAncestor(key: CodeKey, ancestor: CodeKey): Map<Code, LocationData[]> {
    const level = this.level(key);
    let groups = level.byAncestor[ancestor];
    if (!groups) {
      groups = groupBy(this.sorted(key), ancestor);
      level.byAncestor[ancestor] = groups;
    }
    return groups;
  }

  /** Every row whose `key` field is `=== code` (a truthy code), in data order. */
  private rowsWithCode(key: CodeKey, code: unknown): readonly LocationData[] {
    const level = this.level(key);
    if (level.first.size === this.data.length) {
      // Every row has its own code (true for villages), so the first-row map holds them all.
      const row = level.first.get(code as Code);
      return row ? [row] : EMPTY;
    }
    if (!level.rows) level.rows = groupBy(this.data, key);
    return level.rows.get(code as Code) || EMPTY;
  }

  /** The rows whose lowercased names equal every given name, in data order. */
  private rowsNamed(names: [NameKey, string][]): LocationData[] {
    // Compare each distinct name once, then look up each row's name by its index.
    const tests = names.map(([field, name]) => {
      const table = this.nameTable(field);
      const hit = new Uint8Array(table.lower.length);
      table.lower.forEach((lower, i) => {
        if (lower === name) hit[i] = 1;
      });
      return { rowName: table.rowName, hit };
    });

    const data = this.data;
    const results: LocationData[] = [];
    for (let r = 0; r < data.length; r++) {
      let ok = true;
      for (let t = 0; t < tests.length && ok; t++) ok = tests[t].hit[tests[t].rowName[r]] === 1;
      if (ok) results.push(data[r]);
    }
    return results;
  }

  private nameTable(key: NameKey): NameTable {
    let table = this.names[key];
    if (!table) {
      const data = this.data;
      const ids = new Map<string, number>();
      const raw: string[] = [];
      const lower: string[] = [];
      const first: number[] = [];
      const rowName = new Int32Array(data.length);
      for (let r = 0; r < data.length; r++) {
        const name = data[r][key];
        let id = ids.get(name);
        if (id === undefined) {
          id = raw.length;
          ids.set(name, id);
          raw.push(name);
          lower.push(name.toLowerCase());
          first.push(r);
        }
        rowName[r] = id;
      }
      table = { raw, lower, first, rowName, spareMemo: undefined };
      this.names[key] = table;
    }
    return table;
  }
}

const indexes = new WeakMap<LocationData[], LocationIndex>();

/** The lookup tables for `data`, shared by every caller that passes the same array. */
export function indexFor(data: LocationData[]): LocationIndex {
  let index = indexes.get(data);
  // A cheap guard against rows being added or removed. In-place edits are not tracked.
  if (!index || index.length !== data.length) {
    index = new LocationIndex(data);
    indexes.set(data, index);
  }
  return index;
}

/** The [field, value] pairs of the truthy filters: falsy values mean "no filter" in 1.1.2. */
function activeFilters(
  fields: readonly CodeKey[],
  values: readonly unknown[]
): [CodeKey, unknown][] {
  const active: [CodeKey, unknown][] = [];
  fields.forEach((field, i) => {
    if (values[i]) active.push([field, values[i]]);
  });
  return active;
}

/** Takes `table`'s spare search memo, or a new one if another call has it or never returned it. */
function takeMemo(table: NameTable): Uint8Array {
  const memo = table.spareMemo || new Uint8Array(table.raw.length);
  table.spareMemo = undefined;
  return memo;
}

/** Clears a search memo and keeps it on `table` for the next call. */
function returnMemo(table: NameTable, memo: Uint8Array): void {
  table.spareMemo = memo.fill(0);
}

function matchesAll(row: LocationData, filters: [CodeKey, unknown][]): boolean {
  return filters.every(([field, code]) => row[field] === code);
}

function hasLevelType(key: CodeKey, code: unknown): boolean {
  return key === 'sector_code'
    ? typeof code === 'string'
    : typeof code === 'number' && code === code;
}

/** Sorts rows in place with the comparator 1.1.2 used for the level. */
function sortByCode(rows: LocationData[], key: CodeKey): LocationData[] {
  if (key === 'sector_code') return rows.sort((a, b) => a.sector_code.localeCompare(b.sector_code));
  return rows.sort((a, b) => (a[key] as number) - (b[key] as number));
}

/** 1.1.2's list algorithm: the first passing row of each code, in data order, then sorted. */
function firstPerCode(
  data: LocationData[],
  key: CodeKey,
  pass: (row: LocationData) => boolean
): LocationData[] {
  const seen = new Map<Code, LocationData>();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (pass(row) && !seen.has(row[key])) seen.set(row[key], row);
  }
  return sortByCode(Array.from(seen.values()), key);
}

/** Groups rows by one field. Each group keeps the input order. */
function groupBy(rows: readonly LocationData[], key: CodeKey): Map<Code, LocationData[]> {
  const groups = new Map<Code, LocationData[]>();
  for (let i = 0; i < rows.length; i++) {
    const group = groups.get(rows[i][key]);
    if (group) group.push(rows[i]);
    else groups.set(rows[i][key], [rows[i]]);
  }
  // push() over-allocates. Copying multi-row groups to their exact size halves their memory.
  groups.forEach((group, code) => {
    if (group.length > 1) groups.set(code, group.slice());
  });
  return groups;
}
