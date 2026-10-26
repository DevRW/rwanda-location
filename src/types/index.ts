/**
 * One row of the dataset: a village together with its cell, sector, district and province.
 * There are 14,842 rows, one per village.
 *
 * `query()` and `search()` return these rows themselves, shared by every caller and every
 * instance. Treat them as read-only: changing a field changes what later calls return.
 */
export interface LocationData {
  /** Unique id of the row (a UUID string) */
  id: string;
  /** Always `'RWA'` */
  country_code: string;
  /** Always `'RWANDA'` */
  country_name: string;
  /** Province code, a number from 1 to 5 */
  province_code: number;
  /** Province name: `KIGALI`, `SOUTH`, `WEST`, `NORTH` or `EAST` */
  province_name: string;
  /** District code, a number such as `101` */
  district_code: number;
  /** District name, for example `'Nyarugenge'` */
  district_name: string;
  /** Sector code, a 6-character string such as `'010101'` (not a number) */
  sector_code: string;
  /** Sector name, for example `'Gitega'`. Some are stored in capitals, such as `'KATABAGEMU'`. */
  sector_name: string;
  /** Cell code, a number such as `1010101` */
  cell_code: number;
  /** Cell name, for example `'Akabahizi'` */
  cell_name: string;
  /** Village code, a number such as `101010102` */
  village_code: number;
  /** Village name, for example `'Gihanga'`. Village names repeat across cells. */
  village_name: string;
}

/**
 * Represents a province in Rwanda.
 * Province codes: 1 (KIGALI), 2 (SOUTH), 3 (WEST), 4 (NORTH), 5 (EAST)
 */
export interface Province {
  /** Province code (1-5) */
  code: number;
  /** Province name (KIGALI, SOUTH, WEST, NORTH, EAST) */
  name: string;
}

/**
 * A district, with the code and name of its province.
 */
export interface District {
  /** District code, a number such as `101` */
  code: number;
  /** District name, for example `'Nyarugenge'` */
  name: string;
  /** Code of the district's province (1-5) */
  provinceCode: number;
  /** Name of the district's province */
  provinceName: string;
}

/**
 * A sector, with the codes and names of its district and province.
 */
export interface Sector {
  /** Sector code, a 6-character string such as `'010101'` (not a number) */
  code: string;
  /** Sector name, for example `'Gitega'` */
  name: string;
  /** Code of the sector's district */
  districtCode: number;
  /** Name of the sector's district */
  districtName: string;
  /** Code of the sector's province (1-5) */
  provinceCode: number;
  /** Name of the sector's province */
  provinceName: string;
}

/**
 * A cell, with the codes and names of its sector, district and province.
 */
export interface Cell {
  /** Cell code, a number such as `1010101` */
  code: number;
  /** Cell name, for example `'Akabahizi'` */
  name: string;
  /** Code of the cell's sector, a 6-character string such as `'010101'` */
  sectorCode: string;
  /** Name of the cell's sector */
  sectorName: string;
  /** Code of the cell's district */
  districtCode: number;
  /** Name of the cell's district */
  districtName: string;
  /** Code of the cell's province (1-5) */
  provinceCode: number;
  /** Name of the cell's province */
  provinceName: string;
}

/**
 * A village, with the codes and names of its cell, sector, district and province.
 */
export interface Village {
  /** Village code, a number such as `101010102` */
  code: number;
  /** Village name, for example `'Gihanga'` */
  name: string;
  /** Code of the village's cell */
  cellCode: number;
  /** Name of the village's cell */
  cellName: string;
  /** Code of the village's sector, a 6-character string such as `'010101'` */
  sectorCode: string;
  /** Name of the village's sector */
  sectorName: string;
  /** Code of the village's district */
  districtCode: number;
  /** Name of the village's district */
  districtName: string;
  /** Code of the village's province (1-5) */
  provinceCode: number;
  /** Name of the village's province */
  provinceName: string;
}

/**
 * Filters for `query()`. A row must match every filter that is set.
 *
 * - A falsy value (`0`, `NaN`, `''`, `null`, `undefined`, `false`) means no filter, and unknown
 *   keys are ignored.
 * - Codes are compared with `===`: `sectorCode` is a 6-character string, the other codes are
 *   numbers.
 * - Names must equal the whole name. They ignore case but are not trimmed.
 */
export interface QueryFilter {
  /** Province code (1-5) */
  provinceCode?: number;
  /** Province name, any case, for example `'kigali'` */
  provinceName?: string;
  /** District code, a number such as `101` */
  districtCode?: number;
  /** District name, any case */
  districtName?: string;
  /** Sector code, a 6-character string such as `'010101'` */
  sectorCode?: string;
  /** Sector name, any case */
  sectorName?: string;
  /** Cell code, a number such as `1010101` */
  cellCode?: number;
  /** Cell name, any case */
  cellName?: string;
  /** Village code, a number such as `101010102` */
  villageCode?: number;
  /** Village name, any case */
  villageName?: string;
}

/**
 * Options for `search()`.
 */
export interface SearchOptions {
  /**
   * Text to look for inside the province, district, sector, cell and village names. Plain
   * substring match, not trimmed. An empty string matches every row.
   */
  query: string;
  /** Whether the match is case-sensitive. Default: `false` (any falsy value). */
  caseSensitive?: boolean;
  /**
   * Maximum number of rows to return. `0`, `NaN`, `null`, `undefined` and negative numbers mean
   * no limit. A fraction is rounded down, so `0.5` returns no rows.
   */
  limit?: number;
}

/**
 * Number of distinct codes at each level, as returned by `getStatistics()`.
 */
export interface Statistics {
  /** Number of provinces (5) */
  totalProvinces: number;
  /** Number of districts (30) */
  totalDistricts: number;
  /** Number of sectors (416) */
  totalSectors: number;
  /** Number of cells (2,148) */
  totalCells: number;
  /** Number of villages (14,842) */
  totalVillages: number;
}

/**
 * The full administrative path of a village, as returned by `getFullPath()`. When the village
 * is not found, every member is `null`.
 */
export interface FullPath {
  /** The village's province */
  province: Province | null;
  /** The village's district */
  district: District | null;
  /** The village's sector */
  sector: Sector | null;
  /** The village's cell */
  cell: Cell | null;
  /** The village itself, as returned by `getVillageByCode()` */
  village: Village | null;
}
