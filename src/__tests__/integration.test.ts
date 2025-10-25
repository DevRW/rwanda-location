/**
 * Integration tests for real-world usage scenarios
 */

import { RwandaLocation, rwandaLocation } from '../index';

describe('Integration Tests', () => {
  let rw: RwandaLocation;

  beforeEach(() => {
    rw = new RwandaLocation();
  });

  describe('Hierarchical Navigation Flow', () => {
    it('should successfully navigate from province to village', () => {
      // Step 1: Get provinces
      const provinces = rw.getProvinces();
      expect(provinces.length).toBeGreaterThan(0);

      // Step 2: Select first province and get its districts
      const province = provinces[0];
      const districts = rw.getDistricts(province.code);
      expect(districts.length).toBeGreaterThan(0);
      expect(districts.every((d) => d.provinceCode === province.code)).toBe(true);

      // Step 3: Select first district and get its sectors
      const district = districts[0];
      const sectors = rw.getSectors(district.code);
      expect(sectors.length).toBeGreaterThan(0);
      expect(sectors.every((s) => s.districtCode === district.code)).toBe(true);

      // Step 4: Select first sector and get its cells
      const sector = sectors[0];
      const cells = rw.getCells(sector.code);
      expect(cells.length).toBeGreaterThan(0);
      expect(cells.every((c) => c.sectorCode === sector.code)).toBe(true);

      // Step 5: Select first cell and get its villages
      const cell = cells[0];
      const villages = rw.getVillages(cell.code);
      expect(villages.length).toBeGreaterThan(0);
      expect(villages.every((v) => v.cellCode === cell.code)).toBe(true);

      // Step 6: Get full hierarchy for the village
      const village = villages[0];
      const hierarchy = rw.getHierarchy(village.code);
      expect(hierarchy).toBeDefined();
      expect(hierarchy?.code).toBe(village.code);
      expect(hierarchy?.provinceCode).toBe(province.code);
      expect(hierarchy?.districtCode).toBe(district.code);
      expect(hierarchy?.sectorCode).toBe(sector.code);
      expect(hierarchy?.cellCode).toBe(cell.code);
    });

    it('should maintain data consistency across all levels', () => {
      const villages = rw.getVillages();
      const firstVillage = villages[0];

      // Verify the village's cell exists
      const cell = rw.getCellByCode(firstVillage.cellCode);
      expect(cell).toBeDefined();
      expect(cell?.code).toBe(firstVillage.cellCode);

      // Verify the cell's sector exists
      const sector = rw.getSectorByCode(cell!.sectorCode);
      expect(sector).toBeDefined();
      expect(sector?.code).toBe(firstVillage.sectorCode);

      // Verify the sector's district exists
      const district = rw.getDistrictByCode(sector!.districtCode);
      expect(district).toBeDefined();
      expect(district?.code).toBe(firstVillage.districtCode);

      // Verify the district's province exists
      const province = rw.getProvinceByCode(district!.provinceCode);
      expect(province).toBeDefined();
      expect(province?.code).toBe(firstVillage.provinceCode);
    });
  });

  describe('Address Form Simulation', () => {
    it('should handle cascading dropdown selections', () => {
      // User selects Kigali province
      const selectedProvinceCode = 1;
      const districts = rw.getDistricts(selectedProvinceCode);
      expect(districts.length).toBeGreaterThan(0);

      // User selects a district
      const selectedDistrictCode = districts[0].code;
      const sectors = rw.getSectors(selectedDistrictCode);
      expect(sectors.length).toBeGreaterThan(0);

      // User selects a sector
      const selectedSectorCode = sectors[0].code;
      const cells = rw.getCells(selectedSectorCode);
      expect(cells.length).toBeGreaterThan(0);

      // User selects a cell
      const selectedCellCode = cells[0].code;
      const villages = rw.getVillages(selectedCellCode);
      expect(villages.length).toBeGreaterThan(0);

      // User selects a village and gets complete info
      const selectedVillageCode = villages[0].code;
      const fullInfo = rw.getVillageByCode(selectedVillageCode);

      expect(fullInfo).toBeDefined();
      expect(fullInfo?.provinceCode).toBe(selectedProvinceCode);
      expect(fullInfo?.districtCode).toBe(selectedDistrictCode);
      expect(fullInfo?.sectorCode).toBe(selectedSectorCode);
      expect(fullInfo?.cellCode).toBe(selectedCellCode);
      expect(fullInfo?.code).toBe(selectedVillageCode);
    });
  });

  describe('Address Validation Scenario', () => {
    it('should validate a complete address hierarchy', () => {
      const provinceCode = 1;
      const districtCode = 101;

      // Validate province exists
      const province = rw.getProvinceByCode(provinceCode);
      expect(province).toBeDefined();

      // Validate district exists and belongs to province
      const district = rw.getDistrictByCode(districtCode);
      expect(district).toBeDefined();
      expect(district?.provinceCode).toBe(provinceCode);

      // Get a sector from this district
      const sectors = rw.getSectors(districtCode);
      expect(sectors.length).toBeGreaterThan(0);

      const sectorCode = sectors[0].code;
      const sector = rw.getSectorByCode(sectorCode);
      expect(sector).toBeDefined();
      expect(sector?.districtCode).toBe(districtCode);
      expect(sector?.provinceCode).toBe(provinceCode);
    });

    it('should detect invalid hierarchical relationships', () => {
      // Try to get districts from an invalid province
      const districts = rw.getDistricts(999);
      expect(districts).toEqual([]);

      // Try to get sectors from an invalid district
      const sectors = rw.getSectors(999999);
      expect(sectors).toEqual([]);
    });
  });

  describe('Search and Query Combined Usage', () => {
    it('should find locations using search then narrow with query', () => {
      // First, search for locations containing "Kigali"
      const searchResults = rw.search({ query: 'Kigali' });
      expect(searchResults.length).toBeGreaterThan(0);

      // Then narrow down to specific district using query
      const narrowedResults = rw.query({
        provinceCode: 1,
        districtCode: 101,
      });
      expect(narrowedResults.length).toBeGreaterThan(0);
      expect(narrowedResults.length).toBeLessThanOrEqual(searchResults.length);
    });
  });

  describe('Default Instance', () => {
    it('should use the default instance correctly', () => {
      const provinces = rwandaLocation.getProvinces();
      expect(provinces.length).toBe(5);

      const stats = rwandaLocation.getStatistics();
      expect(stats.totalProvinces).toBe(5);
    });

    it('should be independent from new instances', () => {
      const newInstance = new RwandaLocation();
      const defaultProvinces = rwandaLocation.getProvinces();
      const newProvinces = newInstance.getProvinces();

      expect(defaultProvinces).toEqual(newProvinces);
    });
  });

  describe('Performance and Data Integrity', () => {
    it('should handle large result sets efficiently', () => {
      const startTime = Date.now();
      const allVillages = rw.getVillages();
      const endTime = Date.now();

      expect(allVillages.length).toBeGreaterThan(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should maintain unique codes across administrative levels', () => {
      const provinces = rw.getProvinces();
      const provinceCodes = provinces.map((p) => p.code);
      expect(new Set(provinceCodes).size).toBe(provinceCodes.length);

      const districts = rw.getDistricts();
      const districtCodes = districts.map((d) => d.code);
      expect(new Set(districtCodes).size).toBe(districtCodes.length);
    });

    it('should return consistent results across multiple calls', () => {
      const firstCall = rw.getProvinces();
      const secondCall = rw.getProvinces();
      expect(firstCall).toEqual(secondCall);

      const firstSearch = rw.search({ query: 'Kigali' });
      const secondSearch = rw.search({ query: 'Kigali' });
      expect(firstSearch).toEqual(secondSearch);
    });
  });

  describe('Full Path and Breadcrumb Generation', () => {
    it('should generate complete breadcrumb path', () => {
      const villages = rw.getVillages();
      const village = villages[0];

      const fullPath = rw.getFullPath(village.code);

      expect(fullPath.province).toBeDefined();
      expect(fullPath.district).toBeDefined();
      expect(fullPath.sector).toBeDefined();
      expect(fullPath.cell).toBeDefined();
      expect(fullPath.village).toBeDefined();

      expect(fullPath.province?.code).toBe(village.provinceCode);
      expect(fullPath.district?.code).toBe(village.districtCode);
      expect(fullPath.sector?.code).toBe(village.sectorCode);
      expect(fullPath.cell?.code).toBe(village.cellCode);
      expect(fullPath.village?.code).toBe(village.code);
    });
  });

  describe('Edge Cases in Real Usage', () => {
    it('should handle empty query filters gracefully', () => {
      const results = rw.query({});
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle search with special characters', () => {
      const results = rw.search({ query: "'" });
      // Should not throw error, may or may not find results
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      const results = rw.search({ query: longQuery });
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
