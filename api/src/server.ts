import { CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import router from './routes';

const app = express();
const corsOptions: CorsOptions = {
  origin: '*',
  methods: 'GET,POST,PUT,DELETE',
};

app
  .use(helmet())
  //   .use(helmet.hidePoweredBy())
  //   .use(cors(corsOptions))
  //   .use(morgan('dev'))
  .use(express.json())
//   .use(express.urlencoded({ extended: true }));

app.get('/', (_, res) => {
  return res.status(200).json({
    message: 'Hello World!',
  });
});

app.use('/v1', router);

// app.use(errorHandler); // should be last middleware

export default app;
