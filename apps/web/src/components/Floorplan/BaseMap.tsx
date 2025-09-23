import React, { useEffect, useMemo, useState } from 'react';
import { fetchRacks, type Rack } from '../../lib/api';
import { RackRect } from './RackRect';

const zoneColor = (z:number)=> ['#eef2ff','#ecfeff','#fef9c3','#fee2e2'][z-1] || '#f3f4f6';

export const BaseMap: React.FC = () => {
  const [racks, setRacks] = useState<Rack[]>([]);
  useEffect(() => { fetchRacks().then(rs => setRacks(rs.filter(r => r.sideId === 2))); }, []);

  // 4 zones of 6 racks (rows)
  const positions = useMemo(() => {
    const coords: Record<string, {x:number,y:number}> = {};
    const sorted = [...racks].sort((a,b)=>a.number-b.number);
    sorted.forEach((r, i) => {
      const zoneIndex = Math.floor((r.number - 1) / 6); // 0..3
      const rowY = 20 + zoneIndex * 35;
      const col = (r.number - 1) % 6;
      coords[r.id] = { x: 20 + col * 48, y: rowY };
    });
    return coords;
  }, [racks]);

  // Zone backgrounds
  const zoneRects = useMemo(() => {
    return [1,2,3,4].map(z => {
      const y = 10 + (z-1)*35;
      return <rect key={z} x={10} y={y} width={6*48+20} height={30} fill={zoneColor(z)} rx={6} />;
    });
  }, []);

  return (
    <div>
      <h3>Base (Racks 1–24, Zones 1–4)</h3>
      <svg width={360} height={160} style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}>
        {zoneRects}
        {racks.map(r => (
          <g key={r.id}>
            <RackRect rack={r} x={positions[r.id]?.x ?? 0} y={positions[r.id]?.y ?? 0} />
            {/* zone label per row start */}
            {r.number % 6 === 1 && (
              <text x={5} y={(positions[r.id]?.y ?? 0) + 15} fontSize="10" fill="#6b7280">Zone {r.zone}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
