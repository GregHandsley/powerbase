import React, { useEffect, useState } from 'react';

type MatrixResponse = {
  date: string;
  term: { id: string; name: string; profile: 'term'|'vacation' };
  slots: Record<'Power'|'Base'|string, Array<{ start:string; end:string; mode:string; perfCap:number|null; generalCap:number|null }>>;
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function SlotsViewerPage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/matrix/slots?date=${date}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(setData).catch(e => setErr(String(e)));
  }, [date]);

  const table = (side: 'Power'|'Base') => {
    const rows = data?.slots?.[side] ?? [];
    return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead><tr>
          <th style={{ textAlign:'left', borderBottom:'1px solid #e5e7eb' }}>Time</th>
          <th style={{ textAlign:'left', borderBottom:'1px solid #e5e7eb' }}>Mode</th>
          <th style={{ textAlign:'left', borderBottom:'1px solid #e5e7eb' }}>Perf cap</th>
          <th style={{ textAlign:'left', borderBottom:'1px solid #e5e7eb' }}>General cap</th>
        </tr></thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={i}>
              <td style={{ padding:'6px 0' }}>{s.start}–{s.end}</td>
              <td>{s.mode}</td>
              <td>{s.perfCap ?? '—'}</td>
              <td>{s.generalCap ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ fontFamily:'system-ui', padding:24 }}>
      <h2>Slots Viewer</h2>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <label>Date: <input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        {data && <div style={{ marginLeft:12, color:'#6b7280' }}>
          Term: <strong>{data.term.name}</strong> ({data.term.profile})
        </div>}
      </div>
      {err && <div style={{ color:'#b91c1c' }}>Error: {err}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div>
          <h3>Power</h3>
          {table('Power')}
        </div>
        <div>
          <h3>Base</h3>
          {table('Base')}
        </div>
      </div>
    </div>
  );
}
