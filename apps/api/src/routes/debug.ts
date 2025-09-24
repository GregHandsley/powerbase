import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const r = Router();

/** GET /debug/request/:id — return side + racks (you already used this) */
r.get('/request/:id', async (req, res) => {
  const rq = await prisma.request.findUnique({ where: { id: req.params.id }});
  if (!rq) return res.status(404).json({ error: 'not found' });
  const pat = rq.patternJson as any;
  const racks: number[] = (rq.areasJson as any)?.racks ?? [];
  res.json({ side: pat.side, racks });
});

/** NEW: GET /debug/request/:id/instances — list instances (date/slot) */
r.get('/request/:id/instances', async (req, res) => {
  const insts = await prisma.requestInstance.findMany({
    where: { requestId: req.params.id },
    orderBy: { date: 'asc' }
  });
  res.json(insts.map(i => ({
    id: i.id,
    date: i.date.toISOString().slice(0,10),
    slotStart: i.slotStart,
    slotEnd: i.slotEnd,
    side: i.side
  })));
});

/** NEW: GET /debug/instances?date=YYYY-MM-DD&side=Power&slotStart=07:30&slotEnd=09:00 */
r.get('/instances', async (req, res) => {
  const { date, side, slotStart, slotEnd } = req.query as Record<string,string>;
  if (!date || !side || !slotStart || !slotEnd) {
    return res.status(400).json({ error: 'date, side, slotStart, slotEnd are required' });
  }
  const insts = await prisma.requestInstance.findMany({
    where: {
      side,
      slotStart,
      slotEnd,
    },
    orderBy: { date: 'asc' }
  });
  res.json(insts.filter(i => i.date.toISOString().slice(0,10) === date));
});

/** NEW: POST /debug/allocations — create an allocation for an instance (simulate taken racks)
 * Body: { instanceId: string, side: "Power"|"Base", racks: number[], status?: "approved"|"pending"|"provisional" }
 */
r.post('/allocations', async (req, res) => {
  const { instanceId, side, racks, status = 'approved' } = req.body as {
    instanceId: string; side: 'Power'|'Base'; racks: number[]; status?: string
  };
  const inst = await prisma.requestInstance.findUnique({ where: { id: instanceId }});
  if (!inst) return res.status(404).json({ error: 'instance not found' });
  const sideRow = await prisma.side.findFirst({ where: { key: side }});
  if (!sideRow) return res.status(400).json({ error: `unknown side ${side}` });

  const created = await prisma.allocation.create({
    data: {
      requestInstanceId: instanceId,
      sideId: sideRow.id,
      racksJson: racks,
      status
    }
  });
  res.json(created);
});

/** NEW: DELETE /debug/allocations/:id — remove a test allocation */
r.delete('/allocations/:id', async (req, res) => {
  await prisma.allocation.delete({ where: { id: req.params.id }});
  res.json({ ok: true });
});

export default r;
