import React, { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN = import.meta.env.VITE_KIOSK_TOKEN || 'demo-kiosk-token';

type KioskState = Record<string, {
  currentSlot: { slotStart:string; slotEnd:string } | null;
  nextSlot: { slotStart:string; slotEnd:string } | null;
  currentAllocations: Array<{ squad:string; racks:number[]; legend:string; notes:string }>;
}>;

function useQueryNow(): string | null {
  const p = new URLSearchParams(window.location.search);
  const v = p.get('now');
  return v && v.trim().length ? v : null;
}

export default function KioskPage() {
  const [state, setState] = useState<KioskState>({});
  const queryNow = useQueryNow();

  // If ?now is provided: fetch a snapshot once and DO NOT open SSE.
  useEffect(() => {
    if (!queryNow) return;
    fetch(`${API}/kiosk/state?now=${encodeURIComponent(queryNow)}`)
      .then(r => r.json())
      .then((j) => setState(j.state))
      .catch(console.error);
  }, [queryNow]);

  // Live mode (no ?now): open SSE stream.
  useEffect(() => {
    if (queryNow) return; // snapshot mode
    const es = new EventSource(`${API}/kiosk/stream/${TOKEN}`);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init' || msg.type === 'update') setState(msg.payload);
      } catch {}
    };
    return () => es.close();
  }, [queryNow]);

  const board = (side: string) => {
    const s = state[side];
    if (!s) return <div/>;
    return (
      <div style={{ background:'#111827', color:'#e5e7eb', padding:16, borderRadius:12 }}>
        <h2 style={{ marginTop:0 }}>{side}</h2>
        <div style={{ display:'flex', gap:12, fontSize:14, color:'#9ca3af' }}>
          <div>Now: {s.currentSlot ? `${s.currentSlot.slotStart}–${s.currentSlot.slotEnd}` : '—'}</div>
          <div>Next: {s.nextSlot ? `${s.nextSlot.slotStart}–${s.nextSlot.slotEnd}` : '—'}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:12 }}>
          {s.currentAllocations.map((a,i)=>(
            <div key={i} style={{ background:'#1f2937', borderRadius:8, padding:12 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{a.squad}</div>
              <div style={{ fontSize:14, marginTop:4 }}>Racks: {a.racks.join(', ')}</div>
              <div style={{ fontSize:12, color:a.legend==='added'?'#10b981':'#f59e0b' }}>
                Legend: {a.legend==='added' ? '✅ Added' : '⏳ Pending'}
              </div>
              {a.notes && <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{a.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding:24, background:'#0b1020', minHeight:'100vh' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {board('Power')}
        {board('Base')}
      </div>
    </div>
  );
}
