import React from 'react';
import type { Rack } from '../../lib/api';

type Props = {
  rack: Rack;
  x: number;
  y: number;
  w?: number;
  h?: number;
  selected?: boolean;
  onClick?: () => void;
};

const colorByType: Record<Rack['type'], string> = {
  FULL: '#4f46e5',
  HALF: '#10b981',
  STAND: '#f59e0b'
};

export const RackRect: React.FC<Props> = ({ rack, x, y, w=40, h=20, selected=false, onClick }) => {
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <rect
        x={x} y={y} width={w} height={h} rx={4}
        fill={colorByType[rack.type]}
        opacity={selected ? 1 : 0.9}
        stroke={selected ? '#111827' : 'none'}
        strokeWidth={selected ? 2 : 0}
      />
      <text x={x + w/2} y={y + h/2 + 4} textAnchor="middle" fontSize="10" fill="#fff">
        {rack.number}
      </text>
    </g>
  );
};
