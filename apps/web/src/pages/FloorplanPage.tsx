import React, { useEffect, useState } from 'react';
import { fetchAreas, type Area } from '../lib/api';
import { PowerMap } from '../components/Floorplan/PowerMap';
import { BaseMap } from '../components/Floorplan/BaseMap';

export default function FloorplanPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  useEffect(() => { fetchAreas().then(setAreas); }, []);

  const powerAreas = areas.filter(a => a.sideId === 1);
  const baseAreas  = areas.filter(a => a.sideId === 2);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h2>Floorplan (Static)</h2>
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <PowerMap />
          <h4 style={{ marginTop: 12 }}>Power Areas</h4>
          <ul>
            {powerAreas.map(a => (
              <li key={a.id}>{a.name}{typeof a.unitsCount === 'number' ? ` — Units: ${a.unitsCount}` : ''}</li>
            ))}
          </ul>
        </div>
        <div>
          <BaseMap />
          <h4 style={{ marginTop: 12 }}>Base Areas</h4>
          <ul>
            {baseAreas.map(a => (
              <li key={a.id}>{a.name}{typeof a.unitsCount === 'number' ? ` — Units: ${a.unitsCount}` : ''}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
