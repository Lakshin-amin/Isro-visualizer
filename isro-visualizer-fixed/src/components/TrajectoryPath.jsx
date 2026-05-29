import { useMemo } from 'react';
import * as THREE from 'three';
import { getMissionFullArc } from '../utils/orbits';

/**
 * Standalone TrajectoryPath — uses getMissionFullArc (which actually exists).
 * Previously imported getHohmannTransferPoints which was never defined → silent no-op.
 * Now wired to the real arc data used by the internal SolarSystem TrajectoryPath.
 *
 * NOTE: SolarSystem.jsx has its own richer internal TrajectoryPath (with glow layers,
 * milestone dots, etc.) that it renders via AllTrajectories. This file is kept as a
 * lightweight alternative for external use (e.g. a 2D minimap or test harness).
 */
export default function TrajectoryPath({ mission, date, isSelected = false }) {
  const arcData = useMemo(() => {
    if (!mission) return null;
    return getMissionFullArc(mission.id, date, isSelected ? 200 : 100);
  }, [mission?.id, date, isSelected]);

  const geometry = useMemo(() => {
    if (!arcData?.full?.length) return null;
    const pts = arcData.full.map(p => new THREE.Vector3(p.x, p.y, p.z));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [arcData]);

  if (!geometry) return null;

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={mission.color || '#ffffff'}
        transparent
        opacity={isSelected ? 0.85 : 0.15}
      />
    </line>
  );
}
