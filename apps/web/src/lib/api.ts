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
