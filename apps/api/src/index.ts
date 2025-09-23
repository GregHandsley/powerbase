import './loadEnv';
import express from 'express';
import cors from 'cors';
import pkg from '../package.json' assert { type: 'json' };

import inventoryRouter from './routes/inventory.js';
import matrixRouter from './routes/matrix.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json());

app.use('/inventory', inventoryRouter);
app.use('/matrix', matrixRouter);

app.get('/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'dev' }));
app.get('/version', (_req, res) => res.json({ name: 'powerbase-api', version: pkg.version }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
