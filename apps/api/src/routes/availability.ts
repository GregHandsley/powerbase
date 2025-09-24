import { Router } from 'express';
import { PrismaClient, SlotMode } from '@prisma/client';
import { jsDowToIsoDow } from '../lib/time.js';
import { MAX_HEADS_PER_RACK_DEFAULT } from '../lib/config.js';

const prisma = new PrismaClient();
const r = Router();

type CheckBody = { requestId: string };

r.post('/check', async (req, res) => {
  const { requestId } = req.body as CheckBody;
  const request = await prisma.request.findUnique({ where: { id: requestId }});
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const instances = await prisma.requestInstance.findMany({
    where: { requestId },
    orderBy: { date: 'asc' }
  });

  // pattern info
  const pat = request.patternJson as any; // { slotStart, slotEnd, side }
  const selectedRacks: number[] = (request.areasJson as any)?.racks ?? [];
  const sideKey = pat.side as 'Power'|'Base';
  const side = await prisma.side.findFirst({ where: { key: sideKey }});
  if (!side) return res.status(400).json({ error: `Unknown side ${sideKey}` });

  // all racks for suggestion/validation
  const racksAll = await prisma.rack.findMany({ where: { sideId: side.id }, orderBy: { number: 'asc' }});

  // availability per instance
  const out = [];
  for (const inst of instances) {
    const date = new Date(inst.date);
    const ymd = date.toISOString().slice(0,10);
    const isoDow = jsDowToIsoDow(date.getUTCDay());

    // 1) Find term period covering date
    const term = await prisma.termPeriod.findFirst({
      where: { start: { lte: date }, end: { gte: date } },
      orderBy: { start: 'desc' }
    });
    if (!term) {
      out.push(row(inst, 'CONFLICT', [`No TermPeriod for ${ymd}`]));
      continue;
    }

    // 2) Matrix row for this side/day/slot
    const slot = await prisma.allocationMatrix.findFirst({
      where: {
        termId: term.id,
        sideId: side.id,
        dayOfWeek: isoDow,
        slotStart: inst.slotStart,
        slotEnd: inst.slotEnd
      }
    });
    if (!slot) {
      out.push(row(inst, 'CONFLICT', ['No slot defined in allocation matrix']));
      continue;
    }

    // 3) Mode rules
    const reasons: string[] = [];
    if (slot.mode === SlotMode.SSEHS) {
      out.push(row(inst, 'CONFLICT', ['SSEHS teaching block']));
      continue;
    }
    if (slot.mode === SlotMode.GENERAL_ONLY) {
      // performance request cannot be booked in general-only windows
      out.push(row(inst, 'CONFLICT', ['General-only window']));
      continue;
    }

    // 4) Headcount vs perf caps (HYBRID or PERFORMANCE_ONLY)
    const heads = request.headcount ?? 0;
    if ((slot.mode === SlotMode.PERFORMANCE_ONLY || slot.mode === SlotMode.HYBRID) && slot.perfCap != null) {
      if (heads > slot.perfCap) reasons.push(`Headcount ${heads} exceeds perf cap ${slot.perfCap}`);
    }

    // 5) Exception blocks overlap?
    const clashException = await prisma.exceptionBlock.findFirst({
      where: {
        sideId: side.id,
        start: { lte: new Date(`${ymd}T${inst.slotStart}:00Z`) },
        end:   { gte: new Date(`${ymd}T${inst.slotEnd}:00Z`) }
      }
    });
    if (clashException) reasons.push(`Exception: ${clashException.reason}`);

    // 6) Rack conflicts vs existing Allocations (approved|pending|provisional count as taken)
    const taken = await takenRacksForSlot(side.id, ymd, inst.slotStart, inst.slotEnd);
    const requestedRacks = [...selectedRacks].sort((a,b)=>a-b);

    const conflictWithTaken = requestedRacks.some(n => taken.has(n));
    if (!conflictWithTaken && reasons.length === 0) {
      out.push(row(inst, 'FIT', [], { taken: [...taken] }));
      continue;
    }

    // 7) Try alternative same-zone contiguous suggestion (Base = same zone; Power = any contiguous run)
    const required = requestedRacks.length;
    const suggestion = findSuggestion(racksAll, taken, required, side.key as 'Power'|'Base', requestedRacks);

    if (!suggestion) {
      out.push(row(inst, 'CONFLICT', reasons.length ? reasons : ['No contiguous alternative available'], { taken: [...taken] }));
    } else {
      out.push(row(inst, 'PARTIAL', reasons.length ? reasons : ['Requested racks unavailable'], { suggestion, taken: [...taken] }));
    }
  }

  res.json({ requestId, results: out });
});

// --- helpers ---
function row(inst: any, status: 'FIT'|'PARTIAL'|'CONFLICT', reasons: string[], extra?: any) {
  return {
    instanceId: inst.id,
    date: inst.date,
    slotStart: inst.slotStart,
    slotEnd: inst.slotEnd,
    status,
    reasons,
    ...extra
  };
}

async function takenRacksForSlot(sideId: number, ymd: string, start: string, end: string): Promise<Set<number>> {
  // fetch allocations that overlap exact slot (simple approach)
  const insts = await prisma.requestInstance.findMany({
    where: {
      side: (await prisma.side.findUnique({ where: { id: sideId }}))?.key
    },
    select: { id: true, slotStart: true, slotEnd: true, date: true }
  });

  const sameSlotIds = insts
    .filter(i => i.slotStart === start && i.slotEnd === end && i.date.toISOString().slice(0,10) === ymd)
    .map(i => i.id);

  if (sameSlotIds.length === 0) return new Set();

  const allocs = await prisma.allocation.findMany({
    where: { requestInstanceId: { in: sameSlotIds }, sideId, status: { in: ['approved','pending','provisional'] } }
  });

  const set = new Set<number>();
  for (const a of allocs) {
    const racks: number[] = (a.racksJson as any) ?? [];
    racks.forEach(n => set.add(n));
  }
  return set;
}

// Contiguity finder/suggestion
function findSuggestion(
  racksAll: { number: number, zone: number|null }[],
  taken: Set<number>,
  needed: number,
  side: 'Power'|'Base',
  requested: number[]
): number[] | null {
  const nums = racksAll.map(r => r.number);
  const zoneOf = (n:number)=> Math.floor((n-1)/6)+1;

  const tryWindow = (startIdx: number) => {
    const slice = nums.slice(startIdx, startIdx + needed);
    if (slice.length < needed) return null;
    // must be consecutive numbers
    for (let i=1;i<slice.length;i++) if (slice[i] !== slice[i-1]+1) return null;
    // must be free
    if (slice.some(n => taken.has(n))) return null;
    // base: must be same zone
    if (side === 'Base') {
      const z = zoneOf(slice[0]);
      if (!slice.every(n => zoneOf(n) === z)) return null;
    }
    return slice;
  };

  // priority: same zone as original request (Base), otherwise any contiguous
  const targetZone = side === 'Base' && requested.length ? zoneOf(requested[0]) : null;

  for (let i=0; i<nums.length; i++) {
    if (side === 'Base' && targetZone != null) {
      if (zoneOf(nums[i]) !== targetZone) continue;
    }
    const win = tryWindow(i);
    if (win) return win;
  }
  return null;
}

export default r;
