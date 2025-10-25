import { RwandaLocation, rwandaLocation } from 'rwanda-location';

// Example 1: Using the default instance
console.log('=== Example 1: Get All Provinces ===');
const provinces = rwandaLocation.getProvinces();
console.log(provinces);

// Example 2: Get districts in Kigali
console.log('\n=== Example 2: Get Districts in Kigali ===');
const kigaliDistricts = rwandaLocation.getDistricts(1);
console.log(kigaliDistricts);

// Example 3: Search for locations
console.log('\n=== Example 3: Search for "Gitega" ===');
const searchResults = rwandaLocation.search({ query: 'Gitega', limit: 5 });
searchResults.forEach((location) => {
  console.log(
    `${location.village_name}, ${location.cell_name}, ${location.sector_name}, ${location.district_name}`
  );
});

// Example 4: Get complete hierarchy for a village
console.log('\n=== Example 4: Get Village Hierarchy ===');
const villages = rwandaLocation.getVillages();
if (villages.length > 0) {
  const firstVillage = villages[0];
  const hierarchy = rwandaLocation.getHierarchy(firstVillage.code);
  console.log('Complete hierarchy:', hierarchy);
}

// Example 5: Query with filters
console.log('\n=== Example 5: Query Locations in Kigali Province ===');
const kigaliLocations = rwandaLocation.query({ provinceCode: 1 });
console.log(`Found ${kigaliLocations.length} locations in Kigali`);

// Example 6: Get statistics
console.log('\n=== Example 6: Get Statistics ===');
const stats = rwandaLocation.getStatistics();
console.log(stats);

// Example 7: Using a new instance
console.log('\n=== Example 7: Using Custom Instance ===');
const customInstance = new RwandaLocation();
const province = customInstance.getProvinceByName('SOUTH');
console.log(province);
