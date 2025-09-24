export type SlotRange = { start: string; end: string };
export function isNowInSlot(nowISO: string, slot: SlotRange): boolean {
  const [h1,m1] = slot.start.split(':').map(Number);
  const [h2,m2] = slot.end.split(':').map(Number);
  const now = new Date(nowISO);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const s = new Date(d); s.setUTCHours(h1, m1, 0, 0);
  const e = new Date(d); e.setUTCHours(h2, m2, 0, 0);
  return now >= s && now < e;
}
export function nextSlotAfter(nowISO: string, slots: SlotRange[]): SlotRange | null {
  const now = new Date(nowISO);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const withDates = slots
    .filter(s => s && typeof s.start === 'string' && typeof s.end === 'string')
    .map(s => {
      const a = new Date(d); a.setUTCHours(...s.start.split(':').map(Number), 0,0);
      return { ...s, _a: a };
    })
    .sort((a,b)=>a._a.getTime()-b._a.getTime());
  for (const s of withDates) if (now < s._a) return { start: s.start, end: s.end };
  return null;
}
