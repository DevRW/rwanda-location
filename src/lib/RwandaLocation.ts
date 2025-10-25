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

/**
 * Main class for querying Rwanda's administrative divisions.
 * Provides methods to navigate and search through Rwanda's complete hierarchical
 * administrative structure: Province → District → Sector → Cell → Village
 *
 * @example
 * ```typescript
 * const rw = new RwandaLocation();
 * const provinces = rw.getProvinces();
 * const kigaliDistricts = rw.getDistricts(1);
 * ```
 */
export class RwandaLocation {
  private readonly data: LocationData[];

  /**
   * Initialize a new RwandaLocation instance with the complete location dataset.
   * The data is loaded once at construction time for optimal performance.
   */
  constructor() {
    this.data = locationsData as LocationData[];
  }

  /**
   * Get all provinces in Rwanda.
   * Returns all 5 provinces sorted by code in ascending order.
   *
   * @returns Array of all provinces with code and name
   *
   * @example
   * ```typescript
   * const provinces = rw.getProvinces();
   * // Returns:
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
    const provinceMap = new Map<number, string>();

    this.data.forEach((location) => {
      if (!provinceMap.has(location.province_code)) {
        provinceMap.set(location.province_code, location.province_name);
      }
    });

    return Array.from(provinceMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code - b.code);
  }

  /**
   * Get a specific province by its code.
   *
   * @param code - The province code (1-5)
   * @returns The province object or null if not found
   *
   * @example
   * ```typescript
   * const kigali = rw.getProvinceByCode(1);
   * // Returns: { code: 1, name: 'KIGALI' }
   *
   * const invalid = rw.getProvinceByCode(999);
   * // Returns: null
   * ```
   */
  getProvinceByCode(code: number): Province | null {
    const location = this.data.find((loc) => loc.province_code === code);
    if (!location) return null;

    return {
      code: location.province_code,
      name: location.province_name,
    };
  }

  /**
   * Get a specific province by its name (case-insensitive).
   *
   * @param name - The province name (case-insensitive, e.g., 'KIGALI', 'kigali', 'Kigali')
   * @returns The province object or null if not found
   *
   * @example
   * ```typescript
   * const kigali = rw.getProvinceByName('kigali');
   * // Returns: { code: 1, name: 'KIGALI' }
   *
   * const south = rw.getProvinceByName('SOUTH');
   * // Returns: { code: 2, name: 'SOUTH' }
   * ```
   */
  getProvinceByName(name: string): Province | null {
    const location = this.data.find(
      (loc) => loc.province_name.toLowerCase() === name.toLowerCase()
    );
    if (!location) return null;

    return {
      code: location.province_code,
      name: location.province_name,
    };
  }

  /**
   * Get all districts, optionally filtered by province.
   * Districts are sorted by code in ascending order.
   *
   * @param provinceCode - Optional province code to filter districts (1-5)
   * @returns Array of districts with hierarchical information
   *
   * @example
   * ```typescript
   * // Get all districts in Rwanda
   * const allDistricts = rw.getDistricts();
   *
   * // Get only districts in Kigali province
   * const kigaliDistricts = rw.getDistricts(1);
   * // Returns:
   * // [
   * //   { code: 101, name: 'Nyarugenge', provinceCode: 1, provinceName: 'KIGALI' },
   * //   { code: 102, name: 'Gasabo', provinceCode: 1, provinceName: 'KIGALI' },
   * //   { code: 103, name: 'Kicukiro', provinceCode: 1, provinceName: 'KIGALI' }
   * // ]
   * ```
   */
  getDistricts(provinceCode?: number): District[] {
    const districtMap = new Map<number, District>();

    this.data
      .filter((loc) => !provinceCode || loc.province_code === provinceCode)
      .forEach((location) => {
        if (!districtMap.has(location.district_code)) {
          districtMap.set(location.district_code, {
            code: location.district_code,
            name: location.district_name,
            provinceCode: location.province_code,
            provinceName: location.province_name,
          });
        }
      });

    return Array.from(districtMap.values()).sort((a, b) => a.code - b.code);
  }

  /**
   * Get a district by code
   */
  getDistrictByCode(code: number): District | null {
    const location = this.data.find((loc) => loc.district_code === code);
    if (!location) return null;

    return {
      code: location.district_code,
      name: location.district_name,
      provinceCode: location.province_code,
      provinceName: location.province_name,
    };
  }

  /**
   * Get all sectors, optionally filtered by district or province
   */
  getSectors(districtCode?: number, provinceCode?: number): Sector[] {
    const sectorMap = new Map<string, Sector>();

    this.data
      .filter((loc) => {
        if (districtCode && loc.district_code !== districtCode) return false;
        if (provinceCode && loc.province_code !== provinceCode) return false;
        return true;
      })
      .forEach((location) => {
        if (!sectorMap.has(location.sector_code)) {
          sectorMap.set(location.sector_code, {
            code: location.sector_code,
            name: location.sector_name,
            districtCode: location.district_code,
            districtName: location.district_name,
            provinceCode: location.province_code,
            provinceName: location.province_name,
          });
        }
      });

    return Array.from(sectorMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * Get a sector by code
   */
  getSectorByCode(code: string): Sector | null {
    const location = this.data.find((loc) => loc.sector_code === code);
    if (!location) return null;

    return {
      code: location.sector_code,
      name: location.sector_name,
      districtCode: location.district_code,
      districtName: location.district_name,
      provinceCode: location.province_code,
      provinceName: location.province_name,
    };
  }

  /**
   * Get all cells, optionally filtered by sector, district, or province
   */
  getCells(sectorCode?: string, districtCode?: number, provinceCode?: number): Cell[] {
    const cellMap = new Map<number, Cell>();

    this.data
      .filter((loc) => {
        if (sectorCode && loc.sector_code !== sectorCode) return false;
        if (districtCode && loc.district_code !== districtCode) return false;
        if (provinceCode && loc.province_code !== provinceCode) return false;
        return true;
      })
      .forEach((location) => {
        if (!cellMap.has(location.cell_code)) {
          cellMap.set(location.cell_code, {
            code: location.cell_code,
            name: location.cell_name,
            sectorCode: location.sector_code,
            sectorName: location.sector_name,
            districtCode: location.district_code,
            districtName: location.district_name,
            provinceCode: location.province_code,
            provinceName: location.province_name,
          });
        }
      });

    return Array.from(cellMap.values()).sort((a, b) => a.code - b.code);
  }

  /**
   * Get a cell by code
   */
  getCellByCode(code: number): Cell | null {
    const location = this.data.find((loc) => loc.cell_code === code);
    if (!location) return null;

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

  /**
   * Get all villages, optionally filtered by cell, sector, district, or province
   */
  getVillages(
    cellCode?: number,
    sectorCode?: string,
    districtCode?: number,
    provinceCode?: number
  ): Village[] {
    const villageMap = new Map<number, Village>();

    this.data
      .filter((loc) => {
        if (cellCode && loc.cell_code !== cellCode) return false;
        if (sectorCode && loc.sector_code !== sectorCode) return false;
        if (districtCode && loc.district_code !== districtCode) return false;
        if (provinceCode && loc.province_code !== provinceCode) return false;
        return true;
      })
      .forEach((location) => {
        if (!villageMap.has(location.village_code)) {
          villageMap.set(location.village_code, {
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
          });
        }
      });

    return Array.from(villageMap.values()).sort((a, b) => a.code - b.code);
  }

  /**
   * Get a village by code
   */
  getVillageByCode(code: number): Village | null {
    const location = this.data.find((loc) => loc.village_code === code);
    if (!location) return null;

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

  /**
   * Query locations with flexible filters across all administrative levels.
   * All filters are ANDed together. Name filters are case-insensitive.
   *
   * @param filter - Query filter object with optional filters for each level
   * @returns Array of matching location data
   *
   * @example
   * ```typescript
   * // Find all locations in Kigali province
   * const kigaliLocations = rw.query({ provinceCode: 1 });
   *
   * // Find locations by multiple criteria
   * const filtered = rw.query({
   *   provinceCode: 1,
   *   districtCode: 101,
   *   sectorName: 'Gitega'
   * });
   *
   * // Search by name (case-insensitive)
   * const byName = rw.query({ provinceName: 'kigali' });
   * ```
   */
  query(filter: QueryFilter): LocationData[] {
    return this.data.filter((loc) => {
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
   * Search for locations by name across all administrative levels.
   * Searches through province, district, sector, cell, and village names.
   *
   * @param options - Search options including query string, case sensitivity, and result limit
   * @returns Array of matching locations
   *
   * @example
   * ```typescript
   * // Case-insensitive search (default)
   * const results = rw.search({ query: 'Kigali' });
   *
   * // Case-sensitive search
   * const exactResults = rw.search({
   *   query: 'KIGALI',
   *   caseSensitive: true
   * });
   *
   * // Limited results
   * const topResults = rw.search({
   *   query: 'gitega',
   *   limit: 10
   * });
   * ```
   */
  search(options: SearchOptions): LocationData[] {
    const { query, caseSensitive = false, limit } = options;
    const searchTerm = caseSensitive ? query : query.toLowerCase();

    const results = this.data.filter((loc) => {
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

    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Get the complete hierarchy for a given village code
   */
  getHierarchy(villageCode: number): Village | null {
    return this.getVillageByCode(villageCode);
  }

  /**
   * Get statistics about the data.
   *
   * @returns Statistics object with counts for all administrative levels
   *
   * @example
   * ```typescript
   * const stats = rw.getStatistics();
   * // {
   * //   totalProvinces: 5,
   * //   totalDistricts: 30,
   * //   totalSectors: 416,
   * //   totalCells: 2148,
   * //   totalVillages: 14837
   * // }
   * ```
   */
  getStatistics(): Statistics {
    return {
      totalProvinces: this.getProvinces().length,
      totalDistricts: this.getDistricts().length,
      totalSectors: this.getSectors().length,
      totalCells: this.getCells().length,
      totalVillages: this.getVillages().length,
    };
  }

  /**
   * Get the full administrative path for any location level.
   * Useful for breadcrumb navigation and displaying complete hierarchy.
   *
   * @param villageCode - The village code to get the full path for
   * @returns Object with the complete administrative path
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
