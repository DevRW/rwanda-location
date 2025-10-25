import {
  normalizeString,
  matchesString,
  getUniqueByKey,
  sortByNumericKey,
  sortByStringKey,
  isValidProvinceCode,
  isValidDistrictCode,
  formatLocation,
  getParentLevel,
  getChildLevel,
} from '../lib/utils';
import { LocationData } from '../types';

describe('Utils', () => {
  describe('normalizeString', () => {
    it('should convert to lowercase', () => {
      expect(normalizeString('KIGALI')).toBe('kigali');
    });

    it('should trim whitespace', () => {
      expect(normalizeString('  KIGALI  ')).toBe('kigali');
    });

    it('should handle both lowercase and trim', () => {
      expect(normalizeString('  KiGaLi  ')).toBe('kigali');
    });
  });

  describe('matchesString', () => {
    it('should match identical strings', () => {
      expect(matchesString('KIGALI', 'KIGALI')).toBe(true);
    });

    it('should match case-insensitively', () => {
      expect(matchesString('KIGALI', 'kigali')).toBe(true);
      expect(matchesString('Kigali', 'KIGALI')).toBe(true);
    });

    it('should match with whitespace differences', () => {
      expect(matchesString('  KIGALI  ', 'KIGALI')).toBe(true);
    });

    it('should not match different strings', () => {
      expect(matchesString('KIGALI', 'SOUTH')).toBe(false);
    });
  });

  describe('getUniqueByKey', () => {
    it('should extract unique values', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' },
      ];
      const unique = getUniqueByKey(items, 'id');
      expect(unique).toEqual([1, 2]);
    });
  });

  describe('sortByNumericKey', () => {
    it('should sort by numeric key', () => {
      const items = [{ code: 3 }, { code: 1 }, { code: 2 }];
      const sorted = sortByNumericKey(items, 'code');
      expect(sorted.map((i) => i.code)).toEqual([1, 2, 3]);
    });
  });

  describe('sortByStringKey', () => {
    it('should sort by string key', () => {
      const items = [{ name: 'C' }, { name: 'A' }, { name: 'B' }];
      const sorted = sortByStringKey(items, 'name');
      expect(sorted.map((i) => i.name)).toEqual(['A', 'B', 'C']);
    });
  });

  describe('isValidProvinceCode', () => {
    it('should validate province codes', () => {
      expect(isValidProvinceCode(1)).toBe(true);
      expect(isValidProvinceCode(5)).toBe(true);
      expect(isValidProvinceCode(0)).toBe(false);
      expect(isValidProvinceCode(6)).toBe(false);
    });
  });

  describe('isValidDistrictCode', () => {
    it('should validate district codes', () => {
      expect(isValidDistrictCode(101)).toBe(true);
      expect(isValidDistrictCode(500)).toBe(true);
      expect(isValidDistrictCode(100)).toBe(false);
      expect(isValidDistrictCode(600)).toBe(false);
    });
  });

  describe('formatLocation', () => {
    it('should format location data', () => {
      const location: LocationData = {
        id: '1',
        country_code: 'RWA',
        country_name: 'RWANDA',
        province_code: 1,
        province_name: 'KIGALI',
        district_code: 101,
        district_name: 'Nyarugenge',
        sector_code: '010101',
        sector_name: 'Gitega',
        cell_code: 1010101,
        cell_name: 'Akabahizi',
        village_code: 101010102,
        village_name: 'Gihanga',
      };

      const formatted = formatLocation(location);
      expect(formatted).toBe('Gihanga, Akabahizi, Gitega, Nyarugenge, KIGALI');
    });
  });

  describe('getParentLevel', () => {
    it('should return correct parent levels', () => {
      expect(getParentLevel('village')).toBe('cell');
      expect(getParentLevel('cell')).toBe('sector');
      expect(getParentLevel('sector')).toBe('district');
      expect(getParentLevel('district')).toBe('province');
      expect(getParentLevel('province')).toBeNull();
    });
  });

  describe('getChildLevel', () => {
    it('should return correct child levels', () => {
      expect(getChildLevel('province')).toBe('district');
      expect(getChildLevel('district')).toBe('sector');
      expect(getChildLevel('sector')).toBe('cell');
      expect(getChildLevel('cell')).toBe('village');
      expect(getChildLevel('village')).toBeNull();
    });
  });
});
