import express from 'express';

import ProvinceController from '../controller/province';

const routes = new express.Router();
const provinces = new ProvinceController();

routes.get('/provinces', provinces.getAllProvinces);

export default routes;
