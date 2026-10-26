// FROZEN ORACLE - NEVER EDIT THIS FILE.
// Verbatim copy of dist/lib/utils.js from the published @devrw/rwanda-location@1.1.2 tarball.
// It is unchanged apart from this header.
// The differential tests compare the current implementation against it.

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeString = normalizeString;
exports.matchesString = matchesString;
exports.getUniqueByKey = getUniqueByKey;
exports.sortByNumericKey = sortByNumericKey;
exports.sortByStringKey = sortByStringKey;
exports.isValidProvinceCode = isValidProvinceCode;
exports.isValidDistrictCode = isValidDistrictCode;
exports.formatLocation = formatLocation;
exports.getParentLevel = getParentLevel;
exports.getChildLevel = getChildLevel;
/**
 * Normalize a string for comparison (lowercase, trim whitespace)
 */
function normalizeString(str) {
    return str.toLowerCase().trim();
}
/**
 * Check if two strings match (case-insensitive)
 */
function matchesString(a, b) {
    return normalizeString(a) === normalizeString(b);
}
/**
 * Extract unique values from an array of objects based on a key
 */
function getUniqueByKey(items, key) {
    return Array.from(new Set(items.map((item) => item[key])));
}
/**
 * Sort items by a numeric key
 */
function sortByNumericKey(items, key) {
    return items.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        return aVal - bVal;
    });
}
/**
 * Sort items by a string key
 */
function sortByStringKey(items, key) {
    return items.sort((a, b) => {
        const aVal = String(a[key]);
        const bVal = String(b[key]);
        return aVal.localeCompare(bVal);
    });
}
/**
 * Validate province code
 */
function isValidProvinceCode(code) {
    return code >= 1 && code <= 5;
}
/**
 * Validate district code
 */
function isValidDistrictCode(code) {
    return code >= 101 && code <= 599;
}
/**
 * Format location data for display
 */
function formatLocation(location) {
    return `${location.village_name}, ${location.cell_name}, ${location.sector_name}, ${location.district_name}, ${location.province_name}`;
}
/**
 * Get parent location level name
 */
function getParentLevel(level) {
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
function getChildLevel(level) {
    const hierarchy = {
        province: 'district',
        district: 'sector',
        sector: 'cell',
        cell: 'village',
        village: null,
    };
    return hierarchy[level];
}
//# sourceMappingURL=utils.js.map