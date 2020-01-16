import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import graphqlHTTP from 'express-graphql';
import { buildSchema } from 'graphql';

import routes from './src/routes';
import ResponseSpec from './src/helpers/response-spec';
import ProvinceController from './src/controller/province';


// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type Province {
    province_id: Int
    province_name: String
  }

  type Query {
    getProvince(id: Int!): Province
    allProvinces: [Province]
    random: Float!
    rollDice(numDice: Int!, numSides: Int): [Int]
  }
`);

// The root provides a resolver function for each API endpoint
const root = {
  getProvince: ({ id }) => new ProvinceController().provinces[id - 1],
  allProvinces: () => new ProvinceController().provinces,
  random: () => Math.random(),
  rollDice: ({ numDice, numSides }) => {
    const output = [];
    for (let i = 0; i < numDice; i++) {
      output.push(1 + Math.floor(Math.random() * (numSides || 6)));
    }
    return output;
  }
};

// Set up express app
const app = express();

// Log requests
app.use(morgan('dev'));

app.use(cors());

// Parse the body of incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api/v1', routes);

// GraphQL route
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true,
}));

app.use('/', (request, response) => {
  ResponseSpec.good(response, 200, 'Welcome to Rwanda Location API');
});

const port = process.env.PORT || 2500;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});

export default app;
