import locationsData from '../db/locations.json';
import {
  LocationData,
  Province,
  District,
  Sector,
  Cell,
  Village,
  QueryFilter,
  SearchOptions,
  Statistics,
  FullPath,
} from '../types';
import { indexFor } from './internal/LocationIndex';

/**
 * Queries Rwanda's administrative divisions: Province → District → Sector → Cell → Village.
 *
 * Every instance reads the same bundled dataset of 14,842 rows, one per village. Creating an
 * instance is cheap: lookup tables are built the first time a method needs them, and are shared
 * by all instances.
 *
 * Rules that apply to every method:
 * - Codes are compared strictly (`===`), with no type conversion. Sector codes are 6-character
 *   strings such as `'010101'`. Province, district, cell and village codes are numbers. So
 *   `getDistrictByCode('101')` and `getSectorByCode(10101)` both return `null`.
 * - A falsy filter argument (`0`, `NaN`, `''`, `null`, `undefined` or `false`) means "no
 *   filter". For example `getDistricts(NaN)` returns all 30 districts, so check values such as
 *   the result of `parseInt` before passing them in.
 * - Filters are positional. Calling a list method through a callback, as in
 *   `codes.map(rw.getCells, rw)`, also passes the index and the array as filters.
 * - Name matching ignores case but does not trim: `'kigali'` matches `'KIGALI'`, and
 *   `' kigali'` matches nothing.
 * - The `get*` methods return new arrays of new objects on every call, which you may modify.
 *   `query()` and `search()` return the dataset rows themselves, in data-file order. Treat those
 *   rows as read-only: changing one affects every caller and every instance.
 *
 * @example
 * ```typescript
 * import { RwandaLocation } from '@devrw/rwanda-location';
 *
 * const rw = new RwandaLocation();
 * const provinces = rw.getProvinces(); // 5 provinces, sorted by code
 * const kigaliDistricts = rw.getDistricts(1); // Nyarugenge, Gasabo, Kicukiro
 * ```
 */
export class RwandaLocation {
  private readonly data: LocationData[];

  /**
   * Creates an instance backed by the bundled dataset. This is cheap: the dataset and its lookup
   * tables are shared by all instances, and the tables are only built on first use.
   */
  constructor() {
    this.data = locationsData as LocationData[];
  }

  /**
   * Lists the 5 provinces, sorted by code.
   *
   * @returns A new array of new `{ code, name }` objects
   *
   * @example
   * ```typescript
   * rw.getProvinces();
   * // [
   * //   { code: 1, name: 'KIGALI' },
   * //   { code: 2, name: 'SOUTH' },
   * //   { code: 3, name: 'WEST' },
   * //   { code: 4, name: 'NORTH' },
   * //   { code: 5, name: 'EAST' }
   * // ]
   * ```
   */
  getProvinces(): Province[] {
    return indexFor(this.data).list('province_code', []).map(toProvince);
  }

  /**
   * Finds a province by its code.
   *
   * @param code - Province code, a number from 1 to 5. Compared with `===`, so `'1'` matches
   *   nothing.
   * @returns A new `{ code, name }` object, or `null` if no province has that code
   *
   * @example
   * ```typescript
   * rw.getProvinceByCode(1); // { code: 1, name: 'KIGALI' }
   * rw.getProvinceByCode(999); // null
   * ```
   */
  getProvinceByCode(code: number): Province | null {
    const location = indexFor(this.data).first('province_code', code);
    return location ? toProvince(location) : null;
  }

  /**
   * Finds a province by its name, ignoring case. The names are `KIGALI`, `SOUTH`, `WEST`,
   * `NORTH` and `EAST`.
   *
   * @param name - Province name in any case, for example `'kigali'` or `'Kigali'`. It is not
   *   trimmed, so `' kigali'` matches nothing. It must be a string: `undefined`, `null` or a
   *   number throws a `TypeError`.
   * @returns A new `{ code, name }` object, or `null` if no province has that name
   *
   * @example
   * ```typescript
   * rw.getProvinceByName('kigali'); // { code: 1, name: 'KIGALI' }
   * rw.getProvinceByName('Southern'); // null
   * ```
   */
  getProvinceByName(name: string): Province | null {
    // 1.1.2 lowercased `name` only while comparing rows, so with no rows it never threw.
    if (this.data.length === 0) return null;
    const location = indexFor(this.data).firstNamed('province_name', name.toLowerCase());
    return location ? toProvince(location) : null;
  }

  /**
   * Lists districts sorted by code: all 30, or those of one province.
   *
   * @param provinceCode - Province code (1-5). A falsy value means no filter, so
   *   `getDistricts(NaN)` returns all 30 districts. A code that matches no province, or a
   *   non-number such as `'1'`, gives `[]`.
   * @returns A new array of new `District` objects
   *
   * @example
   * ```typescript
   * rw.getDistricts(1);
   * // [
   * //   { code: 101, name: 'Nyarugenge', provinceCode: 1, provinceName: 'KIGALI' },
   * //   { code: 102, name: 'Gasabo', provinceCode: 1, provinceName: 'KIGALI' },
   * //   { code: 103, name: 'Kicukiro', provinceCode: 1, provinceName: 'KIGALI' }
   * // ]
   * ```
   */
  getDistricts(provinceCode?: number): District[] {
    return indexFor(this.data).list('district_code', [provinceCode]).map(toDistrict);
  }

  /**
   * Finds a district by its code.
   *
   * @param code - District code, a number such as `101` (the province digit followed by two
   *   digits). Compared with `===`, so `'101'` matches nothing.
   * @returns A new `District` object, or `null` if no district has that code
   *
   * @example
   * ```typescript
   * rw.getDistrictByCode(101);
   * // { code: 101, name: 'Nyarugenge', provinceCode: 1, provinceName: 'KIGALI' }
   * ```
   */
  getDistrictByCode(code: number): District | null {
    const location = indexFor(this.data).first('district_code', code);
    return location ? toDistrict(location) : null;
  }

  /**
   * Lists sectors sorted by code: all 416, or those of a district and/or province. When both
   * filters are given, a sector must match both.
   *
   * @param districtCode - District code such as `101`. A falsy value means no filter.
   * @param provinceCode - Province code (1-5). A falsy value means no filter.
   * @returns A new array of new `Sector` objects. Sector codes are 6-character strings such as
   *   `'010101'`, sorted as strings.
   *
   * @example
   * ```typescript
   * rw.getSectors(101).length; // 10
   * rw.getSectors(undefined, 1).length; // 35, every sector of Kigali
   * rw.getSectors(101, 2); // [], district 101 is not in province 2
   * ```
   */
  getSectors(districtCode?: number, provinceCode?: number): Sector[] {
    return indexFor(this.data).list('sector_code', [districtCode, provinceCode]).map(toSector);
  }

  /**
   * Finds a sector by its code.
   *
   * @param code - Sector code, a 6-character string such as `'010101'`. The leading zero
   *   matters: `'10101'` and the number `10101` both match nothing.
   * @returns A new `Sector` object, or `null` if no sector has that code
   *
   * @example
   * ```typescript
   * rw.getSectorByCode('010101');
   * // { code: '010101', name: 'Gitega', districtCode: 101, districtName: 'Nyarugenge',
   * //   provinceCode: 1, provinceName: 'KIGALI' }
   * ```
   */
  getSectorByCode(code: string): Sector | null {
    const location = indexFor(this.data).first('sector_code', code);
    return location ? toSector(location) : null;
  }

  /**
   * Lists cells sorted by code: all 2,148, or those of a sector, district and/or province.
   * A cell must match every filter that is given.
   *
   * @param sectorCode - Sector code, a 6-character string such as `'010101'`. A falsy value
   *   means no filter.
   * @param districtCode - District code such as `101`. A falsy value means no filter.
   * @param provinceCode - Province code (1-5). A falsy value means no filter.
   * @returns A new array of new `Cell` objects
   *
   * @example
   * ```typescript
   * rw.getCells('010101').map((cell) => cell.name);
   * // ['Akabahizi', 'Akabeza', 'Gacyamo', 'Kigarama', 'Kinyange', 'Kora']
   * rw.getCells(undefined, 101).length; // 47
   * ```
   */
  getCells(sectorCode?: string, districtCode?: number, provinceCode?: number): Cell[] {
    return indexFor(this.data)
      .list('cell_code', [sectorCode, districtCode, provinceCode])
      .map(toCell);
  }

  /**
   * Finds a cell by its code.
   *
   * @param code - Cell code, a number such as `1010101`. Compared with `===`, so `'1010101'`
   *   matches nothing.
   * @returns A new `Cell` object, or `null` if no cell has that code
   *
   * @example
   * ```typescript
   * rw.getCellByCode(1010101)?.name; // 'Akabahizi'
   * ```
   */
  getCellByCode(code: number): Cell | null {
    const location = indexFor(this.data).first('cell_code', code);
    return location ? toCell(location) : null;
  }

  /**
   * Lists villages sorted by code: all 14,842, or those of a cell, sector, district and/or
   * province. A village must match every filter that is given.
   *
   * @param cellCode - Cell code such as `1010101`. A falsy value means no filter.
   * @param sectorCode - Sector code, a 6-character string such as `'010101'`. A falsy value
   *   means no filter.
   * @param districtCode - District code such as `101`. A falsy value means no filter.
   * @param provinceCode - Province code (1-5). A falsy value means no filter.
   * @returns A new array of new `Village` objects
   *
   * @example
   * ```typescript
   * rw.getVillages(1010101).length; // 12
   * rw.getVillages(undefined, '010101').length; // 50
   * rw.getVillages(1010101, '010102'); // [], cell 1010101 is not in sector 010102
   * ```
   */
  getVillages(
    cellCode?: number,
    sectorCode?: string,
    districtCode?: number,
    provinceCode?: number
  ): Village[] {
    return indexFor(this.data)
      .list('village_code', [cellCode, sectorCode, districtCode, provinceCode])
      .map(toVillage);
  }

  /**
   * Finds a village by its code, with the codes and names of its cell, sector, district and
   * province.
   *
   * @param code - Village code, a number such as `101010102`. Compared with `===`, so
   *   `'101010102'` matches nothing.
   * @returns A new `Village` object, or `null` if no village has that code
   *
   * @example
   * ```typescript
   * rw.getVillageByCode(101010102);
   * // { code: 101010102, name: 'Gihanga', cellCode: 1010101, cellName: 'Akabahizi',
   * //   sectorCode: '010101', sectorName: 'Gitega', districtCode: 101,
   * //   districtName: 'Nyarugenge', provinceCode: 1, provinceName: 'KIGALI' }
   * rw.getVillageByCode(999999999); // null
   * ```
   */
  getVillageByCode(code: number): Village | null {
    const location = indexFor(this.data).first('village_code', code);
    return location ? toVillage(location) : null;
  }

  /**
   * Returns the dataset rows (one per village) that match every given filter.
   *
   * - Code filters are compared with `===`: `sectorCode` is a 6-character string, the other
   *   codes are numbers.
   * - Name filters must equal the whole name. They ignore case but are not trimmed, so
   *   `{ districtName: 'gasabo' }` matches and `{ districtName: 'gas' }` does not. Use
   *   {@link RwandaLocation.search} to match part of a name.
   * - A falsy filter value means no filter, and unknown keys are ignored, so `query({})`
   *   returns every row.
   * - A name filter that is truthy but not a string can throw a `TypeError`.
   *
   * @param filter - Filters to combine with AND. It is required: `query()` and `query(null)`
   *   throw a `TypeError`.
   * @returns A new array of the shared dataset rows, in data-file order (not sorted by code).
   *   Treat the rows as read-only: changing one affects every caller.
   *
   * @example
   * ```typescript
   * rw.query({ provinceCode: 1 }).length; // 1176
   * rw.query({ districtName: 'gasabo', sectorName: 'remera' }).length; // 26
   * rw.query({ provinceCode: 1, districtCode: 201 }); // [], district 201 is not in province 1
   * ```
   */
  query(filter: QueryFilter): LocationData[] {
    // With these filters, whether 1.1.2 throws depends on which rows reach each check of its
    // scan, so they keep that scan.
    if (needsFullScan(filter)) return scanQuery(this.data, filter);
    return indexFor(this.data).query(filter);
  }

  /**
   * Finds the dataset rows where the province, district, sector, cell or village name contains
   * `query`. Each result is a village row, so a term that matches a province name returns every
   * village in that province.
   *
   * - Matching ignores case unless `caseSensitive` is truthy.
   * - It is a plain substring match, with no trimming, wildcards or word splitting. An empty
   *   `query` matches every row.
   * - Codes and ids are not searched: `search({ query: '101' })` returns `[]`.
   * - `limit` keeps the first `limit` matches. `0`, `NaN`, `null`, `undefined` and negative
   *   numbers mean no limit. Other values are passed to `Array#slice(0, limit)`, so `2.5` keeps
   *   2, `0.5` keeps none and `'5'` keeps 5. Since 1.2.0 a negative limit means no limit. 1.1.2
   *   passed it to `slice()`, so `-1` dropped the last match and a limit between -1 and 0
   *   returned none.
   *
   * @param options - `{ query, caseSensitive?, limit? }`. Unless `caseSensitive` is truthy,
   *   `query` must be a string: `search()`, `search({})` and `search({ query: 1 })` throw a
   *   `TypeError`.
   * @returns A new array of the shared dataset rows, in data-file order. Treat the rows as
   *   read-only: changing one affects every caller.
   *
   * @example
   * ```typescript
   * rw.search({ query: 'gihanga' }).length; // 67
   * rw.search({ query: 'KIGALI', caseSensitive: true }).length; // 1176
   * rw.search({ query: 'a', limit: 10 }).length; // 10
   * ```
   */
  search(options: SearchOptions): LocationData[] {
    const { query, caseSensitive = false, limit } = options;
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    // A positive numeric limit lets the scan stop early. The slice below decides the result.
    const stopAfter = typeof limit === 'number' && limit >= 1 ? Math.floor(limit) : Infinity;
    const results =
      typeof searchTerm === 'string'
        ? indexFor(this.data).search(searchTerm, caseSensitive, stopAfter)
        : scanSearch(this.data, searchTerm, caseSensitive);

    // Since 1.2.0 a negative limit means no limit, like 0. (1.1.2 passed it to slice(), which
    // dropped results from the end, or returned none for a limit between -1 and 0.)
    return limit && !(limit < 0) ? results.slice(0, limit) : results;
  }

  /**
   * Same as {@link RwandaLocation.getVillageByCode}: the village with the codes and names of its
   * cell, sector, district and province.
   *
   * @param villageCode - Village code, a number such as `101010102`
   * @returns A new `Village` object, or `null` if no village has that code
   */
  getHierarchy(villageCode: number): Village | null {
    return this.getVillageByCode(villageCode);
  }

  /**
   * Counts the provinces, districts, sectors, cells and villages. Each count is the length of
   * the matching unfiltered list (`getProvinces()` to `getVillages()`), so a subclass that
   * overrides one of those methods changes its count.
   *
   * @returns A new `Statistics` object
   *
   * @example
   * ```typescript
   * rw.getStatistics();
   * // {
   * //   totalProvinces: 5,
   * //   totalDistricts: 30,
   * //   totalSectors: 416,
   * //   totalCells: 2148,
   * //   totalVillages: 14842
   * // }
   * ```
   */
  getStatistics(): Statistics {
    if (!usesBuiltInLists(this)) {
      // A subclass, spy or patch replaced a list method: call all five, exactly as 1.1.2 did.
      return {
        totalProvinces: this.getProvinces().length,
        totalDistricts: this.getDistricts().length,
        totalSectors: this.getSectors().length,
        totalCells: this.getCells().length,
        totalVillages: this.getVillages().length,
      };
    }
    const index = indexFor(this.data);
    return {
      totalProvinces: index.count('province_code'),
      totalDistricts: index.count('district_code'),
      totalSectors: index.count('sector_code'),
      totalCells: index.count('cell_code'),
      totalVillages: index.count('village_code'),
    };
  }

  /**
   * Breaks a village down into its province, district, sector, cell and village, for example to
   * show breadcrumbs.
   *
   * @param villageCode - Village code, a number such as `101010102`
   * @returns A new object. When no village has that code it is still an object, with every
   *   member set to `null`.
   *
   * @example
   * ```typescript
   * const path = rw.getFullPath(101010102);
   * // {
   * //   province: { code: 1, name: 'KIGALI' },
   * //   district: { code: 101, name: 'Nyarugenge', ... },
   * //   sector: { code: '010101', name: 'Gitega', ... },
   * //   cell: { code: 1010101, name: 'Akabahizi', ... },
   * //   village: { code: 101010102, name: 'Gihanga', ... }
   * // }
   * rw.getFullPath(999999999).village; // null
   * ```
   */
  getFullPath(villageCode: number): FullPath {
    const village = this.getVillageByCode(villageCode);

    if (!village) {
      return {
        province: null,
        district: null,
        sector: null,
        cell: null,
        village: null,
      };
    }

    return {
      province: { code: village.provinceCode, name: village.provinceName },
      district: {
        code: village.districtCode,
        name: village.districtName,
        provinceCode: village.provinceCode,
        provinceName: village.provinceName,
      },
      sector: {
        code: village.sectorCode,
        name: village.sectorName,
        districtCode: village.districtCode,
        districtName: village.districtName,
        provinceCode: village.provinceCode,
        provinceName: village.provinceName,
      },
      cell: {
        code: village.cellCode,
        name: village.cellName,
        sectorCode: village.sectorCode,
        sectorName: village.sectorName,
        districtCode: village.districtCode,
        districtName: village.districtName,
        provinceCode: village.provinceCode,
        provinceName: village.provinceName,
      },
      village,
    };
  }
}

function toProvince(location: LocationData): Province {
  return { code: location.province_code, name: location.province_name };
}

function toDistrict(location: LocationData): District {
  return {
    code: location.district_code,
    name: location.district_name,
    provinceCode: location.province_code,
    provinceName: location.province_name,
  };
}

function toSector(location: LocationData): Sector {
  return {
    code: location.sector_code,
    name: location.sector_name,
    districtCode: location.district_code,
    districtName: location.district_name,
    provinceCode: location.province_code,
    provinceName: location.province_name,
  };
}

function toCell(location: LocationData): Cell {
  return {
    code: location.cell_code,
    name: location.cell_name,
    sectorCode: location.sector_code,
    sectorName: location.sector_name,
    districtCode: location.district_code,
    districtName: location.district_name,
    provinceCode: location.province_code,
    provinceName: location.province_name,
  };
}

function toVillage(location: LocationData): Village {
  return {
    code: location.village_code,
    name: location.village_name,
    cellCode: location.cell_code,
    cellName: location.cell_name,
    sectorCode: location.sector_code,
    sectorName: location.sector_name,
    districtCode: location.district_code,
    districtName: location.district_name,
    provinceCode: location.province_code,
    provinceName: location.province_name,
  };
}

/** The list methods as shipped, captured at load so getStatistics() can tell if one is replaced. */
const LIST_METHODS = [
  'getProvinces',
  'getDistricts',
  'getSectors',
  'getCells',
  'getVillages',
] as const;
const BUILT_IN_LISTS = LIST_METHODS.map((name) => RwandaLocation.prototype[name]);

/** False when a subclass, a spy or a prototype patch has replaced one of the list methods. */
function usesBuiltInLists(rw: RwandaLocation): boolean {
  return LIST_METHODS.every((name, i) => rw[name] === BUILT_IN_LISTS[i]);
}

const NAME_FILTERS = [
  'provinceName',
  'districtName',
  'sectorName',
  'cellName',
  'villageName',
] as const;

/**
 * True for filters that only 1.1.2's full scan handles exactly: anything that is not an object
 * (`null` and `undefined` throw on the first row), and filters with a truthy name that is not a
 * string (that throws only if some row reaches the name check).
 */
function needsFullScan(filter: QueryFilter): boolean {
  if (filter === null || typeof filter !== 'object') return true;
  return NAME_FILTERS.some((key) => !!filter[key] && typeof filter[key] !== 'string');
}

/* The 1.1.2 scans below are kept verbatim for the inputs that need them. Do not optimize them. */

function scanQuery(data: LocationData[], filter: QueryFilter): LocationData[] {
  return data.filter((loc) => {
    if (filter.provinceCode && loc.province_code !== filter.provinceCode) return false;
    if (
      filter.provinceName &&
      loc.province_name.toLowerCase() !== filter.provinceName.toLowerCase()
    )
      return false;
    if (filter.districtCode && loc.district_code !== filter.districtCode) return false;
    if (
      filter.districtName &&
      loc.district_name.toLowerCase() !== filter.districtName.toLowerCase()
    )
      return false;
    if (filter.sectorCode && loc.sector_code !== filter.sectorCode) return false;
    if (filter.sectorName && loc.sector_name.toLowerCase() !== filter.sectorName.toLowerCase())
      return false;
    if (filter.cellCode && loc.cell_code !== filter.cellCode) return false;
    if (filter.cellName && loc.cell_name.toLowerCase() !== filter.cellName.toLowerCase())
      return false;
    if (filter.villageCode && loc.village_code !== filter.villageCode) return false;
    if (filter.villageName && loc.village_name.toLowerCase() !== filter.villageName.toLowerCase())
      return false;
    return true;
  });
}

/**
 * For search terms that are not strings, which only plain JavaScript can pass: a non-string
 * `query` with `caseSensitive`, or an object whose `toLowerCase()` returns a non-string.
 */
function scanSearch(
  data: LocationData[],
  searchTerm: string,
  caseSensitive: boolean
): LocationData[] {
  return data.filter((loc) => {
    const fields = [
      loc.province_name,
      loc.district_name,
      loc.sector_name,
      loc.cell_name,
      loc.village_name,
    ];

    return fields.some((field) => {
      const fieldValue = caseSensitive ? field : field.toLowerCase();
      return fieldValue.includes(searchTerm);
    });
  });
}
