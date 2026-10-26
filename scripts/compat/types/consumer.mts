// Type-level contract of 1.x for Node ESM consumers (moduleResolution node16/nodenext). Node
// gives an ESM importer of this CommonJS package module.exports as the default import, and the
// types must keep modelling that: the default import is not the class.
import pkg, { rwandaLocation, RwandaLocation, Province, Village } from '@devrw/rwanda-location';
import { RwandaLocation as DeepRwandaLocation } from '@devrw/rwanda-location/dist/lib/RwandaLocation.js';

export const rw: RwandaLocation = new RwandaLocation();
export const deep: RwandaLocation = new DeepRwandaLocation();
export const provinces: Province[] = rwandaLocation.getProvinces();
export const village: Village | null = rw.getVillageByCode(101010102);
export const viaDefault: RwandaLocation = new pkg.RwandaLocation();
export const viaDefaultDefault: RwandaLocation = new pkg.default();
export const singleton: RwandaLocation = pkg.rwandaLocation;

// @ts-expect-error In Node ESM the default import is module.exports, which is not constructible.
export const notAClass = new pkg();
