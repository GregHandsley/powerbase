import './loadEnv';
import express from 'express';
import cors from 'cors';
import pkg from '../package.json' assert { type: 'json' };

import inventoryRouter from './routes/inventory.js';
import matrixRouter from './routes/matrix.js';
import requestsRouter from "./routes/requests.js";
import availabilityRouter from './routes/availability.js';
import debugRouter from './routes/debug.js';
import adminRouter, { _wirePump } from './routes/admin.js';
import kioskRouter, { pumpKioskNow } from './routes/kiosk.js';
import legendRouter from './routes/legend.js';
import bookingsRouter from './routes/bookings.js';
import { runWeeklyLock } from './jobs/weeklyLock.js';
import changeReqRouter from './routes/changeRequests.js';
import instancesRouter from './routes/instances.js';

_wirePump(pumpKioskNow);

// DEV fallback: check every minute; in prod use Railway cron calling /admin/cron/lock
setInterval(() => { 
  runWeeklyLock().catch(err => console.error('Weekly lock job failed:', err)); 
}, 60_000);

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json());

app.use('/inventory', inventoryRouter);
app.use('/matrix', matrixRouter);
app.use("/requests", requestsRouter);
app.use('/availability', availabilityRouter);
app.use('/debug', debugRouter);
app.use('/admin', adminRouter);
app.use('/legend', legendRouter);
app.use('/kiosk', kioskRouter);
app.use('/bookings', bookingsRouter);
app.use('/changes', changeReqRouter);
app.use('/instances', instancesRouter);

// Optional: expose a protected endpoint Railway can hit
import { Router } from 'express';
const cron = Router();
cron.post('/lock', async (_req, res) => {
  const r = await runWeeklyLock();
  res.json(r);
});
app.use('/admin/cron', cron);

app.get('/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'dev' }));
app.get('/version', (_req, res) => res.json({ name: 'powerbase-api', version: pkg.version }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));