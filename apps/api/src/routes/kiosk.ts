import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isNowInSlot, nextSlotAfter } from '../lib/slots.js';

const prisma = new PrismaClient();
const r = Router();

// simple token for MVP (env or fixed string)
const KIOSK_TOKEN = process.env.KIOSK_TOKEN || 'demo-kiosk-token';

// Build current+next state
async function buildState(nowISO: string) {
  const date = nowISO.slice(0,10);
  const sides = await prisma.side.findMany(); // Power/Base
  const out: Record<string, any> = {};
  for (const s of sides) {
    // Which slot rows exist today for this side?
    const term = await prisma.termPeriod.findFirst({
      where: { start: { lte: new Date(nowISO) }, end: { gte: new Date(nowISO) } },
      orderBy: { start: 'desc' }
    });
    const dow = ((new Date(nowISO)).getUTCDay() || 7);
    const slots = await prisma.allocationMatrix.findMany({
      where: { termId: term?.id, sideId: s.id, dayOfWeek: dow },
      orderBy: { slotStart: 'asc' },
      select: { slotStart: true, slotEnd: true }
    });

    const currentSlot = slots.find(x => isNowInSlot(nowISO, { start: x.slotStart, end: x.slotEnd }));
    const nextSlot = nextSlotAfter(nowISO, slots.map(x => ({ start: x.slotStart, end: x.slotEnd })));

    // Find approved allocations for currentSlot
    const current = currentSlot ? await prisma.requestInstance.findMany({
      where: {
        side: s.key,
        date: new Date(date),
        slotStart: currentSlot.slotStart,
        slotEnd: currentSlot.slotEnd,
        status: 'approved'
      },
      include: { Request: true, Allocations: true, LegendSync: true }
    }) : [];

    out[s.key] = {
      currentSlot: currentSlot ?? null,
      nextSlot: nextSlot ?? null,
      // Map to lightweight rows for the screen
      currentAllocations: current.map(i => ({
        squad: i.Request.squadId ?? i.Request.userId,
        racks: (i.Allocations?.[0]?.racksJson as any) ?? [],
        legend: i.LegendSync?.status ?? 'pending',
        notes: i.Request.notes ?? ''
      }))
    };
  }
  return out;
}

/** GET /kiosk/state?now=2025-09-24T12:00:00Z */
r.get('/state', async (req, res) => {
  const nowISO = (req.query.now as string) || new Date().toISOString();
  const state = await buildState(nowISO);
  res.json({ now: nowISO, state });
});

/** GET /kiosk/stream/:token — SSE broadcast on changes */
const clients: Array<{ id: number, res: any }> = [];
let nextId = 1;

r.get('/stream/:token', async (req, res) => {
  if (req.params.token !== KIOSK_TOKEN) return res.status(403).end();

  res.writeHead(200, {
    'Content-Type':'text/event-stream',
    'Cache-Control':'no-cache',
    'Connection':'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  const id = nextId++;
  clients.push({ id, res });

  // send initial state
  const state = await buildState(new Date().toISOString());
  res.write(`data: ${JSON.stringify({ type:'init', payload: state })}\n\n`);

  req.on('close', () => {
    const idx = clients.findIndex(c => c.id === id);
    if (idx >= 0) clients.splice(idx,1);
  });
});

// Called by admin approvals to push updates
export async function pumpKioskNow() {
  if (clients.length === 0) return;
  const state = await buildState(new Date().toISOString());
  const payload = `data: ${JSON.stringify({ type:'update', payload: state })}\n\n`;
  for (const c of clients) c.res.write(payload);
}

export default r;
