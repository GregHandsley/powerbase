import React, { useEffect, useState } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ChangeQueuePage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => setRows(await fetch(`${API}/changes/queue`).then(r=>r.json()));
  useEffect(()=>{ load(); }, []);

  const decide = async (id: string, approve: boolean) => {
    await fetch(`${API}/changes/${id}/decide`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ approve, decidedByUserId: 'admin@powerbase' })
    });
    await load();
  };

  return (
    <div style={{ fontFamily:'system-ui', padding:24 }}>
      <h2>Change Requests</h2>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead><tr><th>Date</th><th>Side</th><th>Slot</th><th>Reason</th><th>Payload</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{String(r.date).slice(0,10)}</td>
              <td>{r.side}</td>
              <td>{r.slotStart}–{r.slotEnd}</td>
              <td>{r.reason}</td>
              <td><pre style={{margin:0}}>{JSON.stringify(r.payload)}</pre></td>
              <td>
                <button onClick={()=>decide(r.id, true)}>Approve</button>{' '}
                <button onClick={()=>decide(r.id, false)}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
