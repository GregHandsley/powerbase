import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Row = {
  instanceId: string;
  date: string;
  side: 'Power'|'Base';
  slotStart: string;
  slotEnd: string;
  squad: string;
  racks: number[];
  legendStatus: 'pending'|'added';
  notes: string;
};

function iso(d: Date) { return d.toISOString().slice(0,10); }

export default function BookingsWorklistPage() {
  const today = new Date();
  const next7 = new Date(); next7.setUTCDate(today.getUTCDate()+7);

  const [from, setFrom] = useState(iso(today));
  const [to, setTo] = useState(iso(next7));
  const [side, setSide] = useState<'All'|'Power'|'Base'>('All');
  const [status, setStatus] = useState<'pending'|'added'|'all'>('pending'); // NEW
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const load = async () => {
    const qs = new URLSearchParams({ from, to, status, ...(side!=='All'?{side}:{}) }); // NEW
    const data = await fetch(`${API}/bookings/worklist?${qs}`).then(r=>r.json());
    setRows(data);
    setSelected([]);
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);

  const markAdded = async () => {
    if (selected.length === 0) return;
    await fetch(`${API}/bookings/mark-added`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ instanceIds: selected })
    });
    await load();
  };

  const Badge = ({ s }: { s:'pending'|'added' }) => (
    <span style={{
      padding:'2px 6px', borderRadius:999,
      background: s==='added' ? '#064e3b' : '#7c2d12',
      color:'#fff', fontSize:12
    }}>
      {s==='added' ? 'Added' : 'Pending'}
    </span>
  );

  return (
    <div style={{ fontFamily:'system-ui', padding:24 }}>
      <h2>Bookings — Legend Worklist</h2>

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <label>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label>To <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <label>Side
          <select value={side} onChange={e=>setSide(e.target.value as any)}>
            <option>All</option><option>Power</option><option>Base</option>
          </select>
        </label>
        <label>Status
          <select value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="pending">Pending</option>
            <option value="added">Added</option>
            <option value="all">All</option>
          </select>
        </label>
        <button onClick={load}>Refresh</button>
        <button onClick={markAdded} disabled={selected.length===0 || status==='added'}>
          Mark {selected.length} Added ✅
        </button>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead>
          <tr>
            <th></th><th>Date</th><th>Side</th><th>Slot</th><th>Squad</th><th>Racks</th><th>Notes</th><th>Legend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.instanceId}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(r.instanceId)}
                  onChange={()=>toggle(r.instanceId)}
                  disabled={r.legendStatus==='added'} // already added → not selectable
                />
              </td>
              <td>{r.date}</td>
              <td>{r.side}</td>
              <td>{r.slotStart}–{r.slotEnd}</td>
              <td>{r.squad}</td>
              <td>{r.racks.join(', ')}</td>
              <td>{r.notes}</td>
              <td><Badge s={r.legendStatus}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
