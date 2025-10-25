import { LocationData } from '../types';

/**
 * Normalize a string for comparison (lowercase, trim whitespace)
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Check if two strings match (case-insensitive)
 */
export function matchesString(a: string, b: string): boolean {
  return normalizeString(a) === normalizeString(b);
}

/**
 * Extract unique values from an array of objects based on a key
 */
export function getUniqueByKey<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return Array.from(new Set(items.map((item) => item[key])));
}

/**
 * Sort items by a numeric key
 */
export function sortByNumericKey<T>(items: T[], key: keyof T): T[] {
  return items.sort((a, b) => {
    const aVal = a[key] as unknown as number;
    const bVal = b[key] as unknown as number;
    return aVal - bVal;
  });
}

/**
 * Sort items by a string key
 */
export function sortByStringKey<T>(items: T[], key: keyof T): T[] {
  return items.sort((a, b) => {
    const aVal = String(a[key]);
    const bVal = String(b[key]);
    return aVal.localeCompare(bVal);
  });
}

/**
 * Validate province code
 */
export function isValidProvinceCode(code: number): boolean {
  return code >= 1 && code <= 5;
}

/**
 * Validate district code
 */
export function isValidDistrictCode(code: number): boolean {
  return code >= 101 && code <= 599;
}

/**
 * Format location data for display
 */
export function formatLocation(location: LocationData): string {
  return `${location.village_name}, ${location.cell_name}, ${location.sector_name}, ${location.district_name}, ${location.province_name}`;
}

/**
 * Get parent location level name
 */
export function getParentLevel(
  level: 'province' | 'district' | 'sector' | 'cell' | 'village'
): string | null {
  const hierarchy = {
    village: 'cell',
    cell: 'sector',
    sector: 'district',
    district: 'province',
    province: null,
  };

  return hierarchy[level];
}

/**
 * Get child location level name
 */
export function getChildLevel(
  level: 'province' | 'district' | 'sector' | 'cell' | 'village'
): string | null {
  const hierarchy = {
    province: 'district',
    district: 'sector',
    sector: 'cell',
    cell: 'village',
    village: null,
  };

  return hierarchy[level];
}
