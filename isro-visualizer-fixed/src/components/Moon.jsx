import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getMoonScenePos, getMoonPhase, getMoonPhaseName,
  getMoonDistance, toJulianDate,
} from '../utils/orbits';
import { getProceduralTexture } from '../utils/proceduralTextures';

// ─── Moon Orbit Ring ──────────────────────────────────────────────────────────
function MoonOrbitRing({ date }) {
  const ref = useRef();

  // Build the orbit ring centered on Earth, correct inclination 5.145°
  const points = useMemo(() => {
    const pts = [];
    const incl = 5.145 * Math.PI / 180;
    // Moon orbit radius: real 0.031 scene units * 60 visual boost = ~1.85
    const r = 0.00257 * 12 * 60; // matches MOON_VISUAL_SCALE in orbits.js
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(a) * r,
        Math.sin(a) * r * Math.sin(incl),
        Math.sin(a) * r * Math.cos(incl) * 0.8,
      ));
    }
    return pts;
  }, []);

  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useFrame(() => {
    if (!ref.current) return;
    const ep = getPlanetScenePos('earth', new Date());
    // We'll pass date via prop in real usage but Earth position update is fine
  });

  // Attach to Earth — Earth mesh handles positioning
  return (
    <line ref={ref} geometry={geo}>
      <lineBasicMaterial color="#445566" transparent opacity={0.35} />
    </line>
  );
}

// ─── ISRO Lunar Landing Sites ────────────────────────────────────────────────
const ISRO_LUNAR_SITES = [
  {
    id: 'ch3',
    name: 'Chandrayaan-3',
    lat: -69.367,   // South polar region
    lon: 32.348,
    color: '#00C9B1',
    year: 2023,
    desc: 'First soft landing near lunar south pole. Vikram lander + Pragyan rover.',
  },
  {
    id: 'ch1_impact',
    name: 'Chandrayaan-1 MIP',
    lat: -89.76,    // South pole impact
    lon: 0,
    color: '#FF9933',
    year: 2008,
    desc: 'Moon Impact Probe — India\'s first object to touch the Moon.',
  },
  {
    id: 'apollo11',
    name: 'Apollo 11',
    lat: 0.67,
    lon: 23.47,
    color: '#888888',
    year: 1969,
    desc: 'First human landing. Mare Tranquillitatis.',
  },
];

// Convert lat/lon to 3D point on sphere surface
function latLonToVec3(lat, lon, radius) {
  const phi   = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  );
}

// ─── Phase Shader Material ────────────────────────────────────────────────────
// Custom shader that darkens the side facing away from the Sun
function createPhaseMaterial(texture, phase) {
  // Simple approach: use directional light from sun direction
  // The sunDirection rotates as phase changes
  return new THREE.MeshStandardMaterial({
    map: texture || null,
    color: texture ? '#ffffff' : '#888888',
    roughness: 0.95,
    metalness: 0.0,
  });
}

// ─── Moon Component ───────────────────────────────────────────────────────────
export default function Moon({ date, onHover, onClick, isSelected }) {
  const groupRef  = useRef();
  const meshRef   = useRef();
  const orbitRef  = useRef();
  const MOON_VISUAL_RADIUS = 0.20; // Slightly boosted for visibility

  const tex       = useMemo(() => getProceduralTexture('moon'), []);
  const normalTex = useMemo(() => getProceduralTexture('moonNormal'), []);

  const phase = useMemo(() => getMoonPhase(date), [date]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pos = getMoonScenePos(date);
    groupRef.current.position.set(pos.x, pos.y, pos.z);

    // Moon rotation: tidally locked — rotates once per orbit (27.3 days)
    if (meshRef.current) {
      const jd = toJulianDate(date);
      meshRef.current.rotation.y = (jd / 27.3217) * Math.PI * 2;
    }
  });

  const moonData = {
    id: 'moon',
    name: 'Moon',
    type: 'moon',
    diameter: '3,474 km',
    moons: 0,
    statusLabel: `Phase: ${getMoonPhaseName(phase)}`,
  };

  return (
    <group ref={groupRef}>
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(moonData); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(moonData); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = 'default'; }}
        castShadow
      >
        <sphereGeometry args={[MOON_VISUAL_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={tex}
          normalMap={normalTex||null}
          color={tex ? '#dddddd' : '#888888'}
          roughness={0.96}
          metalness={0}
          emissive={isSelected ? new THREE.Color('#446688') : new THREE.Color(0,0,0)}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* ISRO landing site markers */}
      {ISRO_LUNAR_SITES.map(site => {
        const pos = latLonToVec3(site.lat, site.lon, MOON_VISUAL_RADIUS + 0.01);
        return (
          <group key={site.id} position={[pos.x, pos.y, pos.z]}>
            <mesh>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshBasicMaterial color={site.color} />
            </mesh>
            {/* Pulse ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.016, 0.022, 16]} />
              <meshBasicMaterial color={site.color} transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {/* Glow when selected */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[MOON_VISUAL_RADIUS * 1.12, 32, 32]} />
          <meshBasicMaterial color="#4488aa" transparent opacity={0.08} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Moon Info Panel Data ─────────────────────────────────────────────────────
export function getMoonPanelData(date) {
  const phase     = getMoonPhase(date);
  const phaseName = getMoonPhaseName(date);
  const distKm    = getMoonDistance(date);
  return {
    phase,
    phaseName,
    distKm: Math.round(distKm),
    sites: ISRO_LUNAR_SITES,
  };
}

export { ISRO_LUNAR_SITES };
