/**
 * Large, repeated and mixed calls: the patterns the lookup tables are built for.
 *
 * This suite checks results only. Timings live in `npm run bench` (scripts/bench.cjs), because
 * wall-clock limits are unreliable under CPU load and coverage instrumentation.
 */

import { RwandaLocation } from '../lib/RwandaLocation';

describe('Performance-sensitive usage', () => {
  let rw: RwandaLocation;

  beforeEach(() => {
    rw = new RwandaLocation();
  });

  describe('Initialization', () => {
    it('creates instances that share the dataset', () => {
      const instance = new RwandaLocation();

      expect(instance).toBeInstanceOf(RwandaLocation);
      expect(Object.keys(instance)).toEqual(['data']);
      expect((instance as unknown as { data: unknown }).data).toBe(
        (rw as unknown as { data: unknown }).data
      );
    });
  });

  describe('Full lists', () => {
    it('returns all 5 provinces', () => {
      expect(rw.getProvinces()).toHaveLength(5);
    });

    it('returns all 30 districts', () => {
      expect(rw.getDistricts()).toHaveLength(30);
    });

    it('returns all 416 sectors', () => {
      expect(rw.getSectors()).toHaveLength(416);
    });

    it('returns all 2,148 cells', () => {
      expect(rw.getCells()).toHaveLength(2148);
    });

    it('returns all 14,842 villages, sorted by code', () => {
      const villages = rw.getVillages();

      expect(villages).toHaveLength(14842);
      expect(villages.every((v, i) => i === 0 || villages[i - 1].code < v.code)).toBe(true);
    });
  });

  describe('Filtered lists', () => {
    it('filters districts by province', () => {
      const districts = rw.getDistricts(1);

      expect(districts.map((d) => d.code)).toEqual([101, 102, 103]);
    });

    it('filters sectors by district', () => {
      const sectors = rw.getSectors(101);

      expect(sectors).toHaveLength(10);
      expect(sectors.every((s) => s.districtCode === 101)).toBe(true);
    });

    it('filters cells by sector', () => {
      const sectorCode = rw.getSectors()[0].code;
      const cells = rw.getCells(sectorCode);

      expect(cells).toHaveLength(6);
      expect(cells.every((c) => c.sectorCode === sectorCode)).toBe(true);
    });

    it('filters villages by cell', () => {
      const cellCode = rw.getCells()[0].code;
      const villages = rw.getVillages(cellCode);

      expect(villages).toHaveLength(12);
      expect(villages.every((v) => v.cellCode === cellCode)).toBe(true);
    });
  });

  describe('Search', () => {
    it('performs an unlimited search over every row', () => {
      expect(rw.search({ query: 'a' })).toHaveLength(14774);
    });

    it('stops a limited search at the limit', () => {
      const all = rw.search({ query: 'kigali' });
      const limited = rw.search({ query: 'kigali', limit: 100 });

      expect(all).toHaveLength(1182);
      expect(limited).toEqual(all.slice(0, 100));
    });

    it('handles a case-sensitive search', () => {
      const results = rw.search({ query: 'KIGALI', caseSensitive: true });

      expect(results).toHaveLength(1176);
      expect(results.every((r) => r.province_name === 'KIGALI')).toBe(true);
    });
  });

  describe('Query', () => {
    it('filters by a single criterion', () => {
      const results = rw.query({ provinceCode: 1 });

      expect(results).toHaveLength(1176);
      expect(results.every((r) => r.province_code === 1)).toBe(true);
    });

    it('filters by multiple criteria', () => {
      const results = rw.query({ provinceCode: 1, districtCode: 101 });

      expect(results).toHaveLength(355);
      expect(results.every((r) => r.province_code === 1 && r.district_code === 101)).toBe(true);
    });

    it('filters by name criteria', () => {
      const results = rw.query({ provinceName: 'KIGALI' });

      expect(results).toHaveLength(1176);
      expect(results.every((r) => r.province_name === 'KIGALI')).toBe(true);
    });
  });

  describe('Lookups', () => {
    it('looks up a province by code', () => {
      expect(rw.getProvinceByCode(1)).toEqual({ code: 1, name: 'KIGALI' });
    });

    it('looks up a district by code', () => {
      expect(rw.getDistrictByCode(101)).toEqual({
        code: 101,
        name: 'Nyarugenge',
        provinceCode: 1,
        provinceName: 'KIGALI',
      });
    });

    it('looks up a sector by code', () => {
      const sectorCode = rw.getSectors()[0].code;

      expect(rw.getSectorByCode(sectorCode)?.code).toBe(sectorCode);
    });

    it('looks up a cell by code', () => {
      const cellCode = rw.getCells()[0].code;

      expect(rw.getCellByCode(cellCode)?.code).toBe(cellCode);
    });

    it('looks up every village by code', () => {
      const villages = rw.getVillages();
      const found = villages.filter((v) => rw.getVillageByCode(v.code)?.name === v.name);

      expect(found).toHaveLength(villages.length);
    });

    it('returns null for 1,000 codes that do not exist', () => {
      const missing = Array.from({ length: 1000 }, (_, i) => 900000000 + i);

      expect(missing.filter((code) => rw.getVillageByCode(code) !== null)).toEqual([]);
    });
  });

  describe('Utility methods', () => {
    it('gets statistics', () => {
      expect(rw.getStatistics()).toEqual({
        totalProvinces: 5,
        totalDistricts: 30,
        totalSectors: 416,
        totalCells: 2148,
        totalVillages: 14842,
      });
    });

    it('gets the hierarchy of a village', () => {
      const villageCode = rw.getVillages()[0].code;

      expect(rw.getHierarchy(villageCode)?.code).toBe(villageCode);
    });

    it('gets the full path of a village', () => {
      const villageCode = rw.getVillages()[0].code;
      const path = rw.getFullPath(villageCode);

      expect(path.province).toEqual({ code: 1, name: 'KIGALI' });
      expect(path.village?.code).toBe(villageCode);
    });
  });

  describe('Repeated operations', () => {
    it('returns the same results for 1,000 repeated calls', () => {
      const first = rw.getProvinces();

      for (let i = 0; i < 1000; i++) {
        expect(rw.getProvinces()).toEqual(first);
      }
    });

    it('returns the same results for alternating calls', () => {
      const expected = [rw.getProvinces(), rw.getDistricts(1), rw.getSectors(101)];

      for (let i = 0; i < 100; i++) {
        expect([rw.getProvinces(), rw.getDistricts(1), rw.getSectors(101)]).toEqual(expected);
      }
    });

    it('walks every province, district, sector and cell like a cascading form', () => {
      let villages = 0;

      for (const province of rw.getProvinces()) {
        for (const district of rw.getDistricts(province.code)) {
          for (const sector of rw.getSectors(district.code)) {
            for (const cell of rw.getCells(sector.code)) {
              villages += rw.getVillages(cell.code).length;
            }
          }
        }
      }
      expect(villages).toBe(14842);
    });
  });

  describe('Memory efficiency', () => {
    it('gives equal results from separate instances', () => {
      const instance1 = new RwandaLocation();
      const instance2 = new RwandaLocation();

      expect(instance1.getProvinces()).toEqual(instance2.getProvinces());
      expect(instance1.query({ villageCode: 101010102 })[0]).toBe(
        instance2.query({ villageCode: 101010102 })[0]
      );
    });

    it('returns new objects that callers may change', () => {
      const provinces1 = rw.getProvinces();
      provinces1[0].name = 'CHANGED';
      provinces1.pop();

      const provinces2 = rw.getProvinces();
      expect(provinces2).toHaveLength(5);
      expect(provinces2[0].name).toBe('KIGALI');
    });
  });

  describe('Edge cases', () => {
    it('returns every row for empty filters', () => {
      expect(rw.query({})).toHaveLength(14842);
    });

    it('returns nothing for non-matching filters', () => {
      expect(rw.query({ provinceCode: 999 })).toEqual([]);
    });

    it('returns nothing for a very long search query', () => {
      expect(rw.search({ query: 'a'.repeat(1000) })).toEqual([]);
    });
  });
});
