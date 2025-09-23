import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { PrismaClient, RackType } from '@prisma/client';
import { SlotMode, SideProfile } from '@prisma/client';

const here = path.dirname(fileURLToPath(import.meta.url));
// Load env from repo root (two levels up from infra/prisma)
dotenv.config({ path: path.resolve(here, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  // sides
  await prisma.side.upsert({ where: { id: 1 }, update: {}, create: { id: 1, key: 'Power' } });
  await prisma.side.upsert({ where: { id: 2 }, update: {}, create: { id: 2, key: 'Base' } });

  // Power racks 1–20:
  // full: 1–5, 11–15
  // half: 8–10, 16–20
  // stands: 6–7
  const powerRacks: { number: number; type: RackType }[] = [
    ...Array.from({ length: 5 }, (_, i) => ({ number: 1 + i, type: RackType.FULL })),
    { number: 6, type: RackType.STAND },
    { number: 7, type: RackType.STAND },
    ...Array.from({ length: 3 }, (_, i) => ({ number: 8 + i, type: RackType.HALF })),
    ...Array.from({ length: 5 }, (_, i) => ({ number: 11 + i, type: RackType.FULL })),
    ...Array.from({ length: 5 }, (_, i) => ({ number: 16 + i, type: RackType.HALF }))
  ];

  for (const r of powerRacks) {
    await prisma.rack.upsert({
      where: { sideId_number: { sideId: 1, number: r.number } },
      update: { type: r.type, zone: null },
      create: { sideId: 1, number: r.number, type: r.type }
    });
  }

  // Base racks 1–24 with zones:
  // Zone1: 1–6, Zone2: 7–12, Zone3: 13–18, Zone4: 19–24
  const baseRacks = Array.from({ length: 24 }, (_, i) => {
    const number = i + 1;
    const zone = number <= 6 ? 1 : number <= 12 ? 2 : number <= 18 ? 3 : 4;
    return { number, zone };
  });

  for (const r of baseRacks) {
    await prisma.rack.upsert({
      where: { sideId_number: { sideId: 2, number: r.number } },
      update: { type: RackType.FULL, zone: r.zone },
      create: { sideId: 2, number: r.number, type: RackType.FULL, zone: r.zone }
    });
  }

  // Areas
  await upsertArea(1, 'cables', 'Cables');
  await upsertArea(1, 'dumbbells', 'Dumbbells');
  await upsertArea(1, 'fixed_machines', 'Fixed-resistance Machines');
  await upsertArea(1, 'functional', 'Functional Area');
  await upsertArea(1, 'sprint_near', 'Sprint Track (Near third)');
  await upsertArea(1, 'sprint_mid', 'Sprint Track (Mid third)');
  await upsertArea(1, 'sprint_far', 'Sprint Track (Far third)');
  await upsertArea(1, 'cardio_wattbikes', 'Cardio (Wattbikes)', { unitsCount: 12 });
  await upsertArea(1, 'racks', 'Racks');

  await upsertArea(2, 'cardio_wattbikes', 'Cardio (Wattbikes)', { unitsCount: 20 });
  await upsertArea(2, 'near_dumbbells', 'Near Dumbbells');
  await upsertArea(2, 'near_fixed_machines', 'Near Fixed-resistance Machines');
  await upsertArea(2, 'far_fixed_machines', 'Far Fixed-resistance Machines');
  await upsertArea(2, 'far_dumbbells', 'Far Dumbbells');
  await upsertArea(2, 'boxing_mezz', 'Boxing Mezzanine', { bookable: true });
  await upsertArea(2, 'racks', 'Racks');

  // Import allocation matrices (term/vacation)
  const termPath = path.resolve(here, 'allocations.term.json');
  const vacPath  = path.resolve(here, 'allocations.vacation.json');
  await importMatrix(termPath);
  await importMatrix(vacPath);

  console.log('Seed complete: Power (20 racks + areas), Base (24 racks + areas)');
}

async function upsertArea(sideId: number, key: string, name: string, opts?: { maxHeads?: number | null; unitsCount?: number | null; bookable?: boolean }) {
  const { maxHeads = null, unitsCount = null, bookable = true } = opts ?? {};
  await prisma.area.upsert({
    where: { sideId_key: { sideId, key } },
    update: { name, maxHeads: maxHeads ?? undefined, unitsCount: unitsCount ?? undefined, bookable },
    create: { sideId, key, name, maxHeads: maxHeads ?? undefined, unitsCount: unitsCount ?? undefined, bookable }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});


type MatrixFile = {
  period: { name: string; start: string; end: string; profile: 'term'|'vacation' };
  slots: Array<{
    side: 'Power' | 'Base';
    dow: number;            // 1..7
    start: string;          // "07:30"
    end: string;            // "09:00"
    mode: 'PERFORMANCE_ONLY' | 'HYBRID' | 'GENERAL_ONLY' | 'SSEHS';
    perfCap: number | null;
    generalCap: number | null;
  }>;
};

async function importMatrix(jsonPath: string) {
  if (!fs.existsSync(jsonPath)) {
    console.log(`Matrix file not found (skipping): ${jsonPath}`);
    return;
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw) as MatrixFile;

  // create or update TermPeriod
  const term = await prisma.termPeriod.upsert({
    where: { name: data.period.name },
    update: { start: new Date(data.period.start), end: new Date(data.period.end), profile: data.period.profile as SideProfile },
    create: { name: data.period.name, start: new Date(data.period.start), end: new Date(data.period.end), profile: data.period.profile as SideProfile }
  });

  // side lookup
  const sides = await prisma.side.findMany();
  const sideIdByKey = new Map(sides.map(s => [s.key, s.id] as const));

  // clear any existing matrix rows for this term (safe for seed)
  await prisma.allocationMatrix.deleteMany({ where: { termId: term.id } });

  for (const s of data.slots) {
    const sideId = sideIdByKey.get(s.side);
    if (!sideId) throw new Error(`Unknown side key in matrix import: ${s.side}`);

    await prisma.allocationMatrix.create({
      data: {
        termId: term.id,
        sideId,
        dayOfWeek: s.dow,
        slotStart: s.start,
        slotEnd: s.end,
        mode: s.mode as SlotMode,
        perfCap: s.perfCap ?? undefined,
        generalCap: s.generalCap ?? undefined
      }
    });
  }

  console.log(`Imported allocation matrix: ${data.period.name} (${data.slots.length} slots)`);
}

// (moved into main to avoid top-level await)