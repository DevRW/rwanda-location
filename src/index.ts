import { RwandaLocation } from './lib/RwandaLocation';

export * from './types';
export * from './lib/RwandaLocation';
export * from './lib/utils';

// Create and export a default instance for convenience
export const rwandaLocation = new RwandaLocation();

// Export as default
export default RwandaLocation;
