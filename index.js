import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';

import routes from './src/routes';
import ResponseSpec from './src/helpers/response-spec';

// Set up express app
const app = express();

// Log requests
app.use(morgan('dev'));

app.use(cors());

// Parse the body of incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api/v1', routes);

app.use('/', (request, response) => {
  ResponseSpec.good(response, 200, 'Welcome to Rwanda Location API');
});

const port = process.env.PORT || 2500;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});

export default app;
