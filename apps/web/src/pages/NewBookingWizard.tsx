import React, { useEffect, useMemo, useState } from 'react';
import { RackPicker } from '../components/RackPicker';
import { getMatrixSlots, createDraftRequest, expandDraftInstances, checkAvailability } from '../lib/api';

type Side = 'Power'|'Base';
const todayISO = new Date().toISOString().slice(0,10);
const addWeeks = (iso:string, w:number) => {
  const d = new Date(iso); d.setDate(d.getDate() + w*7);
  return d.toISOString().slice(0,10);
};

export default function NewBookingWizard() {
  // Step control
  const [step, setStep] = useState<1|2|3>(1);

  // Form fields
  const [userId] = useState('coach@powerbase'); // replace with real auth later
  const [side, setSide] = useState<Side>('Base');
  const [start, setStart] = useState(todayISO);
  const [weeks, setWeeks] = useState(4);
  const end = useMemo(()=>addWeeks(start, Math.max(1, weeks-1)), [start, weeks]);
  const [slotStart, setSlotStart] = useState('07:30');
  const [slotEnd, setSlotEnd]     = useState('09:00');
  const [headcount, setHeadcount] = useState(8);
  const [notes, setNotes]         = useState('');
  const [areas, setAreas]         = useState<{[k:string]:boolean}>({});
  const [racks, setRacks]         = useState<number[]>([]);

  // Load slots for chosen date (so you can pick valid 90-min blocks)
  const [slots, setSlots] = useState<Array<{start:string; end:string; side:string; mode:string}>>([]);
  useEffect(() => {
    getMatrixSlots(start).then(s => {
      // s.slots.Power / s.slots.Base lists; flatten for this side
      const list = (s.slots[side] || []).map((x:any)=>({ start:x.start, end:x.end, side, mode:x.mode }));
      setSlots(list);
      // if current selection not in list, reset to first
      if (!list.find((l: any) => l.start===slotStart && l.end===slotEnd)) {
        if (list[0]) { setSlotStart(list[0].start); setSlotEnd(list[0].end); }
      }
    }).catch(()=>{ setSlots([]); });
  }, [start, side]);

  // Submit lifecycle
  const [requestId, setRequestId] = useState<string>('');
  const [avail, setAvail] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');

  const nextFromStep1 = () => {
    setError('');
    if (!slotStart || !slotEnd) { setError('Pick a valid slot.'); return; }
    if (headcount <= 0) { setError('Headcount must be > 0.'); return; }
    setStep(2);
  };

  const nextFromStep2 = async () => {
    setError('');
    // racks required if they ticked "racks" in areas
    if (areas['racks'] && racks.length === 0) {
      setError('Select at least one rack, or untick the "racks" area.');
      return;
    }
    setBusy(true);
    try {
      // 1) create draft
      const res = await createDraftRequest({
        userId, side, start, end, slotStart, slotEnd, headcount, notes,
        areasJson: { racks, areas }
      });
      setRequestId(res.id);

      // 2) expand instances
      await expandDraftInstances(res.id);

      // 3) check availability
      const a = await checkAvailability(res.id);
      setAvail(a);
      setStep(3);
    } catch (e:any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding:24, fontFamily:'system-ui', maxWidth:960, margin:'0 auto' }}>
      <h2>New Booking</h2>
      <ol style={{ display:'flex', gap:12, listStyle:'none', padding:0, margin:'8px 0 16px' }}>
        <li><b>{step===1?'①':'①'}</b> Details</li>
        <li><b>{step===2?'②':'②'}</b> Racks</li>
        <li><b>{step===3?'③':'③'}</b> Review</li>
      </ol>
      {error && <div style={{ background:'#fee2e2', color:'#991b1b', padding:8, borderRadius:8, marginBottom:12 }}>{error}</div>}

      {step===1 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <label>Side<br/>
              <select value={side} onChange={e=>setSide(e.target.value as Side)}>
                <option>Power</option><option>Base</option>
              </select>
            </label><br/><br/>
            <label>Start week (Monday or any date)<br/>
              <input type="date" value={start} onChange={e=>setStart(e.target.value)} />
            </label><br/><br/>
            <label>Weeks<br/>
              <input type="number" min={1} value={weeks} onChange={e=>setWeeks(Math.max(1, Number(e.target.value)||1))}/>
            </label><br/><br/>
            <label>Slot<br/>
              <select value={`${slotStart}-${slotEnd}`} onChange={e=>{
                const [s,e2] = e.target.value.split('-'); setSlotStart(s); setSlotEnd(e2);
              }}>
                {slots.map((s,i)=><option key={i} value={`${s.start}-${s.end}`}>{s.start}–{s.end} ({s.mode})</option>)}
              </select>
            </label>
          </div>

          <div>
            <label>Headcount<br/>
              <input type="number" value={headcount} onChange={e=>setHeadcount(Number(e.target.value)||0)} />
            </label><br/><br/>
            <label>Areas (tick any that apply)</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
              {['racks','sprint','dumbbells','cardio','functional','cables','fixed'].map(k=>(
                <label key={k} style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input type="checkbox" checked={!!areas[k]} onChange={e=>setAreas(a=>({ ...a, [k]: e.target.checked }))}/>
                  {k}
                </label>
              ))}
            </div>
            <br/>
            <label>Notes<br/>
              <textarea rows={4} style={{ width:'100%' }} value={notes} onChange={e=>setNotes(e.target.value)} />
            </label>
          </div>

          <div style={{ gridColumn:'1 / span 2', display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={nextFromStep1}>Next → Pick racks</button>
          </div>
        </div>
      )}

      {step===2 && (
        <div>
          <p style={{ color:'#374151' }}>
            {areas['racks'] ? 'Select contiguous racks (Base must stay within a zone).' : 'You didn’t tick racks; this step is optional.'}
          </p>
          <RackPicker side={side} selected={racks} onChange={setRacks} />
          <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:12 }}>
            <button onClick={()=>setStep(1)}>← Back</button>
            <button onClick={nextFromStep2} disabled={busy}>{busy ? 'Creating…' : 'Create & Check Availability'}</button>
          </div>
        </div>
      )}

      {step===3 && (
        <div>
          <h3>Review & Submit</h3>
          <p>Request ID: <code>{requestId}</code></p>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead><tr><th>Date</th><th>Slot</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {avail.map((w:any, i:number)=>(
                <tr key={i}>
                  <td>{w.date}</td>
                  <td>{w.slotStart ?? slotStart}–{w.slotEnd ?? slotEnd}</td>
                  <td>
                    {w.status === 'FIT' && <span style={{ color:'#10b981' }}>✔ Fits</span>}
                    {w.status === 'PARTIAL' && <span style={{ color:'#f59e0b' }}>! Partial</span>}
                    {w.status === 'CONFLICT' && <span style={{ color:'#ef4444' }}>✖ Conflict</span>}
                  </td>
                  <td style={{ color:'#6b7280' }}>{(w.reasons||[]).join('; ') || (w.suggestion ? `Try: ${w.suggestion.join(', ')}` : '')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:12 }}>
            <button onClick={()=>{ setStep(2); }}>← Back to racks</button>
            <button onClick={()=>alert('Saved as draft. An admin will approve from the Approvals queue.')}>
              Done — Send to Admin Approvals
            </button>
          </div>

          <p style={{ color:'#374151', marginTop:12 }}>
            This request is now a <b>draft</b> with expanded instances. Admins can approve it from the Approvals page.
            Bookings will then add it to Legend.
          </p>
        </div>
      )}
    </div>
  );
}
