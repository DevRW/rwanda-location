import { RwandaLocation } from '../lib/RwandaLocation';

describe('RwandaLocation', () => {
  let rwandaLocation: RwandaLocation;

  beforeEach(() => {
    rwandaLocation = new RwandaLocation();
  });

  describe('getProvinces', () => {
    it('should return all provinces', () => {
      const provinces = rwandaLocation.getProvinces();
      expect(provinces).toBeDefined();
      expect(provinces.length).toBe(5);
      expect(provinces.every((p) => p.code && p.name)).toBe(true);
    });

    it('should return provinces in sorted order by code', () => {
      const provinces = rwandaLocation.getProvinces();
      const codes = provinces.map((p) => p.code);
      const sortedCodes = [...codes].sort((a, b) => a - b);
      expect(codes).toEqual(sortedCodes);
    });

    it('should include KIGALI province', () => {
      const provinces = rwandaLocation.getProvinces();
      const kigali = provinces.find((p) => p.name === 'KIGALI');
      expect(kigali).toBeDefined();
      expect(kigali?.code).toBe(1);
    });
  });

  describe('getProvinceByCode', () => {
    it('should return a province by valid code', () => {
      const province = rwandaLocation.getProvinceByCode(1);
      expect(province).toBeDefined();
      expect(province?.name).toBe('KIGALI');
    });

    it('should return null for invalid code', () => {
      const province = rwandaLocation.getProvinceByCode(999);
      expect(province).toBeNull();
    });
  });

  describe('getProvinceByName', () => {
    it('should return a province by name', () => {
      const province = rwandaLocation.getProvinceByName('KIGALI');
      expect(province).toBeDefined();
      expect(province?.code).toBe(1);
    });

    it('should be case-insensitive', () => {
      const province = rwandaLocation.getProvinceByName('kigali');
      expect(province).toBeDefined();
      expect(province?.name).toBe('KIGALI');
    });

    it('should return null for non-existent province', () => {
      const province = rwandaLocation.getProvinceByName('NONEXISTENT');
      expect(province).toBeNull();
    });
  });

  describe('getDistricts', () => {
    it('should return all districts', () => {
      const districts = rwandaLocation.getDistricts();
      expect(districts).toBeDefined();
      expect(districts.length).toBeGreaterThan(0);
      expect(districts.every((d) => d.code && d.name && d.provinceCode && d.provinceName)).toBe(
        true
      );
    });

    it('should filter districts by province code', () => {
      const kigaliDistricts = rwandaLocation.getDistricts(1);
      expect(kigaliDistricts.every((d) => d.provinceCode === 1)).toBe(true);
      expect(kigaliDistricts.every((d) => d.provinceName === 'KIGALI')).toBe(true);
    });

    it('should return districts in sorted order by code', () => {
      const districts = rwandaLocation.getDistricts();
      const codes = districts.map((d) => d.code);
      const sortedCodes = [...codes].sort((a, b) => a - b);
      expect(codes).toEqual(sortedCodes);
    });
  });

  describe('getDistrictByCode', () => {
    it('should return a district by valid code', () => {
      const district = rwandaLocation.getDistrictByCode(101);
      expect(district).toBeDefined();
      expect(district?.name).toBeDefined();
      expect(district?.provinceCode).toBe(1);
    });

    it('should return null for invalid code', () => {
      const district = rwandaLocation.getDistrictByCode(999999);
      expect(district).toBeNull();
    });
  });

  describe('getSectors', () => {
    it('should return all sectors', () => {
      const sectors = rwandaLocation.getSectors();
      expect(sectors).toBeDefined();
      expect(sectors.length).toBeGreaterThan(0);
    });

    it('should filter sectors by district code', () => {
      const districts = rwandaLocation.getDistricts();
      const firstDistrict = districts[0];
      const sectors = rwandaLocation.getSectors(firstDistrict.code);
      expect(sectors.every((s) => s.districtCode === firstDistrict.code)).toBe(true);
    });

    it('should filter sectors by province code', () => {
      const sectors = rwandaLocation.getSectors(undefined, 1);
      expect(sectors.every((s) => s.provinceCode === 1)).toBe(true);
    });
  });

  describe('getSectorByCode', () => {
    it('should return a sector by valid code', () => {
      const sectors = rwandaLocation.getSectors();
      const firstSector = sectors[0];
      const sector = rwandaLocation.getSectorByCode(firstSector.code);
      expect(sector).toBeDefined();
      expect(sector?.code).toBe(firstSector.code);
    });

    it('should return null for invalid code', () => {
      const sector = rwandaLocation.getSectorByCode('INVALID');
      expect(sector).toBeNull();
    });
  });

  describe('getCells', () => {
    it('should return all cells', () => {
      const cells = rwandaLocation.getCells();
      expect(cells).toBeDefined();
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should filter cells by sector code', () => {
      const sectors = rwandaLocation.getSectors();
      const firstSector = sectors[0];
      const cells = rwandaLocation.getCells(firstSector.code);
      expect(cells.every((c) => c.sectorCode === firstSector.code)).toBe(true);
    });

    it('should filter cells by district code', () => {
      const districts = rwandaLocation.getDistricts();
      const firstDistrict = districts[0];
      const cells = rwandaLocation.getCells(undefined, firstDistrict.code);
      expect(cells.every((c) => c.districtCode === firstDistrict.code)).toBe(true);
    });
  });

  describe('getCellByCode', () => {
    it('should return a cell by valid code', () => {
      const cells = rwandaLocation.getCells();
      const firstCell = cells[0];
      const cell = rwandaLocation.getCellByCode(firstCell.code);
      expect(cell).toBeDefined();
      expect(cell?.code).toBe(firstCell.code);
    });

    it('should return null for invalid code', () => {
      const cell = rwandaLocation.getCellByCode(999999999);
      expect(cell).toBeNull();
    });
  });

  describe('getVillages', () => {
    it('should return all villages', () => {
      const villages = rwandaLocation.getVillages();
      expect(villages).toBeDefined();
      expect(villages.length).toBeGreaterThan(0);
    });

    it('should filter villages by cell code', () => {
      const cells = rwandaLocation.getCells();
      const firstCell = cells[0];
      const villages = rwandaLocation.getVillages(firstCell.code);
      expect(villages.every((v) => v.cellCode === firstCell.code)).toBe(true);
    });

    it('should filter villages by sector code', () => {
      const sectors = rwandaLocation.getSectors();
      const firstSector = sectors[0];
      const villages = rwandaLocation.getVillages(undefined, firstSector.code);
      expect(villages.every((v) => v.sectorCode === firstSector.code)).toBe(true);
    });
  });

  describe('getVillageByCode', () => {
    it('should return a village by valid code', () => {
      const villages = rwandaLocation.getVillages();
      const firstVillage = villages[0];
      const village = rwandaLocation.getVillageByCode(firstVillage.code);
      expect(village).toBeDefined();
      expect(village?.code).toBe(firstVillage.code);
    });

    it('should return null for invalid code', () => {
      const village = rwandaLocation.getVillageByCode(999999999);
      expect(village).toBeNull();
    });
  });

  describe('query', () => {
    it('should filter by province code', () => {
      const results = rwandaLocation.query({ provinceCode: 1 });
      expect(results.every((r) => r.province_code === 1)).toBe(true);
    });

    it('should filter by province name', () => {
      const results = rwandaLocation.query({ provinceName: 'KIGALI' });
      expect(results.every((r) => r.province_name === 'KIGALI')).toBe(true);
    });

    it('should filter by district name', () => {
      const districts = rwandaLocation.getDistricts();
      const firstDistrict = districts[0];
      const results = rwandaLocation.query({ districtName: firstDistrict.name });
      expect(results.every((r) => r.district_name === firstDistrict.name)).toBe(true);
    });

    it('should filter by sector name', () => {
      const sectors = rwandaLocation.getSectors();
      const firstSector = sectors[0];
      const results = rwandaLocation.query({ sectorName: firstSector.name });
      expect(results.every((r) => r.sector_name === firstSector.name)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by cell name', () => {
      const cells = rwandaLocation.getCells();
      const firstCell = cells[0];
      const results = rwandaLocation.query({ cellName: firstCell.name });
      expect(results.every((r) => r.cell_name === firstCell.name)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by village name', () => {
      const villages = rwandaLocation.getVillages();
      const firstVillage = villages[0];
      const results = rwandaLocation.query({ villageName: firstVillage.name });
      expect(results.every((r) => r.village_name === firstVillage.name)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by multiple criteria', () => {
      const results = rwandaLocation.query({
        provinceCode: 1,
        districtCode: 101,
      });
      expect(results.every((r) => r.province_code === 1 && r.district_code === 101)).toBe(true);
    });

    it('should be case-insensitive for names', () => {
      const results = rwandaLocation.query({ provinceName: 'kigali' });
      expect(results.every((r) => r.province_name === 'KIGALI')).toBe(true);
    });

    it('should return empty array for non-matching filters', () => {
      const results = rwandaLocation.query({
        provinceCode: 1,
        districtName: 'NonExistentDistrict',
      });
      expect(results).toEqual([]);
    });

    it('should handle complex multi-level filters', () => {
      const villages = rwandaLocation.getVillages();
      const firstVillage = villages[0];
      const results = rwandaLocation.query({
        provinceCode: firstVillage.provinceCode,
        districtCode: firstVillage.districtCode,
        sectorCode: firstVillage.sectorCode,
        cellCode: firstVillage.cellCode,
        villageCode: firstVillage.code,
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].village_code).toBe(firstVillage.code);
    });
  });

  describe('search', () => {
    it('should search across all location levels', () => {
      const results = rwandaLocation.search({ query: 'Gihanga' });
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) =>
          [r.province_name, r.district_name, r.sector_name, r.cell_name, r.village_name].some(
            (field) => field.toLowerCase().includes('gihanga'.toLowerCase())
          )
        )
      ).toBe(true);
    });

    it('should respect case sensitivity option', () => {
      const results = rwandaLocation.search({ query: 'KIGALI', caseSensitive: true });
      expect(results.every((r) => r.province_name === 'KIGALI')).toBe(true);
    });

    it('should limit results when limit is specified', () => {
      const results = rwandaLocation.search({ query: 'a', limit: 10 });
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should be case-insensitive by default', () => {
      const results = rwandaLocation.search({ query: 'kigali' });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getHierarchy', () => {
    it('should return complete hierarchy for a village', () => {
      const villages = rwandaLocation.getVillages();
      const firstVillage = villages[0];
      const hierarchy = rwandaLocation.getHierarchy(firstVillage.code);

      expect(hierarchy).toBeDefined();
      expect(hierarchy?.code).toBe(firstVillage.code);
      expect(hierarchy?.cellCode).toBeDefined();
      expect(hierarchy?.sectorCode).toBeDefined();
      expect(hierarchy?.districtCode).toBeDefined();
      expect(hierarchy?.provinceCode).toBeDefined();
    });

    it('should return null for invalid village code', () => {
      const hierarchy = rwandaLocation.getHierarchy(999999999);
      expect(hierarchy).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const stats = rwandaLocation.getStatistics();

      expect(stats.totalProvinces).toBe(5);
      expect(stats.totalDistricts).toBeGreaterThan(0);
      expect(stats.totalSectors).toBeGreaterThan(0);
      expect(stats.totalCells).toBeGreaterThan(0);
      expect(stats.totalVillages).toBeGreaterThan(0);
    });

    it('should have hierarchical consistency', () => {
      const stats = rwandaLocation.getStatistics();

      expect(stats.totalDistricts).toBeGreaterThan(stats.totalProvinces);
      expect(stats.totalSectors).toBeGreaterThan(stats.totalDistricts);
      expect(stats.totalCells).toBeGreaterThan(stats.totalSectors);
      expect(stats.totalVillages).toBeGreaterThan(stats.totalCells);
    });
  });

  describe('getFullPath', () => {
    it('should return complete path for a valid village', () => {
      const villages = rwandaLocation.getVillages();
      const firstVillage = villages[0];
      const path = rwandaLocation.getFullPath(firstVillage.code);

      expect(path.province).toBeDefined();
      expect(path.district).toBeDefined();
      expect(path.sector).toBeDefined();
      expect(path.cell).toBeDefined();
      expect(path.village).toBeDefined();

      expect(path.province?.code).toBe(firstVillage.provinceCode);
      expect(path.district?.code).toBe(firstVillage.districtCode);
      expect(path.sector?.code).toBe(firstVillage.sectorCode);
      expect(path.cell?.code).toBe(firstVillage.cellCode);
      expect(path.village?.code).toBe(firstVillage.code);
    });

    it('should return null values for invalid village code', () => {
      const path = rwandaLocation.getFullPath(999999999);
      expect(path.province).toBeNull();
      expect(path.district).toBeNull();
      expect(path.sector).toBeNull();
      expect(path.cell).toBeNull();
      expect(path.village).toBeNull();
    });
  });
});
