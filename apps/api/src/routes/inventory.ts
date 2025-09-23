import '../loadEnv';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const r = Router();

r.get('/sides', async (_req, res) => {
  const sides = await prisma.side.findMany({ orderBy: { id: 'asc' } });
  res.json(sides);
});

r.get('/racks', async (_req, res) => {
  const racks = await prisma.rack.findMany({ orderBy: [{ sideId: 'asc' }, { number: 'asc' }] });
  res.json(racks);
});

r.get('/areas', async (_req, res) => {
  const areas = await prisma.area.findMany({ orderBy: [{ sideId: 'asc' }, { key: 'asc' }] });
  res.json(areas);
});

export default r;
