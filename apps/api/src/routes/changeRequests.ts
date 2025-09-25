import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isWeekLocked, isWithin24h } from '../lib/lock.js';

const prisma = new PrismaClient();
const r = Router();

/** POST /changes/submit
 * Body: { instanceId, userId, reason?, payload }
 * payload example: { racks:[...], headcount: N, notes: "...", areas: {...} }
 */
r.post('/submit', async (req, res) => {
  const { instanceId, userId, reason, payload } = req.body as any;
  const inst = await prisma.requestInstance.findUnique({ where: { id: instanceId }, include: { Request: true }});
  if (!inst) return res.status(404).json({ error: 'instance not found' });

  // Guard rules
  const dateUTC = new Date(Date.UTC(inst.date.getUTCFullYear(), inst.date.getUTCMonth(), inst.date.getUTCDate()));
  const weekLocked = await isWeekLocked(dateUTC);

  // If <24h → practitioner cannot submit (must be admin)
  if (isWithin24h(inst.date, inst.slotStart) && !req.headers['x-admin']) {
    return res.status(403).json({ error: 'Inside 24h: practitioner edits blocked. Contact admin.' });
  }

  // If not locked and instance is still draft → they should edit the draft route instead
  if (!weekLocked && inst.status === 'draft') {
    return res.status(400).json({ error: 'Instance not in locked week; edit your draft instead.' });
  }

  const cr = await prisma.changeRequest.create({
    data: {
      requestInstanceId: instanceId,
      createdByUserId: userId,
      reason: reason ?? '',
      payload
    }
  });

  // notify admin
  await prisma.notification.create({
    data: {
      userId: 'ADMIN_GROUP', // replace with real routing later
      type: 'change_request_submitted',
      payload: { instanceId, by: userId, reason: reason ?? '', payload }
    }
  });

  res.json({ id: cr.id, status: 'pending' });
});

/** POST /changes/:id/decide
 * Body: { approve: boolean, decidedByUserId: string, reason?: string }
 * If approved → apply payload to instance/allocation
 */
r.post('/:id/decide', async (req, res) => {
  const { id } = req.params;
  const { approve, decidedByUserId, reason } = req.body as any;

  const cr = await prisma.changeRequest.findUnique({ where: { id }, include: { RequestInstance: { include: { Request: true, Allocations: true }}}});
  if (!cr) return res.status(404).json({ error: 'not found' });
  if (cr.status !== 'pending') return res.status(400).json({ error: 'already decided' });

  let newAllocation: any = null;

  if (approve) {
    // apply changes (limited v1: racks/headcount/notes/areas)
    const payload = cr.payload as any;

    if (payload?.racks) {
      // upsert allocation with new racks
      const side = await prisma.side.findFirst({ where: { key: cr.RequestInstance.side }});
      newAllocation = await prisma.allocation.upsert({
        where: { requestInstanceId: cr.requestInstanceId },
        update: { sideId: side!.id, racksJson: payload.racks, status: 'approved' },
        create: { requestInstanceId: cr.requestInstanceId, sideId: side!.id, racksJson: payload.racks, status: 'approved' }
      });
    }
    const mutReq: any = {};
    if (payload?.headcount != null) mutReq.headcount = payload.headcount;
    if (payload?.notes != null) mutReq.notes = payload.notes;
    if (payload?.areas) mutReq.areasJson = payload.areas;
    if (Object.keys(mutReq).length) {
      await prisma.request.update({ where: { id: cr.RequestInstance.requestId }, data: mutReq });
    }
  }

  await prisma.changeRequest.update({
    where: { id },
    data: {
      status: approve ? 'approved' : 'rejected',
      decidedByUserId,
      decidedAt: new Date(),
      reason: reason ?? ''
    }
  });

  // notifications
  await prisma.notification.create({
    data: {
      userId: cr.createdByUserId,
      type: 'change_request_decided',
      payload: { approved: !!approve, reason: reason ?? '', instanceId: cr.requestInstanceId, newAllocation }
    }
  });

  res.json({ ok: true, approved: !!approve, newAllocation });
});

/** GET /changes/queue — admin inbox */
r.get('/queue', async (_req, res) => {
  const rows = await prisma.changeRequest.findMany({
    where: { status: 'pending' },
    include: { RequestInstance: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json(rows.map(r => ({
    id: r.id,
    instanceId: r.requestInstanceId,
    date: r.RequestInstance.date,
    side: r.RequestInstance.side,
    slotStart: r.RequestInstance.slotStart,
    slotEnd: r.RequestInstance.slotEnd,
    reason: r.reason,
    payload: r.payload,
    createdAt: r.createdAt
  })));
});
export default r;
