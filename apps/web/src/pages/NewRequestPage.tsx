import React, { useState } from "react";
import { RackPicker } from "../components/RackPicker";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function NewRequestPage() {
  const [form, setForm] = useState({
    userId: "user-123",   // TODO: wire auth later
    squadId: "",
    start: "",
    end: "",
    dow: [] as number[],  // e.g., [1,3]
    slotStart: "07:30",
    slotEnd: "09:00",
    side: "Power" as "Power" | "Base",
    headcount: 6,
    racks: [] as number[],
    areas: [] as string[],
    notes: ""
  });

  const toggleDow = (d: number) =>
    setForm(f => ({ ...f, dow: f.dow.includes(d) ? f.dow.filter(x=>x!==d) : [...f.dow, d] }));

  const save = async () => {
    if (!form.start || !form.end || form.dow.length === 0) {
      alert("Please set start, end, and at least one day of week."); return;
    }
    const res = await fetch(`${API}/requests/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const draft = await res.json();

    // expand instances immediately
    await fetch(`${API}/requests/${draft.id}/instances`, { method: "POST" });

    alert("Draft saved and block expanded.");
    // reset selection (optional)
    setForm(f => ({ ...f, racks: [] }));
  };

  return (
    <div style={{ fontFamily:"system-ui", padding:24, display:'grid', gap:16 }}>
      <h2>Create Draft Request</h2>

      <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(2, minmax(280px, 1fr))' }}>
        <div>
          <label>Start: <input type="date" value={form.start} onChange={e=>setForm(f=>({...f, start:e.target.value}))} /></label><br/>
          <label>End: <input type="date" value={form.end} onChange={e=>setForm(f=>({...f, end:e.target.value}))} /></label><br/>
          <div>Days:
            {[1,2,3,4,5,6,7].map(d=>(
              <label key={d} style={{ marginLeft:8 }}>
                <input type="checkbox" checked={form.dow.includes(d)} onChange={()=>toggleDow(d)} />
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][d-1]}
              </label>
            ))}
          </div>
          <label>Time: <input type="time" value={form.slotStart} onChange={e=>setForm(f=>({...f, slotStart:e.target.value}))}/> – 
                        <input type="time" value={form.slotEnd} onChange={e=>setForm(f=>({...f, slotEnd:e.target.value}))}/></label><br/>
          <label>Side:
            <select value={form.side} onChange={e=>setForm(f=>({...f, side:e.target.value as 'Power'|'Base', racks: []}))}>
              <option>Power</option>
              <option>Base</option>
            </select>
          </label><br/>
          <label>Headcount: <input type="number" value={form.headcount} onChange={e=>setForm(f=>({...f, headcount:+e.target.value}))}/></label><br/>
          <label>Notes: <input value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))}/></label><br/>
          <div style={{ fontSize:12, color:'#6b7280' }}>Selected racks: {form.racks.join(', ') || '—'}</div>
          <button onClick={save} style={{ marginTop:12 }}>Save Draft</button>
        </div>

        <div>
          <RackPicker
            side={form.side}
            selected={form.racks}
            onChange={(nums)=>setForm(f=>({...f, racks: nums}))}
          />
        </div>
      </div>
    </div>
  );
}
