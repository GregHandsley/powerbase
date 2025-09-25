import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// compute the Monday 00:00 UTC of the week that starts next Monday
export function nextWeekMondayUTC(from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const dow = d.getUTCDay() || 7; // Mon=1..Sun=7
  const daysToMon = 8 - dow;     // how many days to next Monday
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + daysToMon);
  mon.setUTCHours(0,0,0,0);
  return mon;
}

// is it Thu 00:00 UTC for the next-week lock?
export function isLockMoment(now = new Date()) {
  const dow = now.getUTCDay() || 7;
  return dow === 4 && now.getUTCHours() === 0; // Thu 00:00
}

export async function runWeeklyLock(now = new Date()) {
  // Only proceed on Thu 00:00; safe to call from a daily cron
  if (!isLockMoment(now)) return { skipped: true };

  const weekStart = nextWeekMondayUTC(now);
  const exists = await prisma.lockPeriod.findUnique({ where: { weekStart } });
  if (exists) return { skipped: true, reason: 'already locked' };

  const row = await prisma.lockPeriod.create({
    data: { weekStart, lockedAt: new Date(), note: 'Auto lock' }
  });
  return { created: row.id, weekStart };
}
