import React, { useEffect, useState } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Row = { instanceId:string; date:string; side:string; slotStart:string; slotEnd:string; legend:string; squad:string; racks:number[] };

export default function LegendTickPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = async ()=>{
    const today = new Date().toISOString().slice(0,10);
    const res = await fetch(`${API}/kiosk/state?now=${today}T12:00:00Z`).then(r=>r.json());
    const toRows: Row[] = [];
    for (const side of Object.keys(res.state)) {
      const cur = res.state[side].currentAllocations as any[];
      cur.forEach((a: any) => toRows.push({
        instanceId: a.instanceId ?? '', // not in kiosk state by default; add if needed
        date: today, side, slotStart: res.state[side].currentSlot?.slotStart ?? '',
        slotEnd: res.state[side].currentSlot?.slotEnd ?? '',
        legend: a.legend, squad: a.squad, racks: a.racks
      }));
    }
    setRows(toRows);
  };
  useEffect(()=>{ load(); },[]);

  const mark = async (instanceId: string) => {
    if (!instanceId) return alert('instanceId missing in this demo row');
    await fetch(`${API}/legend/${instanceId}/mark-added`, { method: 'POST' });
    await load();
  };

  return (
    <div style={{ fontFamily:'system-ui', padding:24 }}>
      <h2>Bookings — Mark “Added to Legend”</h2>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead><tr><th>Date</th><th>Side</th><th>Slot</th><th>Squad</th><th>Racks</th><th>Legend</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{r.date}</td><td>{r.side}</td><td>{r.slotStart}–{r.slotEnd}</td>
              <td>{r.squad}</td><td>{r.racks.join(', ')}</td><td>{r.legend}</td>
              <td><button onClick={()=>mark(r.instanceId)}>Mark Added ✅</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{color:'#6b7280', fontSize:12}}>Note: in this MVP, kiosk state doesn’t include instanceId; if you want this fully wired, we’ll add it in the kiosk builder (easy).</p>
    </div>
  );
}
