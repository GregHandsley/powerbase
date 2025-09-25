import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function isWeekLocked(dateUTC: Date) {
  const d = new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate()));
  const lock = await prisma.lockPeriod.findFirst({
    where: { weekStart: { lte: d } },
    orderBy: { weekStart: 'desc' }
  });
  if (!lock) return false;
  const end = new Date(lock.weekStart); end.setUTCDate(end.getUTCDate() + 7);
  return d >= lock.weekStart && d < end;
}

export function isWithin24h(instanceDate: Date, slotStartHHmm: string, now = new Date()) {
  const [h,m] = slotStartHHmm.split(':').map(Number);
  const start = new Date(Date.UTC(instanceDate.getUTCFullYear(), instanceDate.getUTCMonth(), instanceDate.getUTCDate(), h, m, 0));
  const diffMs = start.getTime() - now.getTime();
  return diffMs <= 24 * 3600 * 1000;
}
