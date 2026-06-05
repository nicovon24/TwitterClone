import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  morgan(':method :url :status :response-time ms - :res[content-length]'),
);

// Phase 2 routes will be mounted here

app.use(errorHandler);

export default app;
