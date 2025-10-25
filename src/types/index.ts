/**
 * Represents a complete location entry in Rwanda's administrative hierarchy
 */
export interface LocationData {
  id: string;
  country_code: string;
  country_name: string;
  province_code: number;
  province_name: string;
  district_code: number;
  district_name: string;
  sector_code: string;
  sector_name: string;
  cell_code: number;
  cell_name: string;
  village_code: number;
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
 * Represents a district in Rwanda
 */
export interface District {
  code: number;
  name: string;
  provinceCode: number;
  provinceName: string;
}

/**
 * Represents a sector in Rwanda
 */
export interface Sector {
  code: string;
  name: string;
  districtCode: number;
  districtName: string;
  provinceCode: number;
  provinceName: string;
}

/**
 * Represents a cell in Rwanda
 */
export interface Cell {
  code: number;
  name: string;
  sectorCode: string;
  sectorName: string;
  districtCode: number;
  districtName: string;
  provinceCode: number;
  provinceName: string;
}

/**
 * Represents a village in Rwanda
 */
export interface Village {
  code: number;
  name: string;
  cellCode: number;
  cellName: string;
  sectorCode: string;
  sectorName: string;
  districtCode: number;
  districtName: string;
  provinceCode: number;
  provinceName: string;
}

/**
 * Filter options for querying locations
 */
export interface QueryFilter {
  provinceCode?: number;
  provinceName?: string;
  districtCode?: number;
  districtName?: string;
  sectorCode?: string;
  sectorName?: string;
  cellCode?: number;
  cellName?: string;
  villageCode?: number;
  villageName?: string;
}

/**
 * Search options for finding locations
 */
export interface SearchOptions {
  /** The search term to look for */
  query: string;
  /** Whether the search should be case-sensitive (default: false) */
  caseSensitive?: boolean;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Statistics about Rwanda's administrative divisions
 */
export interface Statistics {
  totalProvinces: number;
  totalDistricts: number;
  totalSectors: number;
  totalCells: number;
  totalVillages: number;
}

/**
 * Complete administrative path for a location
 */
export interface FullPath {
  province: Province | null;
  district: District | null;
  sector: Sector | null;
  cell: Cell | null;
  village: Village | null;
}
