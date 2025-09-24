import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const r = Router();

r.get('/worklist', async (req, res) => {
    const { from, to, side, status } = req.query as Record<string, string>;
    if (!from || !to) return res.status(400).json({ error: 'from and to required (YYYY-MM-DD)' });
  
    const fromDate = new Date(from);
    const toDate = new Date(to);
  
    const whereInst: any = {
      date: { gte: fromDate, lte: toDate },
      status: 'approved'
    };
    if (side && (side === 'Power' || side === 'Base')) whereInst.side = side;
  
    const rows = await prisma.requestInstance.findMany({
      where: whereInst,
      include: { Request: true, Allocations: true, LegendSync: true },
      orderBy: [{ date: 'asc' }, { slotStart: 'asc' }]
    });
  
    // status filter: 'pending' | 'added' | 'all' (default: 'pending' for backward compat)
    const want = (status === 'all' || status === 'added' || status === 'pending') ? status : 'pending';
  
    const mapped = rows.map(i => ({
      instanceId: i.id,
      date: i.date.toISOString().slice(0,10),
      side: i.side as 'Power'|'Base',
      slotStart: i.slotStart,
      slotEnd: i.slotEnd,
      squad: i.Request.squadId ?? i.Request.userId,
      racks: (i.Allocations?.[0]?.racksJson as any) ?? [],
      legendStatus: (i.LegendSync?.status ?? 'pending') as 'pending'|'added',
      notes: i.Request.notes ?? ''
    }));
  
    const filtered =
      want === 'all' ? mapped :
      want === 'added' ? mapped.filter(r => r.legendStatus === 'added')
                       : mapped.filter(r => r.legendStatus !== 'added'); // pending
  
    res.json(filtered);
  });

/** POST /bookings/mark-added  Body: { instanceIds: string[] } */
r.post('/mark-added', async (req, res) => {
  const { instanceIds } = req.body as { instanceIds: string[] };
  if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
    return res.status(400).json({ error: 'instanceIds required' });
  }

  const results = [];
  for (const id of instanceIds) {
    const row = await prisma.legendSync.upsert({
      where: { requestInstanceId: id },
      update: { status: 'added' },
      create: { requestInstanceId: id, status: 'added' }
    });
    results.push(row);
  }
  res.json({ updated: results.length });
});

export default r;
