import { useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PLANETS } from '../data/missions';
import {
  getPlanetScenePos, getOrbitPoints, getMissionScenePos,
  KEPLERIAN_ELEMENTS, getMoonScenePos,
  getMissionFullArc, getMissionTransferWindow,
} from '../utils/orbits';
import { getProceduralTexture } from '../utils/proceduralTextures';
import Moon from './Moon';
import { getSpacecraftModel } from './SpacecraftModels';
import { sound } from '../utils/sound';

const TILTS = {
  mercury:0.034, venus:177.4, earth:23.44, mars:25.19,
  jupiter:3.13, saturn:26.73, uranus:97.77, neptune:28.32,
};
// ─── Real planetary equatorial radii (km) ────────────────────────────────────
const REAL_RADII_KM = {
  sun:    696340,
  mercury:  2439.7,
  venus:    6051.8,
  earth:    6371.0,
  mars:     3389.5,
  jupiter:  69911,
  saturn:   58232,
  uranus:   25362,
  neptune:  24622,
};
// Real semi-major axes (AU) for true-scale distance reference
const REAL_SEMIMAJOR_AU = {
  mercury: 0.387, venus: 0.723, earth: 1.000, mars: 1.524,
  jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07,
};

/**
 * Compute visual planet radius for a given size mode + multiplier.
 *
 * Modes:
 *  'artistic'  — boosted sizes for aesthetics (current defaults). Planets
 *                are legible at any zoom level. Inner/outer ratio ≈ 1:6.
 *  'relative'  — real proportions scaled to fit the scene. Earth = 0.62,
 *                Jupiter = 11× Earth real → ~6.8 (clamped to 4 for usability).
 *  'true'      — fully to scale with orbit distances. Earth radius / 1 AU × scene scale.
 *                Planets will appear very small — that's physically accurate.
 */
const ARTISTIC_RADII = {
  mercury:0.28, venus:0.58, earth:0.62, mars:0.38,
  jupiter:1.80, saturn:1.55, uranus:1.10, neptune:1.05,
};
// Earth reference radius in artistic mode
const EARTH_ARTISTIC = 0.62;

function getPlanetRadius(planetId, sizeMode = 'artistic', sizeMultiplier = 1) {
  const mult = sizeMultiplier;
  if (sizeMode === 'artistic') {
    return (ARTISTIC_RADII[planetId] || 0.5) * mult;
  }
  if (sizeMode === 'relative') {
    // Scale all radii so Earth = EARTH_ARTISTIC, rest proportional to real sizes
    const earthReal  = REAL_RADII_KM.earth;
    const planetReal = REAL_RADII_KM[planetId] || earthReal;
    const raw = (planetReal / earthReal) * EARTH_ARTISTIC;
    // Clamp so Jupiter/Saturn don't eat the screen (cap at 4×Earth)
    return Math.min(raw, EARTH_ARTISTIC * 5) * mult;
  }
  if (sizeMode === 'true') {
    // Earth radius in AU = 6371 / 149597870 ≈ 4.26e-5 AU
    // Scene units: 1 AU = AU_TO_SCENE (12). So Earth visual r ≈ 4.26e-5 * 12 ≈ 0.00051
    // That's tiny — we boost by 400× so it's at least visible (still proportional)
    const AU_TO_SCENE = 12;
    const earthAU = REAL_RADII_KM.earth / 149597870;
    const planetAU = (REAL_RADII_KM[planetId] || REAL_RADII_KM.earth) / 149597870;
    const BOOST = 400; // visibility boost — keeps relative sizes perfectly to scale
    return planetAU * AU_TO_SCENE * BOOST * mult;
  }
  return ARTISTIC_RADII[planetId] * mult;
}

// Saturn ring scale ratios (relative to planet radius)
const SATURN_RING_RATIOS = [[1.52,2.36,'#D4C080',0.65],[2.45,2.94,'#BCA860',0.42],[3.03,3.29,'#A89040',0.20]];
const URANUS_RING_RATIOS = [[1.41,1.68,'#7DE8E8',0.22]];
// Sun radius scales with sizeMode too
function getSunRadius(sizeMode, sizeMultiplier) {
  if (sizeMode === 'artistic') return 1.6 * sizeMultiplier;
  if (sizeMode === 'relative') {
    const ratio = REAL_RADII_KM.sun / REAL_RADII_KM.earth;
    return Math.min(ratio * EARTH_ARTISTIC, 8) * sizeMultiplier; // cap at 8
  }
  if (sizeMode === 'true') {
    const AU_TO_SCENE = 12;
    const sunAU = REAL_RADII_KM.sun / 149597870;
    return sunAU * AU_TO_SCENE * 400 * sizeMultiplier;
  }
  return 1.6 * sizeMultiplier;
}

// Label config per planet — colour tinted to planet, offset above surface
const LABEL_META = {
  sun:     { name:'Sun',     color:'#FFD700', sub:'Star · 1,392,700 km'       },
  mercury: { name:'Mercury', color:'#C8C8C8', sub:'Rocky · 0.241 yr orbit'    },
  venus:   { name:'Venus',   color:'#E8C07D', sub:'Rocky · 0.615 yr orbit'    },
  earth:   { name:'Earth',   color:'#4B9CD3', sub:'Rocky · 1 moon'            },
  mars:    { name:'Mars',    color:'#C1440E', sub:'Rocky · 1.881 yr orbit'    },
  jupiter: { name:'Jupiter', color:'#C88B3A', sub:'Gas Giant · 11.86 yr orbit'},
  saturn:  { name:'Saturn',  color:'#E4D191', sub:'Gas Giant · 29.46 yr orbit'},
  uranus:  { name:'Uranus',  color:'#7DE8E8', sub:'Ice Giant · 84 yr orbit'   },
  neptune: { name:'Neptune', color:'#3F54BA', sub:'Ice Giant · 165 yr orbit'  },
};

// ─── Camera Fly-To ──────────────────────────────────────────────────────────

// ─── Camera Presets ────────────────────────────────────────────────────────────
export const CAMERA_PRESETS = {
  overview: {
    label: 'Overview',
    sub: 'Full solar system',
    position: [30, 40, 90],
    target: [0, 0, 0],
    fov: 48,
  },
  topDown: {
    label: 'Top Down',
    sub: 'Ecliptic plane view',
    position: [0, 180, 0.1],
    target: [0, 0, 0],
    fov: 52,
  },
  sideOn: {
    label: 'Side On',
    sub: 'Edge of ecliptic',
    position: [180, 2, 0],
    target: [0, 0, 0],
    fov: 48,
  },
  innerSystem: {
    label: 'Inner System',
    sub: 'Mercury to Mars',
    position: [12, 18, 32],
    target: [0, 0, 0],
    fov: 55,
  },
  outerSystem: {
    label: 'Outer System',
    sub: 'Jupiter to Neptune',
    position: [80, 60, 180],
    target: [60, 0, 0],
    fov: 42,
  },
  cinematic: {
    label: 'Cinematic',
    sub: 'Low angled dramatic',
    position: [45, 8, 100],
    target: [0, 0, 0],
    fov: 38,
  },
};

function CameraController({ flyTarget, onDone, cameraPreset, fovOverride }) {
  const { camera } = useThree();
  const ctrlRef    = useRef();
  const animRef    = useRef(null);
  const prevRef    = useRef(null);
  // Initialise to 'overview' so the first render doesn't trigger a fly-to animation
  // (camera already starts at the overview position via Canvas camera prop)
  const prevPreset = useRef('overview');

  // Apply FOV override
  useFrame(() => {
    if (fovOverride && Math.abs(camera.fov - fovOverride) > 0.5) {
      camera.fov += (fovOverride - camera.fov) * 0.08;
      camera.updateProjectionMatrix();
    }
  });

  useFrame((_, delta) => {
    // Preset changed — animate camera to preset position
    if (cameraPreset && cameraPreset !== prevPreset.current) {
      prevPreset.current = cameraPreset;
      const preset = CAMERA_PRESETS[cameraPreset];
      if (preset) {
        const startPos = camera.position.clone();
        const startTgt = ctrlRef.current ? ctrlRef.current.target.clone() : new THREE.Vector3();
        animRef.current = {
          startPos,
          startTgt,
          endPos: new THREE.Vector3(...preset.position),
          endTgt: new THREE.Vector3(...preset.target),
          targetFov: preset.fov,
          t: 0,
        };
      }
    }

    // flyTarget changed — animate to object
    if (flyTarget && flyTarget !== prevRef.current) {
      prevRef.current = flyTarget;

      const startPos = camera.position.clone();
      const startTgt = ctrlRef.current
        ? ctrlRef.current.target.clone()
        : new THREE.Vector3();

      const endTgt = new THREE.Vector3(flyTarget.x, flyTarget.y, flyTarget.z);

      const dir = camera.position.clone().sub(endTgt);
      if (dir.length() < 0.001) dir.set(0, 0.5, 1);
      dir.normalize();

      const zoom =
        flyTarget.zoom ||
        (flyTarget.type === 'planet' ? 8 : 14);

      animRef.current = {
        startPos,
        startTgt,
        endPos: endTgt.clone().addScaledVector(dir, zoom),
        endTgt,
        t: 0,
      };
    }

    const anim = animRef.current;

    // Animate fly
    if (anim) {
      anim.t = Math.min(anim.t + delta * 1.2, 1);
      const e =
        anim.t < 0.5
          ? 4 * anim.t ** 3
          : 1 - (-2 * anim.t + 2) ** 3 / 2;

      camera.position.lerpVectors(anim.startPos, anim.endPos, e);

      if (ctrlRef.current) {
        ctrlRef.current.target.lerpVectors(anim.startTgt, anim.endTgt, e);
        ctrlRef.current.update();
      }

      // Smoothly interpolate FOV if preset specifies one
      if (anim.targetFov) {
        camera.fov += (anim.targetFov - camera.fov) * 0.06;
        camera.updateProjectionMatrix();
      }

      if (anim.t >= 1) {
        animRef.current = null;
        onDone?.();
      }
    }

    // 🔥 NEW: Tracking after fly
    if (!animRef.current && flyTarget && ctrlRef.current) {
      const targetVec = new THREE.Vector3(
        flyTarget.x,
        flyTarget.y,
        flyTarget.z
      );

      ctrlRef.current.target.lerp(targetVec, 0.1);
      ctrlRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={ctrlRef}
      enablePan
      enableZoom
      enableRotate
      zoomSpeed={0.8}
      rotateSpeed={0.45}
      minDistance={0.5}
      maxDistance={900}
    />
  );
}

// ─── Sun ─────────────────────────────────────────────────────────────────────
function Sun({ onClick, onHover, showLabels, sizeMode, sizeMultiplier }) {
  const core = useRef(); const g1 = useRef(); const g2 = useRef();
  const tex  = useMemo(() => getProceduralTexture('sun'), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (core.current) core.current.rotation.y = t * 0.04;
    if (g1.current) g1.current.scale.setScalar(1 + Math.sin(t*1.3)*0.035);
    if (g2.current) g2.current.scale.setScalar(1 + Math.sin(t*0.8+1)*0.05);
  });
  return (
    <group>
      <mesh ref={core}
        onClick={(e)=>{ e.stopPropagation(); onClick({ id:'sun',name:'Sun',type:'star',diameter:'1,392,700 km',moons:0 }); }}
        onPointerOver={(e)=>{ e.stopPropagation(); onHover({ name:'Sun',type:'star',diameter:'1,392,700 km',moons:0 }); document.body.style.cursor='pointer'; }}
        onPointerOut={()=>{ onHover(null); document.body.style.cursor='default'; }}>
        <sphereGeometry args={[getSunRadius(sizeMode, sizeMultiplier),64,64]}/>
        <meshStandardMaterial map={tex} emissive="#FF5500" emissiveIntensity={0.8} roughness={1}/>
      </mesh>
      <mesh ref={g1}><sphereGeometry args={[getSunRadius(sizeMode,sizeMultiplier)*1.25,32,32]}/><meshBasicMaterial color="#FF9900" transparent opacity={0.09} side={THREE.BackSide}/></mesh>
      <mesh ref={g2}><sphereGeometry args={[getSunRadius(sizeMode,sizeMultiplier)*1.75,32,32]}/><meshBasicMaterial color="#FF4400" transparent opacity={0.035} side={THREE.BackSide}/></mesh>
      <pointLight color="#FFF8E7" intensity={10} distance={800} decay={0.9}/>
      <pointLight color="#FF8800" intensity={3} distance={160} decay={2}/>
      {showLabels && <PlanetLabel planetId="sun" radius={getSunRadius(sizeMode,sizeMultiplier)*2} date={new Date()} onClick={()=>onClick({id:'sun',name:'Sun',type:'star',diameter:'1,392,700 km',moons:0})}/>}
    </group>
  );
}

// ─── Orbit Path ───────────────────────────────────────────────────────────────
function OrbitPath({ planetId, date, highlight, brightness = 1 }) {
  const year = date.getFullYear();
  const points = useMemo(() =>
    getOrbitPoints(planetId, date, 512).map(p => new THREE.Vector3(p.x, p.y, p.z)),
  [planetId, date]);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line geometry={geo}>
      <lineBasicMaterial
        color={highlight ? '#00C9B1' : '#1a3a55'}
        transparent
        opacity={Math.min(1, (highlight ? 0.85 : 0.55) * brightness)}/>
    </line>
  );
}

// ─── Hohmann Transfer Arc ─────────────────────────────────────────────────────
function TrajectoryPath({ mission, date, isSelected = false, alwaysShow = false }) {
  // Sample full arc — more steps for selected mission, fewer for background arcs
  const arcData = useMemo(() => {
    if (!mission) return null;
    return getMissionFullArc(mission.id, date, isSelected ? 200 : 100);
  }, [mission?.id, date.getFullYear(), date.getMonth(), isSelected]);

  // Shimmer animation offset
  const shimmerRef = useRef(0);
  const glow1Ref = useRef();
  const glow2Ref = useRef();

  useFrame(({ clock }) => {
    shimmerRef.current = clock.getElapsedTime();
    // Pulse the glow layers
    if (glow1Ref.current) {
      glow1Ref.current.material.opacity = 0.18 + Math.sin(clock.getElapsedTime() * 1.8) * 0.06;
    }
    if (glow2Ref.current) {
      glow2Ref.current.material.opacity = 0.08 + Math.sin(clock.getElapsedTime() * 1.2 + 1) * 0.03;
    }
  });

  if (!arcData) return null;
  const { traveled, predicted, full } = arcData;
  if (!full.length) return null;

  const toVec3 = pts => pts.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const col = new THREE.Color(mission.color);

  const traveledGeo  = traveled.length  >= 2 ? new THREE.BufferGeometry().setFromPoints(toVec3(traveled))  : null;
  const predictedGeo = predicted.length >= 2 ? new THREE.BufferGeometry().setFromPoints(toVec3(predicted)) : null;
  const fullGeo      = full.length      >= 2 ? new THREE.BufferGeometry().setFromPoints(toVec3(full))      : null;

  // Milestone positions
  const launchPt  = full[0]   ? new THREE.Vector3(full[0].x,   full[0].y,   full[0].z)   : null;
  const arrivalPt = full[full.length-1] ? new THREE.Vector3(full[full.length-1].x, full[full.length-1].y, full[full.length-1].z) : null;
  const midPt     = full[Math.floor(full.length/2)] ? new THREE.Vector3(full[Math.floor(full.length/2)].x, full[Math.floor(full.length/2)].y, full[Math.floor(full.length/2)].z) : null;

  const window = getMissionTransferWindow(mission.id);

  return (
    <group>
        {/* ── Non-selected missions: single ghost arc only ── */}
      {!isSelected && fullGeo && (
        <line geometry={fullGeo}>
          <lineBasicMaterial color={col} transparent opacity={0.09}/>
        </line>
      )}

      {/* ── Selected mission: full layered treatment ── */}
      {isSelected && (
        <>
          {/* Ghost full arc */}
          {fullGeo && (
            <line geometry={fullGeo}>
              <lineBasicMaterial color={col} transparent opacity={0.14}/>
            </line>
          )}
          {/* Outer glow */}
          {fullGeo && (
            <line ref={glow2Ref} geometry={fullGeo}>
              <lineBasicMaterial color={col} transparent opacity={0.07}/>
            </line>
          )}
          {/* Traveled halo */}
          {traveledGeo && (
            <line ref={glow1Ref} geometry={traveledGeo}>
              <lineBasicMaterial color={col} transparent opacity={0.22}/>
            </line>
          )}
          {/* Traveled core */}
          {traveledGeo && (
            <line geometry={traveledGeo}>
              <lineBasicMaterial color={col} transparent opacity={0.88}/>
            </line>
          )}
          {/* Predicted arc */}
          {predictedGeo && (
            <line geometry={predictedGeo}>
              <lineBasicMaterial color={col} transparent opacity={0.28}/>
            </line>
          )}
        </>
      )}

      {/* ── Milestone markers — only for selected mission ── */}

      {/* Launch point */}
      {isSelected && launchPt && (
        <group position={launchPt}>
          {/* Ring */}
          <mesh rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[0.18, 0.04, 8, 24]}/>
            <meshBasicMaterial color={col}/>
          </mesh>
          {/* Inner dot */}
          <mesh>
            <sphereGeometry args={[0.09, 10, 10]}/>
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.5}/>
          </mesh>
        </group>
      )}

      {/* Arrival point */}
      {isSelected && arrivalPt && (
        <group position={arrivalPt}>
          {/* Outer pulse ring */}
          <mesh rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[0.22, 0.045, 8, 24]}/>
            <meshBasicMaterial color={col}/>
          </mesh>
          {/* Second ring */}
          <mesh rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[0.14, 0.025, 8, 24]}/>
            <meshBasicMaterial color={'#ffffff'}/>
          </mesh>
          {/* Core */}
          <mesh>
            <sphereGeometry args={[0.10, 10, 10]}/>
            <meshStandardMaterial color={'#ffffff'} emissive={col} emissiveIntensity={2}/>
          </mesh>
        </group>
      )}

      {/* Mid-arc chevron direction indicator */}
      {isSelected && midPt && traveled.length >= 2 && (
        <group position={midPt}>
          <mesh>
            <octahedronGeometry args={[0.12, 0]}/>
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.8} transparent opacity={0.7}/>
          </mesh>
        </group>
      )}

      {/* Glow point light — only for selected */}
      {isSelected && <SpacecraftGlowLight mission={mission} date={date}/>}
    </group>
  );
}

// Moving glow light that follows the spacecraft along the arc
function SpacecraftGlowLight({ mission, date }) {
  const lightRef = useRef();
  useFrame(() => {
    if (!lightRef.current) return;
    const pos = getMissionScenePos(mission.id, date);
    lightRef.current.position.set(pos.x, pos.y, pos.z);
  });
  return (
    <pointLight ref={lightRef} color={mission.color} intensity={2.5} distance={8} decay={2}/>
  );
}


// ─── Planet Label ─────────────────────────────────────────────────────────────
function PlanetLabel({ planetId, radius, date, onClick }) {
  const ref = useRef();
  const { camera } = useThree();
  const [opacity, setOpacity] = useState(1);
  const meta = LABEL_META[planetId];
  if (!meta) return null;

  useFrame(() => {
    if (!ref.current) return;
    const pos = planetId === 'sun'
      ? new THREE.Vector3(0,0,0)
      : (() => { const p = getPlanetScenePos(planetId, date); return new THREE.Vector3(p.x, p.y, p.z); })();

    const dist = camera.position.distanceTo(pos);
    // Fade out when very close (zoomed in) or very far (tiny)
    const near = radius * 4;
    const far  = radius * 1200;
    const fade = dist < near
      ? dist / near
      : dist > far ? 1 - (dist - far) / (far * 0.5) : 1;
    setOpacity(Math.max(0, Math.min(1, fade)));
  });

  return (
    <Html
      ref={ref}
      position={[0, radius * 1.6 + 0.4, 0]}
      center
      distanceFactor={60}
      occlude={false}
      zIndexRange={[0, 10]}
      style={{ pointerEvents:'none', userSelect:'none' }}
    >
      <div
        onClick={onClick}
        style={{
          pointerEvents: 'auto',
          cursor: 'pointer',
          opacity,
          transition: 'opacity 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          whiteSpace: 'nowrap',
        }}
      >
        {/* Connecting line */}
        <div style={{
          width: 1,
          height: 8,
          background: `${meta.color}55`,
          marginBottom: 1,
        }}/>
        {/* Name badge */}
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: meta.color,
          textTransform: 'uppercase',
          padding: '2px 6px',
          background: 'rgba(0,4,12,0.72)',
          border: `1px solid ${meta.color}44`,
          borderRadius: 3,
          backdropFilter: 'blur(4px)',
          lineHeight: 1.2,
        }}>
          {meta.name}
        </div>
        {/* Sub info */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7,
          letterSpacing: '0.1em',
          color: `${meta.color}99`,
          textTransform: 'uppercase',
        }}>
          {meta.sub}
        </div>
      </div>
    </Html>
  );
}

// ─── Mission Label ────────────────────────────────────────────────────────────
function MissionLabel({ mission, date, isSelected }) {
  const ref = useRef();
  const { camera } = useThree();
  const [opacity, setOpacity] = useState(0);

  useFrame(() => {
    if (!ref.current) return;
    const pos = getMissionScenePos(mission.id, date);
    const dist = camera.position.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z));
    // Only show when zoomed in close, or always show if selected
    const showDist = isSelected ? 80 : 12;
    const fade = Math.max(0, Math.min(1, 1 - (dist - showDist*0.3) / (showDist*0.7)));
    setOpacity(fade);
  });

  const statusColors = { active:'#00FF88', completed:'#00C9B1', upcoming:'#FF9933' };
  const col = statusColors[mission.status] || '#00C9B1';

  if (opacity < 0.01) return null;

  return (
    <Html
      ref={ref}
      position={[0, 0.55, 0]}
      center
      distanceFactor={45}
      occlude={false}
      zIndexRange={[0, 10]}
      style={{ pointerEvents:'none' }}
    >
      <div style={{
        opacity,
        transition: 'opacity 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: isSelected ? 9 : 7,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: mission.color,
          textTransform: 'uppercase',
          padding: '2px 5px',
          background: 'rgba(0,4,12,0.78)',
          border: `1px solid ${mission.color}44`,
          borderRadius: 3,
          lineHeight: 1.2,
        }}>
          {mission.shortName}
        </div>
        {isSelected && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            letterSpacing: '0.1em',
            color: col,
            textTransform: 'uppercase',
          }}>
            {mission.statusLabel}
          </div>
        )}
      </div>
    </Html>
  );
}

// ─── Planet ───────────────────────────────────────────────────────────────────
function Planet({ planetId, date, onHover, onClick, isHighlighted, showLabels, sizeMode, sizeMultiplier }) {
  const groupRef  = useRef();
  const meshRef   = useRef();
  const cloudRef  = useRef();
  const tiltRad   = (TILTS[planetId]||0)*Math.PI/180;
  const radius    = getPlanetRadius(planetId, sizeMode, sizeMultiplier);
  const planet    = useMemo(() => PLANETS.find(p=>p.id===planetId)||{}, [planetId]);

  // Procedural textures — generated once, cached
  const tex        = useMemo(() => getProceduralTexture(planetId), [planetId]);
  const normalTex  = useMemo(() => {
    if (planetId === 'earth') return getProceduralTexture('earthNormal');
    if (planetId === 'mars')  return getProceduralTexture('marsNormal');
    if (planetId === 'moon')  return getProceduralTexture('moonNormal');
    return null;
  }, [planetId]);
  const specTex    = useMemo(() => planetId==='earth' ? getProceduralTexture('earthSpecular') : null, [planetId]);
  const cloudTex   = useMemo(() => planetId==='earth' ? getProceduralTexture('earthClouds')   : null, [planetId]);
  const fallback   = useMemo(() => {
    const colors = { mercury:'#B5B5B5',venus:'#E8C07D',earth:'#4B9CD3',mars:'#C1440E',jupiter:'#C88B3A',saturn:'#E4D191',uranus:'#7DE8E8',neptune:'#3F54BA' };
    return new THREE.Color(colors[planetId]||'#888888');
  }, [planetId]);

  useFrame(() => {
    if (!groupRef.current) return;
    const pos = getPlanetScenePos(planetId, date);
    groupRef.current.position.set(pos.x, pos.y, pos.z);
    if (meshRef.current) meshRef.current.rotation.y += 0.003;
    if (cloudRef.current) cloudRef.current.rotation.y += 0.0008;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} rotation={[tiltRad,0,0]}
        onClick={(e)=>{ e.stopPropagation(); onClick(planet); }}
        onPointerOver={(e)=>{ e.stopPropagation(); onHover(planet); document.body.style.cursor='pointer'; }}
        onPointerOut={()=>{ onHover(null); document.body.style.cursor='default'; }}>
        <sphereGeometry args={[radius,64,64]}/>
        <meshStandardMaterial
          map={tex||null}
          normalMap={normalTex||null}
          roughnessMap={specTex||null}
          color={tex?'#ffffff':fallback}
          roughness={planetId==='earth'?0.75:planetId==='mercury'?0.7:0.88}
          metalness={planetId==='mercury'?0.25:0.02}
          emissive={isHighlighted?fallback:new THREE.Color(0,0,0)}
          emissiveIntensity={isHighlighted?0.22:0}/>
      </mesh>

      {/* Earth clouds */}
      {cloudTex && (
        <mesh ref={cloudRef} rotation={[tiltRad,0,0]}>
          <sphereGeometry args={[radius*1.008,48,48]}/>
          <meshStandardMaterial map={cloudTex} transparent opacity={0.28} depthWrite={false}/>
        </mesh>
      )}

      {/* Atmosphere halos */}
      {planetId==='earth' && (
        <mesh rotation={[tiltRad,0,0]}>
          <sphereGeometry args={[radius*1.025,32,32]}/>
          <meshBasicMaterial color="#4477CC" transparent opacity={0.09} side={THREE.BackSide}/>
        </mesh>
      )}
      {planetId==='venus' && (
        <mesh rotation={[tiltRad,0,0]}>
          <sphereGeometry args={[radius*1.04,32,32]}/>
          <meshBasicMaterial color="#E8C07D" transparent opacity={0.10} side={THREE.BackSide}/>
        </mesh>
      )}
      {planetId==='mars' && (
        <mesh rotation={[tiltRad,0,0]}>
          <sphereGeometry args={[radius*1.015,32,32]}/>
          <meshBasicMaterial color="#C1440E" transparent opacity={0.05} side={THREE.BackSide}/>
        </mesh>
      )}
      {showLabels && (
        <PlanetLabel planetId={planetId} radius={radius} date={date} onClick={()=>onClick(planet)}/>
      )}
    </group>
  );
}

// ─── Saturn Rings ────────────────────────────────────────────────────────────
function SaturnRings({ date, sizeMode, sizeMultiplier }) {
  const ref = useRef();
  useFrame(()=>{ if(ref.current){ const p=getPlanetScenePos('saturn',date); ref.current.position.set(p.x,p.y,p.z); }});
  const sr = getPlanetRadius('saturn', sizeMode, sizeMultiplier);
  return (
    <group ref={ref} rotation={[TILTS.saturn*Math.PI/180,0.08,0]}>
      {SATURN_RING_RATIOS.map(([f1,f2,col,op],i)=>(
          <mesh key={i} rotation={[Math.PI/2,0,0]}>
            <ringGeometry args={[sr*f1, sr*f2, 128]}/>
            <meshBasicMaterial color={col} transparent opacity={op} side={THREE.DoubleSide}/>
          </mesh>
        ))}
    </group>
  );
}

// ─── Uranus Rings ────────────────────────────────────────────────────────────
function UranusRings({ date, sizeMode, sizeMultiplier }) {
  const ref = useRef();
  useFrame(()=>{ if(ref.current){ const p=getPlanetScenePos('uranus',date); ref.current.position.set(p.x,p.y,p.z); }});
  const ur = getPlanetRadius('uranus', sizeMode, sizeMultiplier);
  return (
    <group ref={ref} rotation={[0,0,TILTS.uranus*Math.PI/180]}>
      {URANUS_RING_RATIOS.map(([f1,f2,col,op],i)=>(
        <mesh key={i} rotation={[Math.PI/2,0,0]}>
          <ringGeometry args={[ur*f1, ur*f2, 64]}/>
          <meshBasicMaterial color={col} transparent opacity={op} side={THREE.DoubleSide}/>
        </mesh>
      ))}
    </group>
  );
}

// ─── IRNSS/GSAT Constellation ────────────────────────────────────────────────
function IndianSatelliteConstellation({ date }) {
  const groupRef = useRef();
  const satellites = useMemo(() => {
    const sats = [];
    [[55,0],[83,0],[111,0],[34,29],[55,-29],[129,29],[129,-29]].forEach(([lon,inc]) =>
      sats.push({ lon, inc, color:'#00FF88', size:0.05 }));
    [48,55,74,83,93.5,111,128,55].forEach(lon =>
      sats.push({ lon, inc:0, color:'#FF9933', size:0.04 }));
    return sats;
  }, []);
  useFrame(()=>{
    if(!groupRef.current) return;
    const ep = getPlanetScenePos('earth', date);
    groupRef.current.position.set(ep.x, ep.y, ep.z);
    groupRef.current.rotation.y += 0.0001;
  });
  const R = 0.55;
  return (
    <group ref={groupRef}>
      {satellites.map((s,i) => {
        const lr=(s.lon*Math.PI)/180, ir=(s.inc*Math.PI)/180;
        return (
          <mesh key={i} position={[R*Math.cos(lr)*Math.cos(ir), R*Math.sin(ir), R*Math.sin(lr)*Math.cos(ir)]}>
            <sphereGeometry args={[s.size,8,8]}/><meshBasicMaterial color={s.color}/>
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI/2,0,0]}>
        <ringGeometry args={[R-0.015,R+0.015,64]}/>
        <meshBasicMaterial color="#FF9933" transparent opacity={0.10} side={THREE.DoubleSide}/>
      </mesh>
    </group>
  );
}

// ─── Asteroid Belt ────────────────────────────────────────────────────────────
function AsteroidBelt() {
  const ref = useRef();
  const { pos, cols } = useMemo(() => {
    const count=1600, pos=new Float32Array(count*3), cols=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const r=(2.2+Math.random()*1.0)*12, a=Math.random()*Math.PI*2;
      pos[i*3]=Math.cos(a)*r; pos[i*3+1]=(Math.random()-0.5)*1.2; pos[i*3+2]=Math.sin(a)*r;
      const g=0.28+Math.random()*0.22; cols[i*3]=g*1.1; cols[i*3+1]=g*0.9; cols[i*3+2]=g*0.7;
    }
    return { pos, cols };
  }, []);
  useFrame(()=>{ if(ref.current) ref.current.rotation.y+=0.000035; });
  return (
    <group ref={ref}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos,3]}/>
          <bufferAttribute attach="attributes-color" args={[cols,3]}/>
        </bufferGeometry>
        <pointsMaterial size={0.07} transparent opacity={0.35} vertexColors sizeAttenuation/>
      </points>
    </group>
  );
}

// ─── Kuiper Belt ──────────────────────────────────────────────────────────────
function KuiperBelt() {
  const pos = useMemo(()=>{
    const count=700, p=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const r=(30+Math.random()*20)*12, a=Math.random()*Math.PI*2;
      p[i*3]=Math.cos(a)*r; p[i*3+1]=(Math.random()-0.5)*18; p[i*3+2]=Math.sin(a)*r;
    }
    return p;
  },[]);
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos,3]}/></bufferGeometry>
      <pointsMaterial color="#3a5060" size={0.16} transparent opacity={0.25} sizeAttenuation/>
    </points>
  );
}

// ─── Pre-launch pulsing ring (upcoming missions) ──────────────────────────────
function PreLaunchRing({ color }) {
  const ring1 = useRef();
  const ring2 = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1.current) {
      const s = 1 + Math.sin(t * 1.5) * 0.35;
      ring1.current.scale.setScalar(s);
      ring1.current.material.opacity = 0.55 - Math.sin(t * 1.5) * 0.35;
    }
    if (ring2.current) {
      const s = 1 + Math.sin(t * 1.5 + Math.PI) * 0.35;
      ring2.current.scale.setScalar(s);
      ring2.current.material.opacity = 0.35 - Math.sin(t * 1.5 + Math.PI) * 0.25;
    }
  });
  return (
    <group>
      <mesh ref={ring1} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[0.4, 0.025, 8, 32]}/>
        <meshBasicMaterial color={color} transparent opacity={0.5}/>
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[0.4, 0.018, 8, 32]}/>
        <meshBasicMaterial color={color} transparent opacity={0.3}/>
      </mesh>
    </group>
  );
}

// ─── ISRO Spacecraft (3D Models) ─────────────────────────────────────────────
function Spacecraft({ mission, date, isSelected, onClick, showLabels, scaleMultiplier = 1 }) {
  const groupRef   = useRef();
  const glowRef    = useRef();
  const scaleRef   = useRef(0.04);
  const { camera } = useThree();
  const col   = useMemo(() => new THREE.Color(mission.color), [mission.color]);
  const Model = useMemo(() => getSpacecraftModel(mission.id), [mission.id]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pos = getMissionScenePos(mission.id, date);
    groupRef.current.position.set(pos.x, pos.y, pos.z);

    // ── Camera-adaptive scale ──────────────────────────────────────────────
    // Target: spacecraft appears ~constant screen-size across zoom levels.
    // Base visual size in world units = dist * tan(halfFOV) * targetScreenFraction
    // We want the spacecraft to subtend ~1.2% of screen height always.
    // At dist=100 → scale≈2.1; at dist=5 → scale≈0.1 — feels right.
    const dist   = camera.position.distanceTo(groupRef.current.position);
    const fov    = camera.fov * Math.PI / 180;
    const screenH = 2 * dist * Math.tan(fov / 2);

    // Base fraction: 1.4% of screen height for normal, 2.2% when selected
    const fraction = isSelected ? 0.022 : 0.014;
    // Raw adaptive scale
    let s = screenH * fraction * scaleMultiplier;

    // Clamp: never bigger than a planet, never so small the model is invisible
    s = Math.max(0.02, Math.min(s, isSelected ? 3.5 : 2.0));

    scaleRef.current = s;
    groupRef.current.scale.setScalar(s);

    // Glow sphere tracks model and scales with it
    if (glowRef.current) {
      glowRef.current.position.copy(groupRef.current.position);
      const glowS = 1 + Math.sin(clock.getElapsedTime()*3 + mission.id.length)*0.25;
      glowRef.current.scale.setScalar(s * (isSelected ? 2.2 : 1.8) * glowS);
    }

    // Slow tumble when not selected
    if (!isSelected) {
      groupRef.current.rotation.y += 0.004;
      groupRef.current.rotation.x += 0.002;
    }
  });

  return (
    <group>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.28, 16, 16]}/>
        <meshBasicMaterial color={col} transparent opacity={isSelected ? 0.32 : 0.14}/>
      </mesh>

      {/* 3D spacecraft model or fallback octahedron */}
      <group ref={groupRef}
        onClick={(e)=>{ e.stopPropagation(); onClick(mission); }}
        onPointerOver={()=>{ document.body.style.cursor='pointer'; }}
        onPointerOut={()=>{ document.body.style.cursor='default'; }}>
        {Model ? (
          <Model scale={1} isSelected={isSelected}/>
        ) : (
          <mesh>
            <octahedronGeometry args={[0.18, 0]}/>
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={isSelected?3:1.8} roughness={0.05} metalness={0.95}/>
          </mesh>
        )}
        <pointLight color={mission.color} intensity={isSelected ? 3 : 1.2} distance={4} decay={2}/>
      </group>

      {/* Pre-launch ring */}
      {mission.status === 'upcoming' && <PreLaunchRing color={col} clock={0}/>}

      {showLabels && <MissionLabel mission={mission} date={date} isSelected={isSelected}/>}
    </group>
  );
}

// ─── All Transfer Arcs ────────────────────────────────────────────────────────
// Renders arcs for every mission that has a defined transfer window.
// Selected mission: full bright arc. Others: faint ghost arc.
function AllTrajectories({ missions, selectedMission, date }) {
  // IDs of missions that have transfer windows (built into orbits.js)
  const TRANSFER_IDS = new Set([
    'mangalyaan','chandrayaan1','chandrayaan2','chandrayaan3',
    'adityaL1','shukrayaan','lupex','chandrayaan4',
  ]);

  const transferMissions = missions.filter(m =>
    TRANSFER_IDS.has(m.id) || m.type === 'transfer'
  );

  return (
    <>
      {transferMissions.map(m => (
        <TrajectoryPath
          key={m.id}
          mission={m}
          date={date}
          isSelected={selectedMission?.id === m.id}
          alwaysShow={true}
        />
      ))}
    </>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({ date, missions, selectedMission, flyTarget, onFlyDone, onMissionClick, onPlanetClick, onMoonClick, selectedMoon, onHover, showConstellation, orbitBrightness, showLabels, scaleMultiplier, sizeMode, sizeMultiplier, cameraPreset, fovOverride }) {
  const planetIds = Object.keys(KEPLERIAN_ELEMENTS);
  const selTarget = selectedMission?.orbitTarget;
  return (
    <>
      <ambientLight intensity={0.07}/>
      <Stars radius={600} depth={150} count={10000} factor={7} fade speed={0.25}/>
      <CameraController flyTarget={flyTarget} onDone={onFlyDone} cameraPreset={cameraPreset} fovOverride={fovOverride}/>
      <Sun onClick={onPlanetClick} onHover={onHover} showLabels={showLabels} sizeMode={sizeMode} sizeMultiplier={sizeMultiplier}/>
      {planetIds.map(id=>(
        <OrbitPath key={id} planetId={id} date={date} highlight={selTarget===id} brightness={orbitBrightness}/>
      ))}
      {planetIds.map(id=>(
        <Planet key={id} planetId={id} date={date} onHover={onHover} onClick={onPlanetClick} isHighlighted={selTarget===id} showLabels={showLabels} sizeMode={sizeMode} sizeMultiplier={sizeMultiplier}/>
      ))}
      <SaturnRings date={date} sizeMode={sizeMode} sizeMultiplier={sizeMultiplier}/>
      <UranusRings date={date} sizeMode={sizeMode} sizeMultiplier={sizeMultiplier}/>
      <AsteroidBelt/>
      <KuiperBelt/>
      {showConstellation && <IndianSatelliteConstellation date={date}/>}
      <Moon date={date} onHover={onHover} onClick={onMoonClick} isSelected={selectedMoon}/>
      {missions.map(m=>(
        <Spacecraft key={m.id} mission={m} date={date} isSelected={selectedMission?.id===m.id} onClick={onMissionClick} showLabels={showLabels} scaleMultiplier={scaleMultiplier}/>
      ))}
      <AllTrajectories missions={missions} selectedMission={selectedMission} date={date}/>
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function SolarSystem({ date, missions = [], selectedMission, onMissionClick, onPlanetClick, onMoonClick, selectedMoon, flyTarget, onFlyDone, showConstellation, orbitBrightness = 1, showLabels = true, scaleMultiplier = 1, sizeMode = 'artistic', sizeMultiplier = 1, cameraPreset = 'overview', fovOverride = null }) {
  const [hovered, setHovered] = useState(null);
  const [tipPos,  setTipPos]  = useState({ x:0, y:0 });
  const handleMove = useCallback(e=>setTipPos({ x:e.clientX, y:e.clientY }), []);
  return (
    <div className="canvas-container" onMouseMove={handleMove}>
      <Canvas
        camera={{ position:[30,40,90], fov:48, near:0.01, far:3000 }}
        gl={{ antialias:true, alpha:false, powerPreference:'high-performance', logarithmicDepthBuffer:true }}
        dpr={[1,2]} onClick={()=>sound.resume()}>
        <Scene
          date={date} selectedMission={selectedMission}
          flyTarget={flyTarget} onFlyDone={onFlyDone}
          onMissionClick={onMissionClick} onPlanetClick={onPlanetClick}
          onMoonClick={onMoonClick} selectedMoon={selectedMoon}
          onHover={setHovered} showConstellation={showConstellation}
          orbitBrightness={orbitBrightness} missions={missions} showLabels={showLabels} scaleMultiplier={scaleMultiplier} sizeMode={sizeMode} sizeMultiplier={sizeMultiplier} cameraPreset={cameraPreset} fovOverride={fovOverride}/>
      </Canvas>
      {hovered && (
        <div className="hover-tooltip" style={{ left:tipPos.x, top:tipPos.y }}>
          <div className="tooltip-name">{hovered.name}</div>
          <div className="tooltip-detail">
            {hovered.type==='planet'||hovered.type==='star'||hovered.type==='moon'
              ? `${hovered.diameter||''} · ${hovered.moons??0} moon${hovered.moons!==1?'s':''}`
              : hovered.statusLabel||''}
          </div>
        </div>
      )}
    </div>
  );
}
