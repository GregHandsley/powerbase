export type Side = { id: number; key: string };
export type Rack = { id: string; sideId: number; number: number; type: 'FULL'|'HALF'|'STAND'; zone: number|null };
export type Area = { id: string; sideId: number; key: string; name: string; maxHeads?: number|null; unitsCount?: number|null; bookable: boolean };

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function fetchSides(): Promise<Side[]> {
  const r = await fetch(`${API}/inventory/sides`); return r.json();
}
export async function fetchRacks(): Promise<Rack[]> {
  const r = await fetch(`${API}/inventory/racks`); return r.json();
}
export async function fetchAreas(): Promise<Area[]> {
  const r = await fetch(`${API}/inventory/areas`); return r.json();
}

export async function patchInstance(
  instanceId: string,
  payload: { racks?: number[]; headcount?: number; notes?: string; areas?: any },
  opts?: { admin?: boolean }
) {
  const res = await fetch(`${API}/instances/${instanceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.admin ? { 'x-admin': 'true' } : {})
    },
    body: JSON.stringify(payload)
  });
  return res; // caller inspects status
}

export async function submitChangeRequest(args: {
  instanceId: string;
  userId: string;       // email or id
  reason?: string;
  payload: { racks?: number[]; headcount?: number; notes?: string; areas?: any };
}) {
  const res = await fetch(`${API}/changes/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMatrixSlots(dateISO: string) {
  const r = await fetch(`${API}/matrix/slots?date=${dateISO}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createDraftRequest(payload: {
  squadId?: string;
  userId: string;
  start: string;         // ISO date for first week (yyyy-mm-dd)
  end: string;           // ISO date for last week (yyyy-mm-dd)
  slotStart: string;     // "07:30"
  slotEnd: string;       // "09:00"
  side: 'Power'|'Base';
  headcount: number;
  areasJson: { racks?: number[]; areas?: any };
  notes?: string;
}) {
  const r = await fetch(`${API}/requests/draft`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // { id }
}

export async function expandDraftInstances(requestId: string) {
  const r = await fetch(`${API}/requests/${requestId}/instances`, { method:'POST' });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // { count }
}

export async function checkAvailability(requestId: string) {
  const r = await fetch(`${API}/availability/check`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ requestId })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // [{ date, status, reasons, suggestion, taken }]
}