import { useMemo } from 'react';
import * as THREE from 'three';
import { getHohmannTransferPoints } from '../utils/orbits';

export default function TrajectoryPath({ mission, date }) {
  const points = useMemo(() => {
    if (!mission || mission.type !== 'transfer') return [];

    const pts = getHohmannTransferPoints(mission, date);

    return pts.map(p => new THREE.Vector3(p.x, p.y, p.z));
  }, [mission?.id, date]);

  if (!points.length) return null;

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={mission.color || '#ffffff'}
        transparent
        opacity={mission.status === 'active' ? 1 : 0.3}
      />
    </line>
  );
}