import { LocationData } from '../types';

/**
 * Lowercases a string and trims whitespace from both ends. Inner whitespace is kept.
 *
 * Note that RwandaLocation's own name matching does not trim; this helper is for your code.
 *
 * @param str - The string to normalize. Anything else throws a `TypeError`.
 * @returns The normalized string
 *
 * @example
 * ```typescript
 * normalizeString('  KiGaLi  '); // 'kigali'
 * ```
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Checks whether two strings are equal once both are lowercased and trimmed (see
 * {@link normalizeString}). There is no Unicode normalization.
 *
 * @param a - First string
 * @param b - Second string
 * @returns `true` if the normalized strings are equal
 *
 * @example
 * ```typescript
 * matchesString(' KIGALI ', 'kigali'); // true
 * matchesString('a  b', 'a b'); // false
 * ```
 */
export function matchesString(a: string, b: string): boolean {
  return normalizeString(a) === normalizeString(b);
}

/**
 * Collects the distinct values of one key, in order of first appearance. Values are compared
 * like `Set` members, so objects are distinct unless they are the same object.
 *
 * @param items - The objects to read
 * @param key - The key to read from each object
 * @returns A new array of distinct values. `items` is not changed.
 *
 * @example
 * ```typescript
 * getUniqueByKey([{ id: 1 }, { id: 2 }, { id: 1 }], 'id'); // [1, 2]
 * ```
 */
export function getUniqueByKey<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return Array.from(new Set(items.map((item) => item[key])));
}

/**
 * Sorts objects by a numeric key, ascending, using `a[key] - b[key]`.
 *
 * **Sorts `items` in place** and returns the same array. Strings are converted to numbers by the
 * subtraction, and the order of `undefined` or `NaN` values is not defined.
 *
 * @param items - The array to sort
 * @param key - The key to sort by
 * @returns `items`, sorted
 *
 * @example
 * ```typescript
 * sortByNumericKey([{ code: 3 }, { code: 1 }, { code: 2 }], 'code'); // codes 1, 2, 3
 * ```
 */
export function sortByNumericKey<T>(items: T[], key: keyof T): T[] {
  return items.sort((a, b) => {
    const aVal = a[key] as unknown as number;
    const bVal = b[key] as unknown as number;
    return aVal - bVal;
  });
}

/**
 * Sorts objects by a key compared as text, using `String#localeCompare`, so the order follows
 * the runtime's locale rules rather than character codes.
 *
 * **Sorts `items` in place** and returns the same array. Values are converted with `String()`,
 * so numbers sort as text (`10` before `9`).
 *
 * @param items - The array to sort
 * @param key - The key to sort by
 * @returns `items`, sorted
 *
 * @example
 * ```typescript
 * sortByStringKey([{ name: 'C' }, { name: 'A' }, { name: 'B' }], 'name'); // A, B, C
 * ```
 */
export function sortByStringKey<T>(items: T[], key: keyof T): T[] {
  return items.sort((a, b) => {
    const aVal = String(a[key]);
    const bVal = String(b[key]);
    return aVal.localeCompare(bVal);
  });
}

/**
 * Checks that a value is in the province code range, `1 <= code <= 5`.
 *
 * This is a range check, not an existence check: values that JavaScript converts into the
 * range also pass, such as `1.5` or `'3'`. To check that a province exists, use
 * `rwandaLocation.getProvinceByCode(code) !== null`.
 *
 * @param code - The value to check
 * @returns `true` if `code >= 1 && code <= 5`
 */
export function isValidProvinceCode(code: number): boolean {
  return code >= 1 && code <= 5;
}

/**
 * Checks that a value is in the district code range, `101 <= code <= 599`.
 *
 * This is a range check, not an existence check: `150` passes although the only district codes
 * are 101-103, 201-208, 301-307, 401-405 and 501-507. To check that a district exists, use
 * `rwandaLocation.getDistrictByCode(code) !== null`.
 *
 * @param code - The value to check
 * @returns `true` if `code >= 101 && code <= 599`
 */
export function isValidDistrictCode(code: number): boolean {
  return code >= 101 && code <= 599;
}

/**
 * Formats a dataset row as `"village, cell, sector, district, province"`.
 *
 * It reads the snake_case fields of a `LocationData` row, as returned by `query()` and
 * `search()`. The camelCase `Village` objects returned by `getVillageByCode()` do not have those
 * fields, so in plain JavaScript they format as `'undefined, undefined, ...'`.
 *
 * @param location - A dataset row
 * @returns The formatted names
 *
 * @example
 * ```typescript
 * formatLocation(rwandaLocation.query({ villageCode: 101010102 })[0]);
 * // 'Gihanga, Akabahizi, Gitega, Nyarugenge, KIGALI'
 * ```
 */
export function formatLocation(location: LocationData): string {
  return `${location.village_name}, ${location.cell_name}, ${location.sector_name}, ${location.district_name}, ${location.province_name}`;
}

/**
 * Names the level above a given level: village → cell → sector → district → province.
 *
 * @param level - A level name, in lowercase
 * @returns The parent level's name, `null` for `'province'`, and `undefined` for any other
 *   value, including other casings (`'Village'`) and, since 1.2.0, inherited object keys such
 *   as `'__proto__'` or `'toString'`
 *
 * @example
 * ```typescript
 * getParentLevel('village'); // 'cell'
 * getParentLevel('province'); // null
 * ```
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

  return ownValue(hierarchy, level);
}

/**
 * Names the level below a given level: province → district → sector → cell → village.
 *
 * @param level - A level name, in lowercase
 * @returns The child level's name, `null` for `'village'`, and `undefined` for any other
 *   value, including other casings (`'Province'`) and, since 1.2.0, inherited object keys such
 *   as `'__proto__'` or `'toString'`
 *
 * @example
 * ```typescript
 * getChildLevel('province'); // 'district'
 * getChildLevel('village'); // null
 * ```
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

  return ownValue(hierarchy, level);
}

/**
 * `map[key]` if `key` is an own key of `map`, otherwise undefined, so inherited names such as
 * `'__proto__'` or `'toString'` are unknown like any other.
 */
function ownValue<T extends object>(map: T, key: keyof T): T[keyof T] {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : (undefined as T[keyof T]);
}
