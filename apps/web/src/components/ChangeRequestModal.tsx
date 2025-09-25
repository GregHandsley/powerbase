import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export const ChangeRequestModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    try { await onSubmit(reason); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
      display:'grid', placeItems:'center', zIndex:50
    }}>
      <div style={{ background:'#fff', borderRadius:12, padding:16, width:420 }}>
        <h3 style={{marginTop:0}}>Submit change request</h3>
        <p style={{marginTop:4, color:'#374151', fontSize:14}}>
          This week is locked or the instance is already approved. Explain the change so an admin can review.
        </p>
        <textarea
          value={reason}
          onChange={e=>setReason(e.target.value)}
          rows={5}
          style={{width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:8}}
          placeholder="Reason (optional but recommended)…"
        />
        <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
          <button onClick={onClose} disabled={busy}>Cancel</button>
          <button onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Submit'}</button>
        </div>
      </div>
    </div>
  );
};
