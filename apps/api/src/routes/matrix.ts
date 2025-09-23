import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const r = Router();

function ymdToDate(ymd: string) {
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m-1, d, 12, 0, 0)); // noon UTC to avoid DST edges
}

function jsDowToIsoDow(jsDow: number) {
  // JS: 0=Sun..6=Sat → ISO-like: 1=Mon..7=Sun
  return jsDow === 0 ? 7 : jsDow;
}

r.get('/slots', async (req, res) => {
  const qs = (req.query.date as string) || new Date().toISOString().slice(0,10);
  const date = ymdToDate(qs);

  // find active term period for date
  const periods = await prisma.termPeriod.findMany({
    where: { start: { lte: date }, end: { gte: date } },
    orderBy: { start: 'desc' }
  });

  if (periods.length === 0) {
    return res.status(404).json({ error: `No TermPeriod covers ${qs}` });
  }
  const term = periods[0];

  const dow = jsDowToIsoDow(date.getUTCDay());
  const rows = await prisma.allocationMatrix.findMany({
    where: { termId: term.id, dayOfWeek: dow },
    orderBy: [{ sideId: 'asc' }, { slotStart: 'asc' }]
  });

  // group by side
  const sides = await prisma.side.findMany();
  const bySide: Record<string, any[]> = {};
  for (const s of sides) bySide[s.key] = [];
  for (const row of rows) {
    const sideKey = sides.find(s => s.id === row.sideId)?.key ?? `side-${row.sideId}`;
    bySide[sideKey].push({
      start: row.slotStart,
      end: row.slotEnd,
      mode: row.mode,
      perfCap: row.perfCap ?? null,
      generalCap: row.generalCap ?? null
    });
  }

  res.json({
    date: qs,
    term: { id: term.id, name: term.name, profile: term.profile },
    slots: bySide
  });
});

export default r;
