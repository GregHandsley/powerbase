import React from 'react';
import type { Rack } from '../../lib/api';

type Props = {
  rack: Rack;
  x: number;
  y: number;
  w?: number;
  h?: number;
};

const colorByType: Record<Rack['type'], string> = {
  FULL: '#4f46e5',  // indigo-ish
  HALF: '#10b981',  // green-ish
  STAND: '#f59e0b' // amber-ish
};

export const RackRect: React.FC<Props> = ({ rack, x, y, w=40, h=20 }) => {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={colorByType[rack.type]} opacity={0.9} />
      <text x={x + w/2} y={y + h/2 + 4} textAnchor="middle" fontSize="10" fill="#fff">
        {rack.number}
      </text>
    </g>
  );
};
