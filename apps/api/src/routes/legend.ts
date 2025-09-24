import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const r = Router();

/** POST /legend/:instanceId/mark-added */
r.post('/:instanceId/mark-added', async (req, res) => {
  try {
    const { instanceId } = req.params;

    // Ensure the instance exists; avoid FK error causing empty reply
    const inst = await prisma.requestInstance.findUnique({ where: { id: instanceId } });
    if (!inst) return res.status(404).json({ error: 'instance not found', instanceId });

    const row = await prisma.legendSync.upsert({
      where: { requestInstanceId: instanceId },
      update: { status: 'added' },
      create: { requestInstanceId: instanceId, status: 'added' }
    });
    res.json(row);
  } catch (e: any) {
    console.error('legend mark-added failed', e);
    res.status(500).json({ error: 'legend mark-added failed', detail: String(e?.message || e) });
  }
});

export default r;
