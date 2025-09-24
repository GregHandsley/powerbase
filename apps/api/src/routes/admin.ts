import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const r = Router();

/** GET /admin/requests
 * Returns three buckets:
 * - newDrafts: instances in 'draft'
 * - manualNeeded: instances flagged (flagsJson.conflict===true or reasons set later)
 * - overridesInsideLock: (placeholder for Sprint 6; returns empty for now)
 */
r.get('/requests', async (_req, res) => {
  const draft = await prisma.requestInstance.findMany({
    where: { status: 'draft' },
    include: { Request: true }
  });
  const manual = await prisma.requestInstance.findMany({
    where: { status: 'pending' }, // set by availability engine when PARTIAL, for example
    include: { Request: true }
  });
  res.json({
    newDrafts: draft.map(mapRow),
    manualNeeded: manual.map(mapRow),
    overridesInsideLock: []
  });
});

function mapRow(i: any) {
  const pat = i.Request.patternJson || {};
  const racks = (i.Request.areasJson?.racks) ?? [];
  return {
    instanceId: i.id,
    requestId: i.requestId,
    date: i.date,
    slotStart: i.slotStart,
    slotEnd: i.slotEnd,
    side: i.side,
    racks,
    headcount: i.Request.headcount,
    notes: i.Request.notes ?? '',
    status: i.status
  };
}

/** POST /admin/requests/:id/approve
 * Body: { applyTo: "instance" | "block", racks?: number[] }
 * Creates Allocation(s) with status 'approved', flips instance(s) to 'approved',
 * starts LegendSync rows with 'pending'.
 */
r.post('/requests/:id/approve', async (req, res) => {
  const { id } = req.params; // instanceId by default
  const { applyTo = 'instance', racks } = req.body as { applyTo?: 'instance'|'block'; racks?: number[] };

  // find the instance and its request
  const inst = await prisma.requestInstance.findUnique({ where: { id } , include: { Request: true }});
  if (!inst) return res.status(404).json({ error: 'instance not found' });

  // racks to use = payload override OR request’s racks
  const baseRacks: number[] = (racks && racks.length) ? racks : ((inst.Request.areasJson as any)?.racks ?? []);
  const side = await prisma.side.findFirst({ where: { key: inst.side }});
  if (!side) return res.status(400).json({ error: `unknown side ${inst.side}` });

  if (applyTo === 'instance') {
    const a = await approveOne(inst, side.id, baseRacks);
    return res.json({ approved: 1, allocations: [a] });
  }

  // block: approve all instances of this request with same slot/side (simple v1 rule)
  const siblings = await prisma.requestInstance.findMany({
    where: { requestId: inst.requestId, slotStart: inst.slotStart, slotEnd: inst.slotEnd, side: inst.side }
  });
  const out = [];
  for (const s of siblings) {
    const a = await approveOne(s, side.id, baseRacks);
    out.push(a);
  }
  res.json({ approved: out.length, allocations: out });
});

async function approveOne(inst: any, sideId: number, racks: number[]) {
  // upsert Allocation
  const alloc = await prisma.allocation.upsert({
    where: { requestInstanceId: inst.id },
    update: { sideId, racksJson: racks, status: 'approved' },
    create: { requestInstanceId: inst.id, sideId, racksJson: racks, status: 'approved' }
  });
  // set statuses
  await prisma.requestInstance.update({ where: { id: inst.id }, data: { status: 'approved' }});
  await prisma.legendSync.upsert({
    where: { requestInstanceId: inst.id },
    update: { status: 'pending' },
    create: { requestInstanceId: inst.id, status: 'pending' }
  });
  // notify kiosk (SSE)
  await pumpKiosk();
  return alloc;
}

// naive in-memory broadcaster for SSE (imported from kiosk router)
let pumpKiosk: () => Promise<void> = async () => {};
export const _wirePump = (fn: () => Promise<void>) => { pumpKiosk = fn; };

export default r;
