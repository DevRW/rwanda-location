# Rwanda Location

Look up Rwanda's administrative divisions (provinces, districts, sectors, cells and villages) by
code or by name. The data ships with the package, so lookups need no network access and no
database.

[![npm version](https://img.shields.io/npm/v/@devrw/rwanda-location.svg)](https://www.npmjs.com/package/@devrw/rwanda-location)
[![CI](https://github.com/DevRW/rwanda-location/actions/workflows/ci.yml/badge.svg)](https://github.com/DevRW/rwanda-location/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@devrw/rwanda-location.svg)](https://github.com/DevRW/rwanda-location/blob/main/LICENSE)

- 5 provinces, 30 districts, 416 sectors, 2,148 cells and 14,842 villages, with their codes. See
  [Data](#data).
- Lists filtered by parent, lookups by code or name, the full path of a village, and name search.
- TypeScript types included.
- Zero runtime dependencies. Runs on Node.js 14 and later.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Importing](#importing)
- [Examples](#examples)
- [API reference](#api-reference)
- [Utility functions](#utility-functions)
- [Exports and types](#exports-and-types)
- [Behavior notes](#behavior-notes)
- [Data](#data)
- [Performance](#performance)
- [Package size](#package-size)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install @devrw/rwanda-location
```

or

```bash
yarn add @devrw/rwanda-location
```

## Quick start

```ts
import { rwandaLocation } from '@devrw/rwanda-location';

const provinces = rwandaLocation.getProvinces();
console.log(provinces);
// [
//   { code: 1, name: 'KIGALI' },
//   { code: 2, name: 'SOUTH' },
//   { code: 3, name: 'WEST' },
//   { code: 4, name: 'NORTH' },
//   { code: 5, name: 'EAST' }
// ]

const districts = rwandaLocation.getDistricts(1);
console.log(districts);
// [
//   { code: 101, name: 'Nyarugenge', provinceCode: 1, provinceName: 'KIGALI' },
//   { code: 102, name: 'Gasabo', provinceCode: 1, provinceName: 'KIGALI' },
//   { code: 103, name: 'Kicukiro', provinceCode: 1, provinceName: 'KIGALI' }
// ]
```

`rwandaLocation` is a ready-made instance of the `RwandaLocation` class. You can also create your
own with `new RwandaLocation()`. Creating an instance is cheap: all instances share the same data
and the same lookup tables.

## Importing

The package is CommonJS and includes TypeScript declarations.

CommonJS:

```js
const { RwandaLocation, rwandaLocation } = require('@devrw/rwanda-location');
```

TypeScript and bundlers:

```ts
import { RwandaLocation, rwandaLocation, Village } from '@devrw/rwanda-location';
```

Node.js ES modules (`.mjs` files, or a package with `"type": "module"`):

```js
import { RwandaLocation, rwandaLocation } from '@devrw/rwanda-location';
```

Use named imports in Node.js ES modules. There, the default import
(`import pkg from '@devrw/rwanda-location'`) is the whole module object, not the class:
`pkg.rwandaLocation` works, but `new pkg()` throws a `TypeError`. In TypeScript compiled to
CommonJS, the default import is the `RwandaLocation` class. Named imports behave the same
everywhere.

Only the package root is a supported entry point. Files under `dist/`, such as
`dist/db/locations.json` or `dist/lib/internal/`, are not part of the API and can change in any
release.

## Examples

### Cascading address form

Each list depends on the choice made in the one before it.

```ts
import { RwandaLocation } from '@devrw/rwanda-location';

const rw = new RwandaLocation();

// 1. Show the provinces.
const provinces = rw.getProvinces();
provinces.length; // 5

// 2. The user picks KIGALI (code 1). Show its districts.
const districts = rw.getDistricts(1);
districts.map((district) => district.name); // ['Nyarugenge', 'Gasabo', 'Kicukiro']

// 3. The user picks Nyarugenge (101). Show its sectors.
const sectors = rw.getSectors(101);
sectors.length; // 10

// 4. The user picks Gitega. Sector codes are 6-character strings.
const cells = rw.getCells('010101');
cells.map((cell) => cell.name); // ['Akabahizi', 'Akabeza', 'Gacyamo', 'Kigarama', 'Kinyange', 'Kora']

// 5. The user picks Akabahizi (1010101). Show its villages.
const villages = rw.getVillages(1010101);
villages.length; // 12

// 6. The user picks Gihanga (101010102). Get the whole address.
const address = rw.getVillageByCode(101010102);
console.log(address);
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

### Checking stored codes

A village code identifies the whole path, so one lookup checks that a stored address is
consistent.

```ts
import { rwandaLocation } from '@devrw/rwanda-location';

interface AddressCodes {
  provinceCode: number;
  districtCode: number;
  sectorCode: string;
  cellCode: number;
  villageCode: number;
}

function isValidAddress(address: AddressCodes): boolean {
  const village = rwandaLocation.getVillageByCode(address.villageCode);
  return (
    village !== null &&
    village.cellCode === address.cellCode &&
    village.sectorCode === address.sectorCode &&
    village.districtCode === address.districtCode &&
    village.provinceCode === address.provinceCode
  );
}

const stored = {
  provinceCode: 1,
  districtCode: 101,
  sectorCode: '010101',
  cellCode: 1010101,
  villageCode: 101010102,
};
isValidAddress(stored); // true
isValidAddress({ ...stored, provinceCode: 2 }); // false
isValidAddress({ ...stored, villageCode: 999999999 }); // false
```

### React

A form with two dependent dropdowns. The district list is computed from the selected province on
each render, which is cheap.

```tsx
import { useState } from 'react';
import { rwandaLocation } from '@devrw/rwanda-location';

const provinces = rwandaLocation.getProvinces();

export function AddressForm() {
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [districtCode, setDistrictCode] = useState<number | null>(null);
  const districts = provinceCode ? rwandaLocation.getDistricts(provinceCode) : [];

  return (
    <div>
      <select
        value={provinceCode ?? ''}
        onChange={(event) => {
          setProvinceCode(event.target.value ? Number(event.target.value) : null);
          setDistrictCode(null);
        }}
      >
        <option value="">Select a province</option>
        {provinces.map((province) => (
          <option key={province.code} value={province.code}>
            {province.name}
          </option>
        ))}
      </select>

      {provinceCode !== null && (
        <select
          value={districtCode ?? ''}
          onChange={(event) =>
            setDistrictCode(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Select a district</option>
          {districts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

### Express

Check codes that come from a request before you use them as filters. `getDistricts(NaN)` and
`getDistricts(0)` return all 30 districts (see [Behavior notes](#behavior-notes)).

```js
const express = require('express');
const { rwandaLocation } = require('@devrw/rwanda-location');

const app = express();

app.get('/api/provinces', (req, res) => {
  res.json(rwandaLocation.getProvinces());
});

app.get('/api/provinces/:code/districts', (req, res) => {
  const code = Number(req.params.code);
  if (!rwandaLocation.getProvinceByCode(code)) {
    return res.status(404).json({ error: 'Unknown province code' });
  }
  return res.json(rwandaLocation.getDistricts(code));
});

app.listen(3000);
```

More examples are in the [examples](examples) folder.

## API reference

The snippets from here on use an instance called `rw`:

```ts
import { RwandaLocation } from '@devrw/rwanda-location';

const rw = new RwandaLocation(); // or use the shared instance, rwandaLocation
```

| Method                                                              | Returns                        |
| ------------------------------------------------------------------- | ------------------------------ |
| `getProvinces()`                                                    | `Province[]`                   |
| `getProvinceByCode(code)`                                           | `Province \| null`             |
| `getProvinceByName(name)`                                           | `Province \| null`             |
| `getDistricts(provinceCode?)`                                       | `District[]`                   |
| `getDistrictByCode(code)`                                           | `District \| null`             |
| `getSectors(districtCode?, provinceCode?)`                          | `Sector[]`                     |
| `getSectorByCode(code)`                                             | `Sector \| null`               |
| `getCells(sectorCode?, districtCode?, provinceCode?)`               | `Cell[]`                       |
| `getCellByCode(code)`                                               | `Cell \| null`                 |
| `getVillages(cellCode?, sectorCode?, districtCode?, provinceCode?)` | `Village[]`                    |
| `getVillageByCode(code)`                                            | `Village \| null`              |
| `getHierarchy(villageCode)`                                         | `Village \| null`              |
| `getFullPath(villageCode)`                                          | `FullPath`                     |
| `getStatistics()`                                                   | `Statistics`                   |
| `query(filter)`                                                     | `LocationData[]` (shared rows) |
| `search(options)`                                                   | `LocationData[]` (shared rows) |

Rules that apply to every method:

- Sector codes are 6-character strings such as `'010101'`. All other codes are numbers. Codes are
  compared with `===`, so `'101'` does not match district `101`.
- The list methods (`getProvinces()` to `getVillages()`) return new objects, sorted by code.
  Filters are combined with AND. A falsy filter (`0`, `NaN`, `''`, `null`, `undefined`) means
  "no filter".
- The `ByCode` and `ByName` methods return a new object, or `null` when nothing matches.
- `query()` and `search()` return the dataset rows themselves, in data-file order. Treat them as
  read-only.

### Provinces

`getProvinces()` lists the 5 provinces, sorted by code. `getProvinceByCode(code)` takes a number
from 1 to 5. `getProvinceByName(name)` ignores case but does not trim, and only knows the short
names `KIGALI`, `SOUTH`, `WEST`, `NORTH` and `EAST`.

```ts
rw.getProvinceByCode(1); // { code: 1, name: 'KIGALI' }
rw.getProvinceByCode(999); // null
rw.getProvinceByName('south'); // { code: 2, name: 'SOUTH' }
rw.getProvinceByName(' south'); // null
rw.getProvinceByName('Southern Province'); // null
```

### Districts

`getDistricts(provinceCode?)` lists all 30 districts, or those of one province.
`getDistrictByCode(code)` takes a number such as `101`.

```ts
rw.getDistricts().length; // 30
rw.getDistricts(2).length; // 8
rw.getDistricts(9); // []
rw.getDistrictByCode(101); // { code: 101, name: 'Nyarugenge', provinceCode: 1, provinceName: 'KIGALI' }
```

### Sectors

`getSectors(districtCode?, provinceCode?)` lists all 416 sectors, or those that match every
filter given. `getSectorByCode(code)` takes a 6-character string: the leading zero matters.

```ts
rw.getSectors().length; // 416
rw.getSectors(101).length; // 10
rw.getSectors(undefined, 1).length; // 35
rw.getSectors(101, 2); // []
rw.getSectorByCode('10101'); // null

rw.getSectorByCode('010101');
// {
//   code: '010101',
//   name: 'Gitega',
//   districtCode: 101,
//   districtName: 'Nyarugenge',
//   provinceCode: 1,
//   provinceName: 'KIGALI'
// }
```

### Cells

`getCells(sectorCode?, districtCode?, provinceCode?)` lists all 2,148 cells, or those that match
every filter given. `getCellByCode(code)` takes a number such as `1010101`.

```ts
rw.getCells().length; // 2148
rw.getCells('010101').map((cell) => cell.name); // ['Akabahizi', 'Akabeza', 'Gacyamo', 'Kigarama', 'Kinyange', 'Kora']
rw.getCells(undefined, 101).length; // 47
rw.getCellByCode(1010101)?.name; // 'Akabahizi'
```

### Villages

`getVillages(cellCode?, sectorCode?, districtCode?, provinceCode?)` lists all 14,842 villages, or
those that match every filter given. `getVillageByCode(code)` returns the village with the codes
and names of its cell, sector, district and province. `getHierarchy(villageCode)` does the same.

```ts
rw.getVillages().length; // 14842
rw.getVillages(1010101).length; // 12
rw.getVillages(undefined, '010101').length; // 50
rw.getVillages(1010101, '010102'); // []
rw.getVillageByCode(101010102)?.cellName; // 'Akabahizi'
rw.getHierarchy(101010102)?.sectorName; // 'Gitega'
rw.getVillageByCode(999999999); // null
```

### Full path

`getFullPath(villageCode)` splits a village into its province, district, sector, cell and village,
for example to show breadcrumbs. For an unknown code, every member is `null`.

```ts
const path = rw.getFullPath(101010102);
path.province; // { code: 1, name: 'KIGALI' }
path.district?.name; // 'Nyarugenge'
path.sector?.code; // '010101'
path.cell?.name; // 'Akabahizi'
path.village?.name; // 'Gihanga'

rw.getFullPath(999999999); // { province: null, district: null, sector: null, cell: null, village: null }
```

### Statistics

`getStatistics()` counts the divisions at each level.

```ts
rw.getStatistics();
// {
//   totalProvinces: 5,
//   totalDistricts: 30,
//   totalSectors: 416,
//   totalCells: 2148,
//   totalVillages: 14842
// }
```

### query()

`query(filter)` returns the dataset rows that match every filter given. Each row is a
`LocationData` object: one village with the codes and names of all its levels, in snake_case.

- Code filters (`provinceCode`, `districtCode`, `sectorCode`, `cellCode`, `villageCode`) are
  compared with `===`. `sectorCode` is a string; the others are numbers.
- Name filters (`provinceName`, `districtName`, `sectorName`, `cellName`, `villageName`) must
  equal the whole name. They ignore case but are not trimmed. Use `search()` to match part of a
  name.
- Falsy filter values and unknown keys are ignored, so `query({})` returns every row.
- The rows come back in the order of the data file, which is not strictly sorted by code.
- The rows are shared with the library and every other caller. Do not modify them; copy a row
  first (`{ ...row }`) if you need to change it.

```ts
rw.query({ provinceCode: 1 }).length; // 1176
rw.query({ districtName: 'gasabo', sectorName: 'remera' }).length; // 26
rw.query({ districtName: 'gas' }).length; // 0
rw.query({ provinceCode: 1, districtCode: 201 }); // []
rw.query({}).length; // 14842

const [row] = rw.query({ villageCode: 101010102 });
console.log(row);
// {
//   id: 'fdf89758-99f0-4b6d-a793-e72f274c0fa1',
//   country_code: 'RWA',
//   country_name: 'RWANDA',
//   province_code: 1,
//   province_name: 'KIGALI',
//   district_code: 101,
//   district_name: 'Nyarugenge',
//   sector_code: '010101',
//   sector_name: 'Gitega',
//   cell_code: 1010101,
//   cell_name: 'Akabahizi',
//   village_code: 101010102,
//   village_name: 'Gihanga'
// }
```

### search()

`search({ query, caseSensitive?, limit? })` returns the dataset rows (`LocationData`, one per
village) where the province, district, sector, cell or village name contains `query`.

- It is a plain substring match. It ignores case unless `caseSensitive` is `true`. The query is
  not trimmed or split into words, and an empty query matches every row.
- Codes and ids are not searched.
- Results are in data-file order. They are not ranked, and not grouped by level: a term that
  matches a province name returns every village of that province. For example, `'kigali'`
  matches all 1,176 villages of the KIGALI province, plus 6 villages named Kigali in other
  provinces.
- `limit` keeps the first `limit` matches. `0`, `NaN`, `null`, `undefined` and negative numbers
  mean no limit. A positive fraction is rounded down, so `2.5` keeps 2 rows. A limit between 0
  and 1, such as `0.5`, returns no rows.
- Since 1.2.0 a negative `limit` means no limit. 1.1.2 passed it to `Array#slice()`, so `-1`
  dropped the last match and a limit between -1 and 0 returned no rows.
- Like `query()`, it returns the shared rows: treat them as read-only.

```ts
const rows = rw.search({ query: 'kigali' });
rows.length; // 1182
rows.filter((row) => row.province_name !== 'KIGALI').length; // 6

rw.search({ query: 'Kigali', caseSensitive: true }).length; // 54
rw.search({ query: 'gitega' }).length; // 153
rw.search({ query: 'gitega', limit: 10 }).length; // 10
rw.search({ query: 'gitega', limit: -1 }).length; // 153
rw.search({ query: '' }).length; // 14842
rw.search({ query: '101' }); // []
```

To search a single level, filter the list of that level instead:

```ts
const term = 'gitega';
rw.getSectors()
  .filter((sector) => sector.name.toLowerCase().includes(term))
  .map((sector) => sector.code); // ['010101']
rw.getCells().filter((cell) => cell.name.toLowerCase().includes(term)).length; // 9
```

For villages, filter the rows that `search()` returns. That is faster than filtering
`getVillages()`, which builds 14,842 new objects. `search({ query: 'gihanga' })` returns 67 rows:
55 villages of the Nyagihanga sector, 5 villages of the Gihanga cell, and 7 villages whose own
name contains "gihanga" (4 named Gihanga, plus Kagihanga, Gihangara and Nyagihanga):

```ts
const villageTerm = 'gihanga';
rw.search({ query: villageTerm }).length; // 67
const matches = rw
  .search({ query: villageTerm })
  .filter((row) => row.village_name.toLowerCase().includes(villageTerm));
matches.length; // 7
```

## Utility functions

The package also exports a few helper functions.

| Function                       | What it does                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `normalizeString(str)`         | Lowercases and trims a string.                                                                  |
| `matchesString(a, b)`          | `true` if both strings are equal after `normalizeString`.                                       |
| `getUniqueByKey(items, key)`   | The distinct values of `key`, in order of first appearance. Does not change `items`.            |
| `sortByNumericKey(items, key)` | Sorts by a numeric key, ascending. **Sorts `items` in place** and returns the same array.       |
| `sortByStringKey(items, key)`  | Sorts by a key compared as text with `localeCompare`. **Sorts `items` in place.**               |
| `isValidProvinceCode(code)`    | `true` if `1 <= code <= 5`. A range check: `1.5` also passes.                                   |
| `isValidDistrictCode(code)`    | `true` if `101 <= code <= 599`. A range check: codes that no district has, such as `150`, pass. |
| `formatLocation(row)`          | Formats a `LocationData` row as `'village, cell, sector, district, province'`.                  |
| `getParentLevel(level)`        | The level above: `'village'` gives `'cell'`, `'province'` gives `null`.                         |
| `getChildLevel(level)`         | The level below: `'province'` gives `'district'`, `'village'` gives `null`.                     |

```ts
import {
  formatLocation,
  getChildLevel,
  getParentLevel,
  getUniqueByKey,
  isValidDistrictCode,
  matchesString,
  normalizeString,
  rwandaLocation,
  sortByNumericKey,
  sortByStringKey,
} from '@devrw/rwanda-location';

normalizeString('  KiGaLi  '); // 'kigali'
matchesString(' KIGALI ', 'kigali'); // true

const kigaliRows = rwandaLocation.query({ provinceCode: 1 });
getUniqueByKey(kigaliRows, 'district_name'); // ['Nyarugenge', 'Gasabo', 'Kicukiro']

// The sort helpers change the array you pass in. Sort a copy to keep the original.
const items = [{ code: 3 }, { code: 1 }, { code: 2 }];
const sorted = sortByNumericKey(items, 'code');
sorted === items; // true
items.map((item) => item.code); // [1, 2, 3]
sortByStringKey([{ code: 9 }, { code: 10 }], 'code'); // [{ code: 10 }, { code: 9 }]

// A range check is not an existence check.
isValidDistrictCode(150); // true
rwandaLocation.getDistrictByCode(150); // null

formatLocation(kigaliRows[0]); // 'Gihanga, Akabahizi, Gitega, Nyarugenge, KIGALI'
getParentLevel('village'); // 'cell'
getChildLevel('village'); // null
```

Notes:

- `normalizeString` and `matchesString` throw a `TypeError` for values that are not strings.
- `formatLocation` reads the snake_case fields of a `LocationData` row, as returned by `query()`
  and `search()`. It does not work with the `Village` objects returned by `getVillageByCode()`.
- `getParentLevel` and `getChildLevel` return `undefined` for any other value, including other
  casings such as `'Village'`. Since 1.2.0 this also holds for inherited object keys such as
  `'__proto__'` and `'toString'`; 1.1.2 returned `Object.prototype` members for those.

## Exports and types

The package root exports:

- `RwandaLocation`: the class.
- `rwandaLocation`: a shared instance of the class.
- `default`: the class again (see [Importing](#importing) for the Node.js ES module case).
- The ten functions listed in [Utility functions](#utility-functions).
- Types only: `LocationData`, `QueryFilter`, `SearchOptions`, `Statistics`, `FullPath`,
  `Province`, `District`, `Sector`, `Cell` and `Village`.

```ts
interface LocationData {
  id: string;
  country_code: string;
  country_name: string;
  province_code: number;
  province_name: string;
  district_code: number;
  district_name: string;
  sector_code: string;
  sector_name: string;
  cell_code: number;
  cell_name: string;
  village_code: number;
  village_name: string;
}

interface Province {
  code: number;
  name: string;
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

interface QueryFilter {
  provinceCode?: number;
  provinceName?: string;
  districtCode?: number;
  districtName?: string;
  sectorCode?: string;
  sectorName?: string;
  cellCode?: number;
  cellName?: string;
  villageCode?: number;
  villageName?: string;
}

interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  limit?: number;
}

interface Statistics {
  totalProvinces: number;
  totalDistricts: number;
  totalSectors: number;
  totalCells: number;
  totalVillages: number;
}

interface FullPath {
  province: Province | null;
  district: District | null;
  sector: Sector | null;
  cell: Cell | null;
  village: Village | null;
}
```

Code formats:

| Level    | Type   | Example     | Format                                        |
| -------- | ------ | ----------- | --------------------------------------------- |
| Province | number | `1`         | 1 to 5                                        |
| District | number | `101`       | province digit, then 2 digits                 |
| Sector   | string | `'010101'`  | 6 characters with a leading zero              |
| Cell     | number | `1010101`   | province digit, then 2 digits per lower level |
| Village  | number | `101010102` | cell code, then 2 digits                      |

| Code | Province |
| ---- | -------- |
| 1    | KIGALI   |
| 2    | SOUTH    |
| 3    | WEST     |
| 4    | NORTH    |
| 5    | EAST     |

## Behavior notes

These rules are the same as in 1.1.2, except where a note says otherwise, and they stay the same
in 1.x.

**Codes are compared strictly.** Sector codes are strings such as `'010101'`; all other codes are
numbers. In plain JavaScript, `getDistrictByCode('101')` and `getSectorByCode(10101)` return
`null`. Convert codes that come from forms or URLs before you use them.

**A falsy argument means "no filter".** `0`, `NaN`, `''`, `null` and `undefined` are ignored, so
`getDistricts(0)` returns all 30 districts, not none. This matters for values from `parseInt` or
`Number`, which give `NaN` for bad input. Check the value first:

```ts
rw.getDistricts(0).length; // 30
rw.getDistricts(Number.parseInt('abc', 10)).length; // 30

function districtsOf(input: string) {
  const code = Number(input);
  return rw.getProvinceByCode(code) ? rw.getDistricts(code) : [];
}
districtsOf('1').length; // 3
districtsOf('abc').length; // 0
districtsOf('0').length; // 0
```

**Filters are positional.** Passing a method directly as a callback, as in
`codes.map(rw.getCells, rw)`, also passes the array index and the array as filters. Use an arrow
function instead:

```ts
const sectorCodes = ['010101', '010102'];
sectorCodes.map((code) => rw.getCells(code).length); // [6, 3]
```

**Name matching ignores case but does not trim.** `'kigali'` matches `KIGALI`, but `' kigali'`
matches nothing. This applies to `getProvinceByName()` and to the name filters of `query()`.
`search()` does not trim its query either. Trim user input yourself, for example with
`normalizeString()`.

**Rows from `query()` and `search()` are shared and read-only.** Both return the dataset rows
themselves, so a change to one row is seen by every caller and every instance. Since 1.2.0,
lookups by code or name may also keep using the old value after such a change, because the
lookup tables are built once. The same applies to the dataset array itself, which a deep import
of `dist/db/locations.json` returns: sort or filter a copy (`[...rows].sort(...)`), never the
array. The `get*` methods return new objects on each call, which you are free to change.

```ts
const [first] = rw.query({ villageCode: 101010102 });
first === rw.search({ query: 'Gihanga' })[0]; // true
const copy = { ...first }; // change the copy, not the shared row
```

## Data

| Level     | Count  |
| --------- | ------ |
| Provinces | 5      |
| Districts | 30     |
| Sectors   | 416    |
| Cells     | 2,148  |
| Villages  | 14,842 |

The dataset has one row per village. It was added to the repository in October 2019 and has not
changed since. The repository does not record its original source or the date it describes.

**14,842 villages, not 14,837.** Commonly cited official figures give 14,837 villages. The
dataset has five more village codes, all in the Eastern Province. They are kept in 1.x so that
codes you have already stored keep resolving.

| Village code | Village     | Cell       | Sector    | District  |
| ------------ | ----------- | ---------- | --------- | --------- |
| 502030506    | NyamiramaIi | Musenyi    | KARANGAZI | Nyagatare |
| 503020104    | HanikaIi    | Gatsibo    | Gatsibo   | Gatsibo   |
| 503050109    | NyarubuyeIi | Busetsa    | Kageyo    | Gatsibo   |
| 503120607    | Rugarama    | Rwarenga   | Remera    | Gatsibo   |
| 505120301    | Akirondo    | Nyarutunga | Nyarubuye | Kirehe    |

**Province names.** Provinces are named `KIGALI`, `SOUTH`, `WEST`, `NORTH` and `EAST`. Other
names, such as `'City of Kigali'` or `'Southern Province'`, do not match in
`getProvinceByName()` or `query()`.

**Known data issues.** Some names are stored with mistakes:

- 44 sector names are in capitals, all in the Ngororero, Rulindo and Nyagatare districts, for
  example `BWIRA` (`030501`). The capitals also appear in the `sectorName` of their cells and
  villages.
- Sector `050712` is spelled `Ririma`. The official spelling is Rilima.
- 457 names (18 cells and 439 villages) have lost a space between words, for example
  `MunaniraIi` for "Munanira II" and `NyamataYUmujyi` for "Nyamata y'Umujyi". So
  `search({ query: 'munanira i' })` finds nothing, while `search({ query: 'munanirai' })` finds
  13 rows.
- Village `306010101` is stored as `Cit` followed by two U+FFFD replacement characters, probably
  a damaged "Cité".
- Other typos: `Kiv0mo` (`401140104`, with a zero), `Gitwa.` (`403130402`), `AKagarama`
  (`102110105`), `AmaremboIl` (`102130102`, with a lowercase L), `KrenziIi` (`205110203`) and
  `Kinkrware` (`403110105`).

These names are kept as they are in 1.x, because you may have stored them or filter by them.
Changing them would change results for existing code. To report a wrong or missing name or code,
use the
[data correction form](https://github.com/DevRW/rwanda-location/issues/new?template=data-correction.yml)
and include an official source.

## Performance

Since 1.2.0, every method answers from lookup tables. The tables are built the first time a
method needs them and are shared by all instances, including `rwandaLocation`. Creating an
instance does no work. In 1.1.2, every call went through the dataset again: the list methods,
`getStatistics()`, `query()` and `search()` read all 14,842 rows, and the lookups by code or name
read rows up to the first match, or all of them for a code that does not exist.

Median time per call after warm-up, measured with `npm run bench` on an Apple M4 with Node.js 24:

| Operation                                                               | 1.1.2    | 1.2.0    |
| ----------------------------------------------------------------------- | -------- | -------- |
| Cascading form: provinces, districts, sectors, cells, villages, village | 437.5 µs | 1.27 µs  |
| Check 1,000 village codes with `getVillageByCode()`                     | 5.33 ms  | 35.7 µs  |
| `getVillageByCode(code)`                                                | 5.76 µs  | 0.04 µs  |
| `getStatistics()`                                                       | 1.50 ms  | 0.08 µs  |
| `search({ query: 'gitega', limit: 10 })`                                | 1.20 ms  | 0.36 µs  |
| `search({ query: 'kigali' })`, 1,182 rows                               | 1.15 ms  | 280.9 µs |
| `query({ villageName })`                                                | 717.5 µs | 41.5 µs  |

Timings vary by up to about 2x between runs on the same machine. `search()` without a limit
still checks every row.

Costs to be aware of:

- The first call that needs a table builds it. In the same benchmark, the first call of
  `getVillageByCode()`, `getVillages()` or `search()` in a fresh process took about 1.5 to 6.5
  ms, against 0.2 to 4 ms in 1.1.2. The first `getStatistics()` call is faster than in 1.1.2.
  Later calls use the tables.
- The tables use extra memory: about 1.2 MB for typical use (a cascading form and lookups by
  code) and about 2.8 MB when every table is built. The dataset itself takes about 6 MB of
  memory, and loading the package takes about 15 ms.

## Package size

The whole dataset is part of the package, so it is not small:

- npm package: about 0.54 MB to download and 4.9 MB unpacked, of which 4.7 MB is the dataset.
- Browser bundles include the whole dataset, even if you only import a helper function. A bundle
  that calls `getProvinces()`, built with esbuild 0.25 (`--bundle --minify --platform=browser`),
  is 4.35 MB minified and about 0.5 MB with gzip.

For web pages, consider calling the library on a server and sending only the lists you need.

## Security

The package has no runtime dependencies and makes no network requests. See
[SECURITY.md](SECURITY.md) to report a vulnerability.

## Contributing

Bug reports, data corrections and pull requests are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, the checks a change must pass and
the compatibility rules. The [CHANGELOG](CHANGELOG.md) lists the changes in each version.

Questions and bug reports: [GitHub Issues](https://github.com/DevRW/rwanda-location/issues).

## License

MIT. See [LICENSE](LICENSE).

## Authors

- Jacques Nyilinkindi ([info@jnkindilogs.xyz](mailto:info@jnkindilogs.xyz))
- Theo Okafor ([theo.okafor@yahoo.com](mailto:theo.okafor@yahoo.com))
