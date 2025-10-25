/**
 * Performance benchmark tests
 */

import { RwandaLocation } from '../lib/RwandaLocation';

describe('Performance Tests', () => {
  let rw: RwandaLocation;

  beforeEach(() => {
    rw = new RwandaLocation();
  });

  describe('Initialization', () => {
    it('should initialize quickly', () => {
      const start = Date.now();
      const instance = new RwandaLocation();
      const end = Date.now();

      expect(instance).toBeDefined();
      expect(end - start).toBeLessThan(100); // Should be nearly instant
    });
  });

  describe('Query Performance', () => {
    it('should get all provinces quickly', () => {
      const start = Date.now();
      const provinces = rw.getProvinces();
      const end = Date.now();

      expect(provinces.length).toBe(5);
      expect(end - start).toBeLessThan(10); // < 10ms
    });

    it('should get all districts quickly', () => {
      const start = Date.now();
      const districts = rw.getDistricts();
      const end = Date.now();

      expect(districts.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(20); // < 20ms
    });

    it('should get all sectors quickly', () => {
      const start = Date.now();
      const sectors = rw.getSectors();
      const end = Date.now();

      expect(sectors.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(50); // < 50ms
    });

    it('should get all cells quickly', () => {
      const start = Date.now();
      const cells = rw.getCells();
      const end = Date.now();

      expect(cells.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // < 100ms
    });

    it('should get all villages in reasonable time', () => {
      const start = Date.now();
      const villages = rw.getVillages();
      const end = Date.now();

      expect(villages.length).toBeGreaterThan(10000);
      expect(end - start).toBeLessThan(200); // < 200ms for 14k+ records
    });
  });

  describe('Filtered Query Performance', () => {
    it('should filter districts by province quickly', () => {
      const start = Date.now();
      const districts = rw.getDistricts(1);
      const end = Date.now();

      expect(districts.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(20);
    });

    it('should filter sectors by district quickly', () => {
      const start = Date.now();
      const sectors = rw.getSectors(101);
      const end = Date.now();

      expect(sectors.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(50);
    });

    it('should filter cells by sector quickly', () => {
      const sectors = rw.getSectors();
      const sectorCode = sectors[0].code;

      const start = Date.now();
      const cells = rw.getCells(sectorCode);
      const end = Date.now();

      expect(cells.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });

    it('should filter villages by cell quickly', () => {
      const cells = rw.getCells();
      const cellCode = cells[0].code;

      const start = Date.now();
      const villages = rw.getVillages(cellCode);
      const end = Date.now();

      expect(villages.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Search Performance', () => {
    it('should perform unlimited search in reasonable time', () => {
      const start = Date.now();
      const results = rw.search({ query: 'a' }); // Common letter
      const end = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(200);
    });

    it('should perform limited search quickly', () => {
      const start = Date.now();
      const results = rw.search({ query: 'kigali', limit: 100 });
      const end = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(50);
    });

    it('should handle case-sensitive search efficiently', () => {
      const start = Date.now();
      const results = rw.search({ query: 'KIGALI', caseSensitive: true });
      const end = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Query Method Performance', () => {
    it('should filter by single criterion quickly', () => {
      const start = Date.now();
      const results = rw.query({ provinceCode: 1 });
      const end = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });

    it('should filter by multiple criteria quickly', () => {
      const start = Date.now();
      const results = rw.query({
        provinceCode: 1,
        districtCode: 101,
      });
      const end = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });

    it('should filter by name criteria quickly', () => {
      const start = Date.now();
      const results = rw.query({ provinceName: 'KIGALI' });
      const end = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Lookup Performance', () => {
    it('should lookup province by code quickly', () => {
      const start = Date.now();
      const province = rw.getProvinceByCode(1);
      const end = Date.now();

      expect(province).toBeDefined();
      expect(end - start).toBeLessThan(10);
    });

    it('should lookup district by code quickly', () => {
      const start = Date.now();
      const district = rw.getDistrictByCode(101);
      const end = Date.now();

      expect(district).toBeDefined();
      expect(end - start).toBeLessThan(10);
    });

    it('should lookup sector by code quickly', () => {
      const sectors = rw.getSectors();
      const sectorCode = sectors[0].code;

      const start = Date.now();
      const sector = rw.getSectorByCode(sectorCode);
      const end = Date.now();

      expect(sector).toBeDefined();
      expect(end - start).toBeLessThan(10);
    });

    it('should lookup cell by code quickly', () => {
      const cells = rw.getCells();
      const cellCode = cells[0].code;

      const start = Date.now();
      const cell = rw.getCellByCode(cellCode);
      const end = Date.now();

      expect(cell).toBeDefined();
      expect(end - start).toBeLessThan(10);
    });

    it('should lookup village by code quickly', () => {
      const villages = rw.getVillages();
      const villageCode = villages[0].code;

      const start = Date.now();
      const village = rw.getVillageByCode(villageCode);
      const end = Date.now();

      expect(village).toBeDefined();
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('Utility Method Performance', () => {
    it('should get statistics quickly', () => {
      const start = Date.now();
      const stats = rw.getStatistics();
      const end = Date.now();

      expect(stats.totalProvinces).toBe(5);
      expect(end - start).toBeLessThan(200); // Involves counting all levels
    });

    it('should get hierarchy quickly', () => {
      const villages = rw.getVillages();
      const villageCode = villages[0].code;

      const start = Date.now();
      const hierarchy = rw.getHierarchy(villageCode);
      const end = Date.now();

      expect(hierarchy).toBeDefined();
      expect(end - start).toBeLessThan(10);
    });

    it('should get full path quickly', () => {
      const villages = rw.getVillages();
      const villageCode = villages[0].code;

      const start = Date.now();
      const path = rw.getFullPath(villageCode);
      const end = Date.now();

      expect(path.province).toBeDefined();
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('Repeated Operations', () => {
    it('should handle repeated queries efficiently', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        rw.getProvinces();
      }

      const end = Date.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1); // Average < 1ms per query
    });

    it('should handle alternating queries efficiently', () => {
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        rw.getProvinces();
        rw.getDistricts(1);
        rw.getSectors(101);
      }

      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Should complete quickly
    });
  });

  describe('Memory Efficiency', () => {
    it('should reuse same data across multiple instances', () => {
      const instance1 = new RwandaLocation();
      const instance2 = new RwandaLocation();

      const provinces1 = instance1.getProvinces();
      const provinces2 = instance2.getProvinces();

      // Results should be equal
      expect(provinces1).toEqual(provinces2);
    });

    it('should not mutate original data', () => {
      const provinces1 = rw.getProvinces();
      const provinces2 = rw.getProvinces();

      // Verify both calls return the same data
      expect(provinces1).toEqual(provinces2);
      expect(provinces1.length).toBe(5);
      expect(provinces2.length).toBe(5);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty filters quickly', () => {
      const start = Date.now();
      const results = rw.query({});
      const end = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(200);
    });

    it('should handle non-matching filters quickly', () => {
      const start = Date.now();
      const results = rw.query({ provinceCode: 999 });
      const end = Date.now();

      expect(results).toEqual([]);
      expect(end - start).toBeLessThan(100);
    });

    it('should handle long search queries efficiently', () => {
      const longQuery = 'a'.repeat(1000);
      const start = Date.now();
      const results = rw.search({ query: longQuery });
      const end = Date.now();

      expect(Array.isArray(results)).toBe(true);
      expect(end - start).toBeLessThan(100);
    });
  });
});
