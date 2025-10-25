/**
 * UI Integration Example
 *
 * This example shows how to integrate the library into a web form
 * with cascading dropdowns/selects for address input
 */

import { RwandaLocation } from '../src';

// Simulated UI state (in a real app, this would be React/Vue/Angular state)
interface AddressFormState {
  selectedProvinceCode: number | null;
  selectedDistrictCode: number | null;
  selectedSectorCode: string | null;
  selectedCellCode: number | null;
  selectedVillageCode: number | null;
}

class AddressForm {
  private rw: RwandaLocation;
  private state: AddressFormState;

  constructor() {
    this.rw = new RwandaLocation();
    this.state = {
      selectedProvinceCode: null,
      selectedDistrictCode: null,
      selectedSectorCode: null,
      selectedCellCode: null,
      selectedVillageCode: null,
    };
  }

  /**
   * Initialize form - load provinces for the first dropdown
   */
  initializeForm(): void {
    const provinces = this.rw.getProvinces();
    console.log('=== STEP 1: Load Provinces ===');
    console.log('Available provinces for dropdown:', provinces);
    this.renderDropdown('Province', provinces);
  }

  /**
   * User selected a province - load districts
   */
  onProvinceSelected(provinceCode: number): void {
    this.state.selectedProvinceCode = provinceCode;

    // Reset downstream selections
    this.state.selectedDistrictCode = null;
    this.state.selectedSectorCode = null;
    this.state.selectedCellCode = null;
    this.state.selectedVillageCode = null;

    // Load districts for this province
    const districts = this.rw.getDistricts(provinceCode);
    console.log(`\n=== STEP 2: Province ${provinceCode} selected ===`);
    console.log('Available districts for dropdown:', districts);
    this.renderDropdown('District', districts);
  }

  /**
   * User selected a district - load sectors
   */
  onDistrictSelected(districtCode: number): void {
    this.state.selectedDistrictCode = districtCode;

    // Reset downstream selections
    this.state.selectedSectorCode = null;
    this.state.selectedCellCode = null;
    this.state.selectedVillageCode = null;

    // Load sectors for this district
    const sectors = this.rw.getSectors(districtCode);
    console.log(`\n=== STEP 3: District ${districtCode} selected ===`);
    console.log('Available sectors for dropdown:', sectors);
    this.renderDropdown('Sector', sectors);
  }

  /**
   * User selected a sector - load cells
   */
  onSectorSelected(sectorCode: string): void {
    this.state.selectedSectorCode = sectorCode;

    // Reset downstream selections
    this.state.selectedCellCode = null;
    this.state.selectedVillageCode = null;

    // Load cells for this sector
    const cells = this.rw.getCells(sectorCode);
    console.log(`\n=== STEP 4: Sector ${sectorCode} selected ===`);
    console.log('Available cells for dropdown:', cells);
    this.renderDropdown('Cell', cells);
  }

  /**
   * User selected a cell - load villages
   */
  onCellSelected(cellCode: number): void {
    this.state.selectedCellCode = cellCode;

    // Reset downstream selection
    this.state.selectedVillageCode = null;

    // Load villages for this cell
    const villages = this.rw.getVillages(cellCode);
    console.log(`\n=== STEP 5: Cell ${cellCode} selected ===`);
    console.log('Available villages for dropdown:', villages);
    this.renderDropdown('Village', villages);
  }

  /**
   * User selected a village - get full information
   */
  onVillageSelected(villageCode: number): void {
    this.state.selectedVillageCode = villageCode;

    // Get complete information
    const fullInfo = this.rw.getVillageByCode(villageCode);
    console.log(`\n=== STEP 6: Village ${villageCode} selected ===`);
    console.log('COMPLETE ADDRESS INFORMATION:');
    console.log(fullInfo);

    // Alternative: Get structured path for breadcrumbs
    const fullPath = this.rw.getFullPath(villageCode);
    console.log('\nSTRUCTURED PATH (for breadcrumbs):');
    console.log(fullPath);

    this.displayCompleteAddress(fullInfo);
  }

  /**
   * Helper: Simulate rendering a dropdown
   */
  private renderDropdown(
    level: string,
    options: Array<{ code: number | string; name: string }>
  ): void {
    console.log(`\n[UI] Rendering ${level} dropdown with ${options.length} options`);
    console.log(
      `[UI] Options: ${options.map((opt) => `${opt.name} (${opt.code})`).join(', ')}`
    );
  }

  /**
   * Display the complete selected address
   */
  private displayCompleteAddress(village: any): void {
    if (!village) return;

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     COMPLETE ADDRESS SELECTED          ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Country:   RWANDA`);
    console.log(`Province:  ${village.provinceName} (${village.provinceCode})`);
    console.log(`District:  ${village.districtName} (${village.districtCode})`);
    console.log(`Sector:    ${village.sectorName} (${village.sectorCode})`);
    console.log(`Cell:      ${village.cellName} (${village.cellCode})`);
    console.log(`Village:   ${village.name} (${village.code})`);
    console.log('═══════════════════════════════════════════\n');
  }

  /**
   * Get current form state (useful for form validation)
   */
  getFormState(): AddressFormState {
    return this.state;
  }

  /**
   * Check if form is complete
   */
  isFormComplete(): boolean {
    return this.state.selectedVillageCode !== null;
  }
}

// ==================== SIMULATION ====================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  RWANDA LOCATION LIBRARY - UI INTEGRATION SIMULATION       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const form = new AddressForm();

// Initialize the form
form.initializeForm();

// Simulate user selections (Province → District → Sector → Cell → Village)
setTimeout(() => {
  form.onProvinceSelected(1); // Select KIGALI
}, 500);

setTimeout(() => {
  form.onDistrictSelected(101); // Select first district in Kigali
}, 1000);

setTimeout(() => {
  const rw = new RwandaLocation();
  const sectors = rw.getSectors(101);
  if (sectors.length > 0) {
    form.onSectorSelected(sectors[0].code); // Select first sector
  }
}, 1500);

setTimeout(() => {
  const rw = new RwandaLocation();
  const sectors = rw.getSectors(101);
  const cells = rw.getCells(sectors[0].code);
  if (cells.length > 0) {
    form.onCellSelected(cells[0].code); // Select first cell
  }
}, 2000);

setTimeout(() => {
  const rw = new RwandaLocation();
  const sectors = rw.getSectors(101);
  const cells = rw.getCells(sectors[0].code);
  const villages = rw.getVillages(cells[0].code);
  if (villages.length > 0) {
    form.onVillageSelected(villages[0].code); // Select first village
  }

  // Check if form is complete
  console.log('\n[VALIDATION] Form complete:', form.isFormComplete());
  console.log('[STATE] Final form state:', form.getFormState());
}, 2500);
