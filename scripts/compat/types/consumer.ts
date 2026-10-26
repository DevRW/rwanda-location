// Type-level contract of 1.x for TypeScript consumers that compile to CommonJS or use a bundler
// (moduleResolution node10, node16/nodenext from a CommonJS file, and bundler). It is only
// type-checked, never run. A compile error here means existing user code would stop compiling.
import RwandaLocationDefault, {
  rwandaLocation,
  RwandaLocation,
  Province,
  District,
  Sector,
  Cell,
  Village,
  LocationData,
  QueryFilter,
  SearchOptions,
  Statistics,
  FullPath,
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
} from '@devrw/rwanda-location';
import { RwandaLocation as DeepRwandaLocation } from '@devrw/rwanda-location/dist/lib/RwandaLocation';
import { normalizeString as deepNormalize } from '@devrw/rwanda-location/dist/lib/utils';
import rows from '@devrw/rwanda-location/dist/db/locations.json';

export const rw: RwandaLocation = new RwandaLocationDefault();
export const deep: RwandaLocation = new DeepRwandaLocation();
export const provinces: Province[] = rwandaLocation.getProvinces();
export const province: Province | null = rw.getProvinceByCode(1);
export const byName: Province | null = rw.getProvinceByName('kigali');
export const districts: District[] = rw.getDistricts();
export const kigaliDistricts: District[] = rw.getDistricts(1);
export const district: District | null = rw.getDistrictByCode(101);
export const sectors: Sector[] = rw.getSectors(101, 1);
export const allSectors: Sector[] = rw.getSectors();
export const sector: Sector | null = rw.getSectorByCode('010101');
export const cells: Cell[] = rw.getCells('010101', 101, 1);
export const cell: Cell | null = rw.getCellByCode(1010101);
export const villages: Village[] = rw.getVillages(1010101, '010101', 101, 1);
export const village: Village | null = rw.getVillageByCode(101010102);
export const hierarchy: Village | null = rw.getHierarchy(101010102);
export const filter: QueryFilter = {
  provinceCode: 1,
  provinceName: 'KIGALI',
  districtCode: 101,
  districtName: 'Nyarugenge',
  sectorCode: '010101',
  sectorName: 'Gitega',
  cellCode: 1010101,
  cellName: 'Akabahizi',
  villageCode: 101010102,
  villageName: 'Gihanga',
};
export const queried: LocationData[] = rw.query(filter);
export const options: SearchOptions = { query: 'kigali', caseSensitive: false, limit: 10 };
export const found: LocationData[] = rw.search(options);
export const stats: Statistics = rw.getStatistics();
export const path: FullPath = rw.getFullPath(101010102);
export const fromJson: string = rows[0].village_name;

// Every LocationData field keeps its type.
const row: LocationData = queried[0];
export const fields: [
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
] = [
  row.id,
  row.country_code,
  row.country_name,
  row.province_code,
  row.province_name,
  row.district_code,
  row.district_name,
  row.sector_code,
  row.sector_name,
  row.cell_code,
  row.cell_name,
  row.village_code,
  row.village_name,
];

// Object literals still satisfy the public interfaces (no new required fields).
export const literal: Village = {
  code: 1,
  name: '',
  cellCode: 1,
  cellName: '',
  sectorCode: '',
  sectorName: '',
  districtCode: 1,
  districtName: '',
  provinceCode: 1,
  provinceName: '',
};
export const emptyPath: FullPath = {
  province: null,
  district: null,
  sector: null,
  cell: null,
  village: null,
};

// The level helpers keep their wide return type, so reassigning any string still compiles.
let parent = getParentLevel('village');
parent = 'anything';
export { parent };

export const utils: [
  string,
  string,
  boolean,
  number[],
  LocationData[],
  LocationData[],
  boolean,
  boolean,
  string,
  string | null,
] = [
  normalizeString(' A '),
  deepNormalize(' B '),
  matchesString('a', 'b'),
  getUniqueByKey(queried, 'province_code'),
  sortByNumericKey(queried, 'village_code'),
  sortByStringKey(queried, 'village_name'),
  isValidProvinceCode(1),
  isValidDistrictCode(101),
  formatLocation(row),
  getChildLevel('cell'),
];

// The dataset stays reachable through an index access, as it is today.
export const data: unknown = rw['data'];
