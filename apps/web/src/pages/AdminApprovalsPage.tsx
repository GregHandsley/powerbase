import React, { useEffect, useState } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Row = {
  instanceId: string; requestId: string; date: string;
  slotStart: string; slotEnd: string; side: 'Power'|'Base';
  racks: number[]; headcount: number; notes: string; status: string;
};

export default function AdminApprovalsPage() {
  const [data, setData] = useState<{newDrafts:Row[];manualNeeded:Row[]}>({newDrafts:[],manualNeeded:[]});
  const load = async ()=> setData(await fetch(`${API}/admin/requests`).then(r=>r.json()));
  useEffect(()=>{ load(); }, []);

  const approve = async (instanceId: string, applyTo: 'instance'|'block') => {
    await fetch(`${API}/admin/requests/${instanceId}/approve`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ applyTo })
    });
    await load();
  };

  const tbl = (rows: Row[]) => (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
      <thead><tr>
        <th>Date</th><th>Side</th><th>Slot</th><th>Racks</th><th>Heads</th><th>Notes</th><th>Action</th>
      </tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.instanceId}>
            <td>{r.date.slice(0,10)}</td>
            <td>{r.side}</td>
            <td>{r.slotStart}–{r.slotEnd}</td>
            <td>{r.racks.join(', ') || '—'}</td>
            <td>{r.headcount}</td>
            <td>{r.notes}</td>
            <td>
              <button onClick={()=>approve(r.instanceId,'instance')}>Approve (one)</button>{' '}
              <button onClick={()=>approve(r.instanceId,'block')}>Approve (block)</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ fontFamily:'system-ui', padding:24 }}>
      <h2>Admin — Approvals</h2>
      <h3>New Drafts</h3>
      {tbl(data.newDrafts)}
      <h3 style={{marginTop:24}}>Manual Needed</h3>
      {tbl(data.manualNeeded)}
    </div>
  );
}
