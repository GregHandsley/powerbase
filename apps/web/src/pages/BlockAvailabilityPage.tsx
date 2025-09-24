import React, { useEffect, useState } from 'react';
import { RackPicker } from '../components/RackPicker';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Result = {
  instanceId: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  status: 'FIT'|'PARTIAL'|'CONFLICT';
  reasons: string[];
  suggestion?: number[];
  taken?: number[];
};

export default function BlockAvailabilityPage() {
  const [requestId, setRequestId] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [meta, setMeta] = useState<{side:'Power'|'Base', racks:number[]} | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<Result | null>(null);

  const check = async () => {
    if (!requestId) return;
    const r = await fetch(`${API}/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ requestId })
    });
    const data = await r.json();
    setResults(data.results);

    // fetch the request to know side + current racks (for overlay)
    const rq = await fetch(`${API}/debug/request/${requestId}`).then(r=>r.json()); // see debug route below
    setMeta({ side: rq.side, racks: rq.racks });
  };

  return (
    <div style={{ fontFamily:'system-ui', padding:24 }}>
      <h2>Block Availability</h2>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
        <input placeholder="requestId" value={requestId} onChange={e=>setRequestId(e.target.value)} style={{ width:360 }} />
        <button onClick={check}>Check Availability</button>
      </div>

      {results.length > 0 && (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr>
              <th style={{textAlign:'left',borderBottom:'1px solid #e5e7eb'}}>Date</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #e5e7eb'}}>Slot</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #e5e7eb'}}>Status</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #e5e7eb'}}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.instanceId} onClick={()=>setSelectedInstance(r)} style={{ cursor:'pointer' }}>
                <td style={{padding:'6px 0'}}>{r.date.slice(0,10)}</td>
                <td>{r.slotStart}–{r.slotEnd}</td>
                <td>
                  {r.status === 'FIT' && <span style={{ color:'#059669' }}>●</span>}
                  {r.status === 'PARTIAL' && <span style={{ color:'#f59e0b' }}>●</span>}
                  {r.status === 'CONFLICT' && <span style={{ color:'#dc2626' }}>●</span>}
                  {' '}{r.status}
                </td>
                <td style={{color:'#6b7280'}}>{r.reasons.join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* overlay map for a selected week (read-only) */}
      {selectedInstance && meta && (
        <div style={{ marginTop:16 }}>
          <h3>Week detail — {selectedInstance.date.slice(0,10)}</h3>
          <div style={{ display:'flex', gap:24 }}>
            <div>
              <p style={{margin:'4px 0'}}>Requested racks: {meta.racks.join(', ') || '—'}</p>
              {selectedInstance.suggestion && (
                <p style={{margin:'4px 0', color:'#b45309'}}>Suggestion: {selectedInstance.suggestion.join(', ')}</p>
              )}
              {selectedInstance.taken && (
                <p style={{margin:'4px 0', color:'#6b7280'}}>Taken: {selectedInstance.taken.join(', ') || '—'}</p>
              )}
            </div>
            <div>
              {/* reuse RackPicker but in read-only "display" mode by not passing onChange */}
              <RackPicker
                side={meta.side}
                selected={selectedInstance.suggestion ?? meta.racks}
                onChange={()=>{}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
