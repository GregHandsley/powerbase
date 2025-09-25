import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isWeekLocked, isWithin24h } from '../lib/lock.js';

const prisma = new PrismaClient();
const r = Router();

/**
 * PATCH /instances/:id
 * Body: { racks?: number[], headcount?: number, notes?: string, areas?: any }
 * Who uses this?
 * - Practitioners when they tweak an instance (e.g., racks) from the request screen.
 * Guard:
 * - If week is locked or instance is already 'approved' → return 409 { locked:true }
 * - If <24h and not admin → 403
 * - Else apply changes.
 */
r.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { racks, headcount, notes, areas } = req.body as {
    racks?: number[], headcount?: number, notes?: string, areas?: any
  };

  const inst = await prisma.requestInstance.findUnique({
    where: { id },
    include: { Request: true, Allocations: true, LegendSync: true }
  });
  if (!inst) return res.status(404).json({ error: 'instance not found' });

  // Guards
  const isLocked = await isWeekLocked(inst.date);
  const within24 = isWithin24h(inst.date, inst.slotStart);

  const isAdmin = !!req.headers['x-admin']; // MVP: real auth later

  if (within24 && !isAdmin) {
    return res.status(403).json({
      error: 'Inside 24 hours. Practitioner edits are blocked. Ask an admin.'
    });
  }

  if (isLocked || inst.status === 'approved') {
    return res.status(409).json({
      locked: true,
      message: 'Week is locked or instance approved. Submit a change request instead.'
    });
  }

  // Not locked and not approved → normal edit
  const updatesReq: any = {};
  if (headcount != null) updatesReq.headcount = headcount;
  if (notes != null) updatesReq.notes = notes;
  if (areas != null) updatesReq.areasJson = areas;

  if (Object.keys(updatesReq).length) {
    await prisma.request.update({ where: { id: inst.requestId }, data: updatesReq });
  }

  if (Array.isArray(racks)) {
    const side = await prisma.side.findFirst({ where: { key: inst.side }});
    await prisma.allocation.upsert({
      where: { requestInstanceId: inst.id },
      update: { sideId: side!.id, racksJson: racks, status: 'approved' },
      create: { requestInstanceId: inst.id, sideId: side!.id, racksJson: racks, status: 'approved' }
    });
  }

  res.json({ ok: true });
});

export default r;
