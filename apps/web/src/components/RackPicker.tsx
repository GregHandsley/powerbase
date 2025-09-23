import React, { useEffect, useMemo, useState } from 'react';
import { fetchRacks, type Rack } from '../lib/api';
import { RackRect } from './Floorplan/RackRect';

type Props = {
  side: 'Power' | 'Base';
  selected: number[];                 // rack numbers
  onChange: (nums: number[]) => void; // callback
};

// helpers
const zoneOf = (n: number) => Math.floor((n - 1) / 6) + 1; // 1..4
const isContiguous = (nums: number[]) => {
  if (nums.length <= 1) return true;
  const s = [...nums].sort((a,b)=>a-b);
  for (let i=1;i<s.length;i++) if (s[i] !== s[i-1]+1) return false;
  return true;
};

function validatePowerSelection(nums: number[]) {
  return isContiguous(nums); // MVP rule for Sprint 3
}

function validateBaseSelection(nums: number[]) {
  if (nums.length === 0) return true;
  const z = zoneOf(nums[0]);
  if (!nums.every(n => zoneOf(n) === z)) return false; // same zone
  return isContiguous(nums);
}

export const RackPicker: React.FC<Props> = ({ side, selected, onChange }) => {
  const [racks, setRacks] = useState<Rack[]>([]);
  const sideId = side === 'Power' ? 1 : 2;

  useEffect(() => {
    fetchRacks().then(rs => setRacks(rs.filter(r => r.sideId === sideId)));
  }, [sideId]);

  // positions (reuse your simple layouts)
  const positions = useMemo(() => {
    const coords: Record<string, {x:number,y:number}> = {};
    const sorted = [...racks].sort((a,b)=>a.number-b.number);

    if (side === 'Power') {
      // 2 rows x 10 (like your PowerMap)
      const rowY = [20, 60];
      let idx = 0;
      for (const r of sorted) {
        const row = idx < 10 ? 0 : 1;
        const col = idx % 10;
        coords[r.id] = { x: 20 + col * 48, y: rowY[row] };
        idx++;
      }
    } else {
      // Base: four rows (zones) each 6 columns
      sorted.forEach((r) => {
        const zIdx = Math.floor((r.number - 1) / 6); // 0..3
        const rowY = 20 + zIdx * 35;
        const col = (r.number - 1) % 6;
        coords[r.id] = { x: 20 + col * 48, y: rowY };
      });
    }
    return coords;
  }, [racks, side]);

  // toggle selection with validation
  const [error, setError] = useState<string>('');

  const toggle = (num: number) => {
    setError('');
    const next = selected.includes(num)
      ? selected.filter(n => n !== num)
      : [...selected, num];

    const ok = side === 'Power' ? validatePowerSelection(next) : validateBaseSelection(next);
    if (!ok) {
      setError(side === 'Power'
        ? 'Selection must be contiguous (e.g., 3–4–5).'
        : 'Stay within one zone (1–6, 7–12, 13–18, 19–24) and keep it contiguous.');
      return;
    }
    onChange([...next].sort((a,b)=>a-b));
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
        <strong>{side} — Pick racks</strong>
        {error && <span style={{ color:'#b91c1c', fontSize:12 }}>{error}</span>}
      </div>

      <svg width={side === 'Power' ? 520 : 360} height={side === 'Power' ? 110 : 160}
           style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}>
        {side === 'Base' && [1,2,3,4].map(z => {
          const y = 10 + (z-1)*35;
          return <rect key={z} x={10} y={y} width={6*48+20} height={30} fill={['#eef2ff','#ecfeff','#fef9c3','#fee2e2'][z-1]} rx={6} />;
        })}
        {racks.map(r => (
          <RackRect
            key={r.id}
            rack={r}
            x={positions[r.id]?.x ?? 0}
            y={positions[r.id]?.y ?? 0}
            selected={selected.includes(r.number)}
            onClick={() => toggle(r.number)}
          />
        ))}
      </svg>
    </div>
  );
};
