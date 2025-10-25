# Rwanda Location 🇷🇼

A simple, powerful TypeScript library for working with Rwanda's administrative divisions. Get information about provinces, districts, sectors, cells, and villages with ease!

[![npm version](https://img.shields.io/npm/v/@devrw/rwanda-location.svg)](https://www.npmjs.com/package/@devrw/rwanda-location)
[![License](https://img.shields.io/npm/l/@devrw/rwanda-location.svg)](https://github.com/DevRW/rwanda-location/blob/develop/LICENSE)
[![Security](https://img.shields.io/badge/security-0%20vulnerabilities-brightgreen)](https://www.npmjs.com/package/@devrw/rwanda-location)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](./package.json)

## Why Use This Library?

Perfect for building:

- 📝 Address forms with cascading dropdowns
- 🗺️ Location-based applications
- 📊 Geographic data analysis
- 🏢 Administrative management systems
- 📱 Mobile apps needing Rwanda location data

## Features

- ✅ **Complete Data** - All 5 provinces, 30 districts, 416 sectors, 2,148 cells, and 14,837 villages
- ✅ **Easy to Use** - Simple, intuitive API
- ✅ **Zero Dependencies** - Lightweight and fast
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Well Tested** - 98%+ test coverage (109 tests)
- ✅ **Secure** - Zero vulnerabilities, security audited
- ✅ **Production Ready** - Used in real-world applications

## Installation

```bash
npm install @devrw/rwanda-location
```

or with yarn:

```bash
yarn add @devrw/rwanda-location
```

## Quick Start

```typescript
import { rwandaLocation } from '@devrw/rwanda-location';

// Get all provinces
const provinces = rwandaLocation.getProvinces();
console.log(provinces);
// [
//   { code: 1, name: 'KIGALI' },
//   { code: 2, name: 'SOUTH' },
//   { code: 3, name: 'WEST' },
//   { code: 4, name: 'NORTH' },
//   { code: 5, name: 'EAST' }
// ]

// Get districts in a province
const kigaliDistricts = rwandaLocation.getDistricts(1);
console.log(kigaliDistricts);
// [
//   { code: 101, name: 'Nyarugenge', provinceCode: 1, provinceName: 'KIGALI' },
//   { code: 102, name: 'Gasabo', provinceCode: 1, provinceName: 'KIGALI' },
//   { code: 103, name: 'Kicukiro', provinceCode: 1, provinceName: 'KIGALI' }
// ]
```

## Common Use Cases

### 1. Building a Cascading Address Form

This is the most common use case - building address forms where each dropdown depends on the previous selection:

```typescript
import { RwandaLocation } from '@devrw/rwanda-location';

const rw = new RwandaLocation();

// Step 1: User selects a province
const provinces = rw.getProvinces();
// Show provinces in dropdown

// Step 2: When province is selected, load its districts
const selectedProvinceCode = 1; // User selected KIGALI
const districts = rw.getDistricts(selectedProvinceCode);
// Show districts in next dropdown

// Step 3: When district is selected, load its sectors
const selectedDistrictCode = 101; // User selected Nyarugenge
const sectors = rw.getSectors(selectedDistrictCode);
// Show sectors in next dropdown

// Step 4: When sector is selected, load its cells
const selectedSectorCode = '010101'; // User selected Gitega
const cells = rw.getCells(selectedSectorCode);
// Show cells in next dropdown

// Step 5: When cell is selected, load its villages
const selectedCellCode = 1010101; // User selected Akabahizi
const villages = rw.getVillages(selectedCellCode);
// Show villages in final dropdown

// Step 6: Get complete information
const selectedVillageCode = 101010102;
const fullInfo = rw.getVillageByCode(selectedVillageCode);
console.log(fullInfo);
// {
//   code: 101010102,
//   name: 'Gihanga',
//   cellCode: 1010101,
//   cellName: 'Akabahizi',
//   sectorCode: '010101',
//   sectorName: 'Gitega',
//   districtCode: 101,
//   districtName: 'Nyarugenge',
//   provinceCode: 1,
//   provinceName: 'KIGALI'
// }
```

### 2. Searching for Locations

Search across all administrative levels:

```typescript
// Search for locations containing "Kigali"
const results = rw.search({ query: 'Kigali', limit: 10 });

results.forEach((location) => {
  console.log(`${location.village_name}, ${location.sector_name}, ${location.district_name}`);
});
```

### 3. Finding Specific Locations

```typescript
// Find a province by name
const province = rw.getProvinceByName('KIGALI');

// Find a district by code
const district = rw.getDistrictByCode(101);

// Get all sectors in a district
const sectors = rw.getSectors(101);

// Get complete hierarchy for a village
const village = rw.getVillageByCode(101010102);
```

### 4. Querying with Filters

```typescript
// Find all locations in a specific area
const locations = rw.query({
  provinceCode: 1,
  districtCode: 101,
  sectorName: 'Gitega',
});

// Query by names (case-insensitive)
const byName = rw.query({ provinceName: 'kigali' });
```

## Complete API Reference

### Province Methods

#### `getProvinces()`

Get all 5 provinces in Rwanda.

```typescript
const provinces = rw.getProvinces();
// Returns: Province[]
```

#### `getProvinceByCode(code: number)`

Get a specific province by its code (1-5).

```typescript
const kigali = rw.getProvinceByCode(1);
// Returns: Province | null
```

#### `getProvinceByName(name: string)`

Get a province by name (case-insensitive).

```typescript
const south = rw.getProvinceByName('south');
// Returns: Province | null
```

### District Methods

#### `getDistricts(provinceCode?: number)`

Get all districts, or filter by province.

```typescript
// All districts
const allDistricts = rw.getDistricts();

// Districts in specific province
const kigaliDistricts = rw.getDistricts(1);
// Returns: District[]
```

#### `getDistrictByCode(code: number)`

Get a specific district by its code.

```typescript
const nyarugenge = rw.getDistrictByCode(101);
// Returns: District | null
```

### Sector Methods

#### `getSectors(districtCode?: number, provinceCode?: number)`

Get all sectors, or filter by district/province.

```typescript
// All sectors
const allSectors = rw.getSectors();

// Sectors in a district
const districtSectors = rw.getSectors(101);

// Sectors in a province
const provinceSectors = rw.getSectors(undefined, 1);
// Returns: Sector[]
```

#### `getSectorByCode(code: string)`

Get a specific sector by its code.

```typescript
const sector = rw.getSectorByCode('010101');
// Returns: Sector | null
```

### Cell Methods

#### `getCells(sectorCode?: string, districtCode?: number, provinceCode?: number)`

Get all cells, or filter by sector/district/province.

```typescript
// All cells
const allCells = rw.getCells();

// Cells in a sector
const sectorCells = rw.getCells('010101');

// Cells in a district
const districtCells = rw.getCells(undefined, 101);
// Returns: Cell[]
```

#### `getCellByCode(code: number)`

Get a specific cell by its code.

```typescript
const cell = rw.getCellByCode(1010101);
// Returns: Cell | null
```

### Village Methods

#### `getVillages(cellCode?: number, sectorCode?: string, districtCode?: number, provinceCode?: number)`

Get all villages, or filter by cell/sector/district/province.

```typescript
// All villages
const allVillages = rw.getVillages();

// Villages in a cell
const cellVillages = rw.getVillages(1010101);

// Villages in a sector
const sectorVillages = rw.getVillages(undefined, '010101');
// Returns: Village[]
```

#### `getVillageByCode(code: number)`

Get a specific village with its complete hierarchy.

```typescript
const village = rw.getVillageByCode(101010102);
// Returns: Village | null
// Village includes: province, district, sector, cell, and village info
```

### Search & Query Methods

#### `search(options: SearchOptions)`

Search for locations by name across all levels.

```typescript
// Basic search
const results = rw.search({ query: 'Kigali' });

// Case-sensitive search
const exactResults = rw.search({
  query: 'KIGALI',
  caseSensitive: true,
});

// Limited results
const topResults = rw.search({
  query: 'gitega',
  limit: 10,
});
// Returns: LocationData[]
```

#### `query(filter: QueryFilter)`

Query locations with multiple filters.

```typescript
const filtered = rw.query({
  provinceCode: 1,
  districtCode: 101,
  sectorName: 'Gitega',
});
// Returns: LocationData[]
```

### Utility Methods

#### `getStatistics()`

Get counts of all administrative divisions.

```typescript
const stats = rw.getStatistics();
// Returns:
// {
//   totalProvinces: 5,
//   totalDistricts: 30,
//   totalSectors: 416,
//   totalCells: 2148,
//   totalVillages: 14837
// }
```

#### `getHierarchy(villageCode: number)`

Get complete hierarchy for a village (alias for `getVillageByCode`).

```typescript
const hierarchy = rw.getHierarchy(101010102);
// Returns: Village | null
```

#### `getFullPath(villageCode: number)`

Get structured path for breadcrumb navigation.

```typescript
const path = rw.getFullPath(101010102);
// Returns:
// {
//   province: { code: 1, name: 'KIGALI' },
//   district: { code: 101, name: 'Nyarugenge', ... },
//   sector: { code: '010101', name: 'Gitega', ... },
//   cell: { code: 1010101, name: 'Akabahizi', ... },
//   village: { code: 101010102, name: 'Gihanga', ... }
// }
```

## TypeScript Types

```typescript
interface Province {
  code: number; // 1-5
  name: string; // 'KIGALI', 'SOUTH', 'WEST', 'NORTH', 'EAST'
}

interface District {
  code: number;
  name: string;
  provinceCode: number;
  provinceName: string;
}

interface Sector {
  code: string;
  name: string;
  districtCode: number;
  districtName: string;
  provinceCode: number;
  provinceName: string;
}

interface Cell {
  code: number;
  name: string;
  sectorCode: string;
  sectorName: string;
  districtCode: number;
  districtName: string;
  provinceCode: number;
  provinceName: string;
}

interface Village {
  code: number;
  name: string;
  cellCode: number;
  cellName: string;
  sectorCode: string;
  sectorName: string;
  districtCode: number;
  districtName: string;
  provinceCode: number;
  provinceName: string;
}
```

## Province Codes Reference

| Code | Province Name |
| ---- | ------------- |
| 1    | KIGALI        |
| 2    | SOUTH         |
| 3    | WEST          |
| 4    | NORTH         |
| 5    | EAST          |

## Administrative Structure

Rwanda's administrative hierarchy:

```
Country (Rwanda)
  └── Province (5)
      └── District (30)
          └── Sector (416)
              └── Cell (2,148)
                  └── Village (14,837)
```

## Real-World Examples

### React Example - Address Form

```typescript
import React, { useState } from 'react';
import { rwandaLocation } from '@devrw/rwanda-location';

function AddressForm() {
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);

  const provinces = rwandaLocation.getProvinces();

  const handleProvinceChange = (provinceCode) => {
    setSelectedProvince(provinceCode);
    setDistricts(rwandaLocation.getDistricts(parseInt(provinceCode)));
    setSelectedDistrict('');
  };

  return (
    <div>
      <select onChange={(e) => handleProvinceChange(e.target.value)}>
        <option value="">Select Province</option>
        {provinces.map(p => (
          <option key={p.code} value={p.code}>{p.name}</option>
        ))}
      </select>

      {selectedProvince && (
        <select onChange={(e) => setSelectedDistrict(e.target.value)}>
          <option value="">Select District</option>
          {districts.map(d => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
```

### Node.js Example - API Endpoint

```javascript
const express = require('express');
const { rwandaLocation } = require('@devrw/rwanda-location');

const app = express();

app.get('/api/provinces', (req, res) => {
  const provinces = rwandaLocation.getProvinces();
  res.json(provinces);
});

app.get('/api/districts/:provinceCode', (req, res) => {
  const districts = rwandaLocation.getDistricts(parseInt(req.params.provinceCode));
  res.json(districts);
});

app.listen(3000);
```

### Validation Example

```typescript
function validateAddress(data: { provinceCode: number; districtCode: number; sectorCode: string }) {
  // Check province exists
  const province = rw.getProvinceByCode(data.provinceCode);
  if (!province) {
    return { valid: false, error: 'Invalid province' };
  }

  // Check district exists and belongs to province
  const district = rw.getDistrictByCode(data.districtCode);
  if (!district || district.provinceCode !== data.provinceCode) {
    return { valid: false, error: 'Invalid district for this province' };
  }

  // Check sector exists and belongs to district
  const sector = rw.getSectorByCode(data.sectorCode);
  if (!sector || sector.districtCode !== data.districtCode) {
    return { valid: false, error: 'Invalid sector for this district' };
  }

  return { valid: true };
}
```

## Troubleshooting

### Common Issues

**Q: Getting `null` or empty results?**

A: Make sure you're using valid codes. Province codes are 1-5, district codes start from 101, etc.

```typescript
// ❌ Wrong
const districts = rw.getDistricts(999); // Returns []

// ✅ Correct
const districts = rw.getDistricts(1); // Returns Kigali districts
```

**Q: TypeScript errors?**

A: Ensure you have TypeScript installed and configured:

```bash
npm install --save-dev typescript @types/node
```

**Q: Import errors?**

A: Use the correct import syntax:

```typescript
// ES6
import { rwandaLocation, RwandaLocation } from '@devrw/rwanda-location';

// CommonJS
const { rwandaLocation } = require('@devrw/rwanda-location');
```

### Best Practices

1. **Reuse instances** - Create one instance and reuse it:

```typescript
// ✅ Good
import { rwandaLocation } from '@devrw/rwanda-location';
const provinces = rwandaLocation.getProvinces();

// ❌ Less efficient
import { RwandaLocation } from '@devrw/rwanda-location';
const rw1 = new RwandaLocation();
const rw2 = new RwandaLocation();
```

2. **Check for null** - Always validate results:

```typescript
const province = rw.getProvinceByCode(userInput);
if (!province) {
  console.error('Province not found');
  return;
}
// Use province safely
```

3. **Use TypeScript** - Get full type safety:

```typescript
import { RwandaLocation, Province } from '@devrw/rwanda-location';
const rw = new RwandaLocation();
const provinces: Province[] = rw.getProvinces();
```

## Performance

The library is optimized for speed:

| Operation           | Time    | Records  |
| ------------------- | ------- | -------- |
| Get all provinces   | < 1ms   | 5        |
| Get all districts   | < 5ms   | 30       |
| Get all sectors     | < 20ms  | 416      |
| Get all cells       | < 50ms  | 2,148    |
| Get all villages    | < 100ms | 14,837   |
| Search (with limit) | < 10ms  | Variable |

- ⚡ Zero dependencies - Fast installation
- 📦 Lightweight - ~7MB (mostly location data)
- 🚀 Efficient - Uses Maps for O(1) lookups
- 💾 Memory efficient - Data loaded once

## Security

This package is secure and production-ready:

- ✅ **Zero vulnerabilities** - Regularly audited with `npm audit`
- ✅ **Zero runtime dependencies** - No third-party code
- ✅ **No code execution** - Pure data access only
- ✅ **Type-safe** - TypeScript strict mode
- ✅ **Well tested** - 98%+ code coverage

**Security Contact**: info@jnkindilogs.xyz

## Browser Support

Works in all modern browsers and Node.js:

- ✅ Node.js >= 14.0.0
- ✅ Chrome, Firefox, Safari, Edge (latest versions)
- ✅ React, Vue, Angular applications
- ✅ Next.js, Nuxt.js applications

## Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Lint code
npm run lint
```

## Changelog

### 1.1.1 (Latest)

- 📄 License: Changed from Apache-2.0 to MIT license for better compatibility
- 📦 Package: Updated package metadata

### 1.1.0

- 🔒 Security: Fixed all vulnerabilities (0 vulnerabilities)
- ✅ Testing: Enhanced test coverage to 98%+
- 📚 Documentation: Comprehensive documentation
- 🔧 Improvements: Better TypeScript types
- 🎯 Performance: Optimized query performance
- 📦 Package: Improved package structure

### 1.0.0

- 🎉 Initial release
- ✨ Complete Rwanda location data
- 📖 Basic documentation

## Support

Need help? We're here for you:

- 📧 Email: info@jnkindilogs.xyz
- 🐛 Issues: [GitHub Issues](https://github.com/DevRW/rwanda-location/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/DevRW/rwanda-location/discussions)

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Authors

- Jacques Nyilinkindi - [info@jnkindilogs.xyz](mailto:info@jnkindilogs.xyz)
- Theo Okafor - [theo.okafor@yahoo.com](mailto:theo.okafor@yahoo.com)

## Acknowledgments

Thanks to everyone who contributed to this project and to the Rwanda government for the official administrative data.

---

**Made with ❤️ for Rwanda** 🇷🇼

Star us on [GitHub](https://github.com/DevRW/rwanda-location) if you find this useful!
