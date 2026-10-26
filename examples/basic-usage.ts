/**
 * Basic usage
 *
 * The shared instance, lookups by code and name, a search, a query and the statistics.
 * Run it in a project where @devrw/rwanda-location is installed.
 */

import { RwandaLocation, formatLocation, rwandaLocation } from '@devrw/rwanda-location';

// 1. The provinces, from the shared instance
console.log('=== Provinces ===');
console.log(rwandaLocation.getProvinces());

// 2. The districts of Kigali (province code 1)
console.log('\n=== Districts in Kigali ===');
console.log(rwandaLocation.getDistricts(1));

// 3. Search: the first rows where a province, district, sector, cell or village name contains
// "Gitega". Each row is one village.
console.log('\n=== First 5 rows matching "Gitega" ===');
for (const row of rwandaLocation.search({ query: 'Gitega', limit: 5 })) {
  console.log(formatLocation(row));
}

// 4. One village with its cell, sector, district and province
console.log('\n=== Village 101010102 ===');
console.log(rwandaLocation.getHierarchy(101010102));

// 5. Query with a filter: the village rows of Kigali province
console.log('\n=== Villages in Kigali province ===');
const kigaliRows = rwandaLocation.query({ provinceCode: 1 });
console.log(`Found ${kigaliRows.length} villages in Kigali`);

// 6. The number of divisions at each level
console.log('\n=== Statistics ===');
console.log(rwandaLocation.getStatistics());

// 7. Your own instance. It shares the data and the lookup tables with rwandaLocation.
console.log('\n=== Province named "south" ===');
const rw = new RwandaLocation();
console.log(rw.getProvinceByName('south'));
