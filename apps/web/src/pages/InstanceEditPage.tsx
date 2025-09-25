import React, { useEffect, useState } from 'react';
import { RackPicker } from '../components/RackPicker'; // your file
import { patchInstance, submitChangeRequest } from '../lib/api';

type Props = {
  instanceId: string;        // pass this from your router or test hardcode
  side: 'Power'|'Base';
  userId: string;            // current logged-in user email/id
};

export default function InstanceEditPage({ instanceId, side, userId }: Props) {
  const [racks, setRacks] = useState<number[]>([]);
  const [headcount, setHeadcount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [openCR, setOpenCR] = useState(false);
  const [lastPayload, setLastPayload] = useState<any>(null);

  // TODO: load current instance/request fields if you want (racks/headcount/notes)

  const save = async () => {
    const payload = { racks, headcount, notes };
    setLastPayload(payload);

    const res = await patchInstance(instanceId, payload /* , {admin:true} */);

    if (res.status === 200) {
      alert('Saved.');
      return;
    }
    if (res.status === 409) {
      // locked or already approved → open change request modal
      setOpenCR(true);
      return;
    }
    if (res.status === 403) {
      alert('Inside 24 hours — practitioner edits are blocked. Contact an admin.');
      return;
    }
    alert(`Save failed: ${res.status} ${await res.text()}`);
  };

  const submitCR = async (reason: string) => {
    await submitChangeRequest({
      instanceId,
      userId,
      reason,
      payload: lastPayload || { racks, headcount, notes }
    });
    alert('Change request submitted. You’ll be notified when decided.');
  };

  return (
    <div style={{ padding:24, fontFamily:'system-ui' }}>
      <h2>Edit Instance</h2>
      <div style={{ display:'grid', gap:16, gridTemplateColumns:'1fr 1fr' }}>
        <div>
          <label>Headcount<br/>
            <input type="number" value={headcount} onChange={e=>setHeadcount(Number(e.target.value)||0)} />
          </label>
          <br/><br/>
          <label>Notes<br/>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{width:'100%'}}/>
          </label>
          <br/><br/>
          <button onClick={save}>Save</button>
        </div>

        <div>
          <RackPicker side={side} selected={racks} onChange={setRacks} />
        </div>
      </div>

      {/* Change-request modal */}
      <ChangeRequestModal
        open={openCR}
        onClose={()=>setOpenCR(false)}
        onSubmit={submitCR}
      />
    </div>
  );
}

// place it here or import
function ChangeRequestModal(props: any) {
  const { open, onClose, onSubmit } = props;
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'grid', placeItems:'center'}}>
      <div style={{background:'#fff', padding:16, borderRadius:12, width:420}}>
        <h3>Submit change request</h3>
        <textarea rows={5} style={{width:'100%'}} value={reason} onChange={e=>setReason(e.target.value)} />
        <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={async()=>{ await onSubmit(reason); onClose(); }}>Submit</button>
        </div>
      </div>
    </div>
  );
}
