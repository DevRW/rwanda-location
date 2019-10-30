/* eslint-disable import/no-extraneous-dependencies */
import '@babel/polyfill';
import chai from 'chai';
import chaiHttp from 'chai-http';

import app from '../..';

const { expect } = chai;
chai.use(chaiHttp);

describe('Get Provinces', () => {
  it('should return response for provinces', async () => {
    const response = await chai.request(app)
      .get('/api/v1/provinces');
    expect(response.body.status).to.be.equal(200);
    expect(response.body.message).to.be.equal('Successful!');
    expect(response.body.data.length).to.be.equal(5);
  });
});
