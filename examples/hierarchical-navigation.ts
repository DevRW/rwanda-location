/**
 * Hierarchical Navigation Example
 *
 * This example demonstrates the PRIMARY use case:
 * Province → District → Sector → Cell → Village → Full Info
 */

import { RwandaLocation } from '../src';

const rw = new RwandaLocation();

console.log('=== HIERARCHICAL NAVIGATION: Province → District → Sector → Cell → Village ===\n');

// STEP 1: Get all provinces (starting point)
console.log('STEP 1: Get all provinces');
const provinces = rw.getProvinces();
console.log('Available provinces:', provinces);
console.log(`Found ${provinces.length} provinces\n`);

// STEP 2: Select a province and get its districts
const selectedProvince = provinces[0]; // Let's select KIGALI (code: 1)
console.log(`STEP 2: Selected Province: ${selectedProvince.name} (code: ${selectedProvince.code})`);
const districts = rw.getDistricts(selectedProvince.code);
console.log(`Districts in ${selectedProvince.name}:`, districts);
console.log(`Found ${districts.length} districts\n`);

// STEP 3: Select a district and get its sectors
const selectedDistrict = districts[0];
console.log(`STEP 3: Selected District: ${selectedDistrict.name} (code: ${selectedDistrict.code})`);
const sectors = rw.getSectors(selectedDistrict.code);
console.log(`Sectors in ${selectedDistrict.name}:`, sectors.map(s => s.name));
console.log(`Found ${sectors.length} sectors\n`);

// STEP 4: Select a sector and get its cells
const selectedSector = sectors[0];
console.log(`STEP 4: Selected Sector: ${selectedSector.name} (code: ${selectedSector.code})`);
const cells = rw.getCells(selectedSector.code);
console.log(`Cells in ${selectedSector.name}:`, cells.map(c => c.name));
console.log(`Found ${cells.length} cells\n`);

// STEP 5: Select a cell and get its villages
const selectedCell = cells[0];
console.log(`STEP 5: Selected Cell: ${selectedCell.name} (code: ${selectedCell.code})`);
const villages = rw.getVillages(selectedCell.code);
console.log(`Villages in ${selectedCell.name}:`, villages.map(v => v.name));
console.log(`Found ${villages.length} villages\n`);

// STEP 6: Select a village and get FULL HIERARCHICAL INFO
const selectedVillage = villages[0];
console.log(`STEP 6: Selected Village: ${selectedVillage.name} (code: ${selectedVillage.code})`);
const fullInfo = rw.getVillageByCode(selectedVillage.code);
console.log('\n=== FULL HIERARCHICAL INFORMATION ===');
console.log(fullInfo);

console.log('\n=== FORMATTED ADDRESS ===');
if (fullInfo) {
  console.log(`Country: RWANDA`);
  console.log(`Province: ${fullInfo.provinceName} (${fullInfo.provinceCode})`);
  console.log(`District: ${fullInfo.districtName} (${fullInfo.districtCode})`);
  console.log(`Sector: ${fullInfo.sectorName} (${fullInfo.sectorCode})`);
  console.log(`Cell: ${fullInfo.cellName} (${fullInfo.cellCode})`);
  console.log(`Village: ${fullInfo.name} (${fullInfo.code})`);
}

// Alternative: Using getHierarchy method (same result)
console.log('\n=== USING getHierarchy() METHOD ===');
const hierarchy = rw.getHierarchy(selectedVillage.code);
console.log('Same result:', hierarchy);

// BONUS: Demonstrate the navigation path
console.log('\n=== NAVIGATION PATH ===');
console.log(`${selectedProvince.name} → ${selectedDistrict.name} → ${selectedSector.name} → ${selectedCell.name} → ${selectedVillage.name}`);
