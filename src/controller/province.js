import data from '../db/locations.json';
import ResponseSpec from '../helpers/response-spec';

class ProvinceController {
  /**
   * @description constructor method
   */
  constructor() {
    this.data = JSON.parse(JSON.stringify(data));
    this.provinces = [
      {
        province_id: 1,
        province_name: 'KIGALI'
      },
      {
        province_id: 2,
        province_name: 'SOUTH'
      },
      {
        province_id: 3,
        province_name: 'WEST'
      },
      {
        province_id: 4,
        province_name: 'NORTH'
      },
      {
        province_id: 5,
        province_name: 'EAST'
      }
    ];
  }

  /**
   * @description returns the array of provinces
   *
   * @param {object} request
   * @param {object} response
   *
   * @returns {object} response
   */
  getAllProvinces = (request, response) => (
    ResponseSpec.good(response, 200, 'Successful!', this.provinces)
  )
}

export default ProvinceController;
