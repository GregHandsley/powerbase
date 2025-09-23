import React, { useEffect, useMemo, useState } from 'react';
import { fetchRacks, type Rack } from '../../lib/api';
import { RackRect } from './RackRect';

export const PowerMap: React.FC = () => {
  const [racks, setRacks] = useState<Rack[]>([]);
  useEffect(() => { fetchRacks().then(rs => setRacks(rs.filter(r => r.sideId === 1))); }, []);

  // Lay out Power racks in two rows of 10 for a simple bird’s-eye.
  const positions = useMemo(() => {
    const coords: Record<string, {x:number,y:number}> = {};
    const rowY = [20, 60];
    let idx = 0;
    const sorted = [...racks].sort((a,b)=>a.number-b.number);
    for (const r of sorted) {
      const row = idx < 10 ? 0 : 1;
      const col = idx % 10;
      coords[r.id] = { x: 20 + col * 48, y: rowY[row] };
      idx++;
    }
    return coords;
  }, [racks]);

  return (
    <div>
      <h3>Power (Racks 1–20)</h3>
      <svg width={520} height={110} style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}>
        {/* legend */}
        <g transform="translate(380,10)">
          <rect x={0} y={0} width={10} height={10} fill="#4f46e5"/><text x={16} y={10} fontSize="10">Full</text>
          <rect x={0} y={16} width={10} height={10} fill="#10b981"/><text x={16} y={26} fontSize="10">Half</text>
          <rect x={0} y={32} width={10} height={10} fill="#f59e0b"/><text x={16} y={42} fontSize="10">Stand</text>
        </g>

        {racks.map(r => (
          <RackRect key={r.id} rack={r} x={positions[r.id]?.x ?? 0} y={positions[r.id]?.y ?? 0} />
        ))}
      </svg>
    </div>
  );
};
