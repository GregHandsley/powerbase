import { Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const r = Router();

/**
 * POST /requests/draft
 * Body: { userId, squadId?, start, end, dow: [1,3], slotStart, slotEnd, side, headcount, racks: [..], areas: [".."], notes }
 */
r.post("/draft", async (req, res) => {
  const { userId, squadId, start, end, dow, slotStart, slotEnd, side, headcount, racks, areas, notes } = req.body;

  const request = await prisma.request.create({
    data: {
      userId,
      squadId,
      start: new Date(start),
      end: new Date(end),
      headcount,
      notes,
      patternJson: { dow, slotStart, slotEnd, side },
      areasJson: { racks, areas }
    }
  });

  res.json(request);
});

/**
 * POST /requests/:id/instances
 * Expands block booking into RequestInstance rows
 */
r.post("/:id/instances", async (req, res) => {
  const { id } = req.params;
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ error: "Not found" });

  const { dow = [], slotStart, slotEnd, side } = request.patternJson as any;
  const startDate = new Date(request.start);
  const endDate = new Date(request.end);

  const instances: any[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const jsDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // ISO
    if (dow.includes(jsDow)) {
      instances.push({
        requestId: request.id,
        date: new Date(d),
        slotStart,
        slotEnd,
        side,
        flagsJson: {}
      });
    }
  }

  await prisma.requestInstance.createMany({ data: instances });
  res.json({ created: instances.length });
});

export default r;
