/**
 * Pins the bundled dataset, so that any change to src/db/locations.json is deliberate.
 *
 * Users see the data directly: query() and search() return its rows, in file order, and ids,
 * names and codes are part of every result. If you change the data on purpose, update the
 * expected values below and describe the change in the CHANGELOG.
 */
import { createHash } from 'crypto';
import locations from '../db/locations.json';
import { rwandaLocation } from '../index';
import { LocationData } from '../types';

const rows = locations as LocationData[];

describe('bundled dataset', () => {
  it('has 5 provinces, 30 districts, 416 sectors, 2,148 cells and 14,842 villages', () => {
    const count = (key: keyof LocationData): number => new Set(rows.map((row) => row[key])).size;
    const expected = {
      totalProvinces: 5,
      totalDistricts: 30,
      totalSectors: 416,
      totalCells: 2148,
      totalVillages: 14842,
    };

    expect(rows).toHaveLength(14842);
    expect({
      totalProvinces: count('province_code'),
      totalDistricts: count('district_code'),
      totalSectors: count('sector_code'),
      totalCells: count('cell_code'),
      totalVillages: count('village_code'),
    }).toEqual(expected);
    expect(rwandaLocation.getStatistics()).toEqual(expected);
  });

  it('matches the pinned hash (rows, field order and row order)', () => {
    // The hash covers JSON.stringify of the parsed rows, so it ignores the file's whitespace
    // (the published copy is minified) but not the order of rows or of their fields.
    const hash = createHash('sha256').update(JSON.stringify(rows)).digest('hex');

    expect(hash).toBe('7b067bae7b7e8a6190c4bd7c911d383392b6b2701935238227130554e0dbcc9d');
  });
});
