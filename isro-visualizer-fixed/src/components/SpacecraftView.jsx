import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { getSpacecraftModel } from './SpacecraftModels';

// ─── Auto-rotate wrapper ─────────────────────────────────────────────────────
function AutoRotate({ children }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.22;
  });
  return <group ref={ref}>{children}</group>;
}

// ─── Orbit ring ──────────────────────────────────────────────────────────────
function OrbitRing({ radius, color, inclDeg = 0 }) {
  const pts = useMemo(() => {
    const arr = [];
    const incl = inclDeg * Math.PI / 180;
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      arr.push(new THREE.Vector3(
        Math.cos(a) * radius,
        Math.sin(a) * Math.sin(incl) * radius,
        Math.sin(a) * Math.cos(incl) * radius,
      ));
    }
    return arr;
  }, [radius, inclDeg]);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), [pts]);
  return (
    <line geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.6}/>
    </line>
  );
}

// ─── Target planet ────────────────────────────────────────────────────────────
function TargetBody({ target }) {
  const ref = useRef();
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.004; });
  const cfg = {
    earth: { r:0.55, col:'#4B9CD3', atmo:'#3366BB' },
    mars:  { r:0.40, col:'#C1440E', atmo:null },
    sun:   { r:0.70, col:'#FDB813', emit:'#FF6600' },
  }[target] || { r:0.35, col:'#888888' };

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[cfg.r, 40, 40]}/>
        <meshStandardMaterial
          color={cfg.col}
          emissive={cfg.emit || '#000'}
          emissiveIntensity={cfg.emit ? 0.7 : 0}
          roughness={0.7} metalness={0.1}/>
      </mesh>
      {cfg.atmo && (
        <mesh>
          <sphereGeometry args={[cfg.r * 1.06, 32, 32]}/>
          <meshBasicMaterial color={cfg.atmo} transparent opacity={0.09} side={THREE.BackSide}/>
        </mesh>
      )}
      {cfg.emit && (
        <>
          <mesh><sphereGeometry args={[cfg.r*1.14,32,32]}/><meshBasicMaterial color="#FF9900" transparent opacity={0.09} side={THREE.BackSide}/></mesh>
          <pointLight color="#FFF8E7" intensity={6} distance={30} decay={1.2}/>
        </>
      )}
    </group>
  );
}

// ─── Spacecraft orbiting in the mini scene ────────────────────────────────────
function OrbitingSpacecraft({ mission, Model }) {
  const ref = useRef();
  const R   = mission.orbitTarget === 'sun' ? 3.8 : 2.4;
  const spd = mission.orbitTarget === 'earth' ? 0.55 : 0.3;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * spd;
    ref.current.position.set(Math.cos(t) * R, Math.sin(t * 0.25) * R * 0.08, Math.sin(t) * R);
    ref.current.rotation.y = -t + Math.PI / 2;
  });

  return (
    <group ref={ref}>
      <Model scale={0.32}/>
      <pointLight color={mission.color} intensity={2} distance={5} decay={2}/>
    </group>
  );
}

// ─── Inspector canvas scene ───────────────────────────────────────────────────
function InspectorScene({ Model }) {
  return (
    <>
      {/* Key light — warm from upper-left (sun direction) */}
      <pointLight position={[4, 5, 3]} intensity={6} color="#FFF5E0"/>
      {/* Fill light — cool blue from right */}
      <pointLight position={[-5, -2, -3]} intensity={2.5} color="#4488FF"/>
      {/* Rim light — behind */}
      <pointLight position={[0, -4, -5]} intensity={1.5} color="#FFFFFF"/>
      {/* Ambient so shadows aren't pure black */}
      <ambientLight intensity={0.2}/>
      <Stars radius={120} depth={40} count={2000} factor={4} fade speed={0.3}/>
      <AutoRotate>
        <Model scale={1.4}/>
      </AutoRotate>
      <OrbitControls
        enableZoom enableRotate enablePan={false}
        minDistance={1.5} maxDistance={14}
        autoRotate={false}/>
    </>
  );
}

// ─── Orbit canvas scene ───────────────────────────────────────────────────────
function OrbitScene({ mission, Model }) {
  const R    = mission.orbitTarget === 'sun' ? 3.8 : 2.4;
  const incl = { mangalyaan:150, chandrayaan1:90, chandrayaan2:90,
                 chandrayaan3:0, adityaL1:0, spadex:55, gaganyaan:51.6 }[mission.id] || 0;
  return (
    <>
      <ambientLight intensity={0.18}/>
      <pointLight position={[0,6,4]} intensity={4} color="#FFF5E0"/>
      <Stars radius={120} depth={40} count={1500} factor={3.5} fade speed={0.3}/>
      <TargetBody target={mission.orbitTarget}/>
      <OrbitRing radius={R} color={mission.color} inclDeg={incl}/>
      <OrbitingSpacecraft mission={mission} Model={Model}/>
      <OrbitControls
        enableZoom enableRotate enablePan={false}
        autoRotate autoRotateSpeed={0.6}
        minDistance={2} maxDistance={18}/>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SpacecraftView({ mission, onClose }) {
  if (!mission) return null;
  const Model = getSpacecraftModel(mission.id);
  if (!Model) return null;

  const statusColor = { active:'#00FF88', completed:'#00C9B1', upcoming:'#FF9933' }[mission.status] || '#00C9B1';

  const orbData = {
    mangalyaan:   { type:'Highly Elliptical', alt:'365 × 80,000 km',  period:'~72 hrs',   incl:'150°',  },
    chandrayaan1: { type:'Polar Lunar Orbit', alt:'100 km circular',  period:'~2 hrs',    incl:'90°',   },
    chandrayaan2: { type:'Polar Lunar Orbit', alt:'100 km circular',  period:'~2 hrs',    incl:'90°',   },
    chandrayaan3: { type:'Lunar Surface',     alt:'69.4°S — S. Pole', period:'Stationary',incl:'N/A',   },
    adityaL1:     { type:'L1 Halo Orbit',     alt:'~1.5M km',         period:'~177 days', incl:'~0°',   },
    spadex:        { type:'Low Earth Orbit',   alt:'470 km',           period:'94 min',    incl:'55°',   },
    gaganyaan:    { type:'LEO (planned)',      alt:'400 km',           period:'~92 min',   incl:'51.6°', },
  }[mission.id] || {};

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background:'#000810',
      display:'flex', flexDirection:'column',
    }}>
      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 24px', flexShrink:0,
        borderBottom:'1px solid rgba(0,201,177,0.15)',
        background:'rgba(0,4,14,0.95)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:mission.color, boxShadow:`0 0 12px ${mission.color}` }}/>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'#E8F4FD', letterSpacing:'0.1em' }}>
              {mission.name}
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'#3A6080', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:2 }}>
              Spacecraft Inspector · 3D View
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--font-mono)', fontSize:9, color:statusColor, letterSpacing:'0.12em', textTransform:'uppercase' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:statusColor, boxShadow:`0 0 6px ${statusColor}` }}/>
            {mission.statusLabel}
          </div>
          <button onClick={onClose} style={{
            background:'transparent', border:'1px solid rgba(0,201,177,0.25)',
            borderRadius:4, color:'#7BA7C4', cursor:'pointer',
            width:32, height:32, fontSize:15,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'55% 45%', overflow:'hidden' }}>

        {/* Left — 3D spacecraft inspector */}
        <div style={{ position:'relative', borderRight:'1px solid rgba(0,201,177,0.08)', background:'#000508' }}>
          <Canvas
            camera={{ position:[0, 1.2, 4.5], fov:44, near:0.01, far:500 }}
            gl={{ antialias:true, alpha:false }}
            style={{ background:'#000508', width:'100%', height:'100%' }}
          >
            <InspectorScene Model={Model}/>
          </Canvas>
          {/* Corner labels */}
          <div style={{ position:'absolute', top:14, left:16, fontFamily:'var(--font-display)', fontSize:11, color:`${mission.color}88`, letterSpacing:'0.18em', textTransform:'uppercase' }}>
            {mission.shortName}
          </div>
          <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', fontFamily:'var(--font-mono)', fontSize:8, color:'rgba(0,201,177,0.35)', letterSpacing:'0.15em', textTransform:'uppercase' }}>
            drag to rotate · scroll to zoom
          </div>
          {/* Subtle vignette */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse at center, transparent 55%, rgba(0,5,14,0.5) 100%)' }}/>
        </div>

        {/* Right — orbit view + data */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', background:'#00040C' }}>

          {/* Orbit mini view */}
          <div style={{ flex:'0 0 46%', position:'relative', borderBottom:'1px solid rgba(0,201,177,0.08)', background:'#000408' }}>
            <Canvas
              camera={{ position:[0, 3.5, 8], fov:42, near:0.01, far:300 }}
              gl={{ antialias:true, alpha:false }}
              style={{ background:'#000408', width:'100%', height:'100%' }}
            >
              <OrbitScene mission={mission} Model={Model}/>
            </Canvas>
            <div style={{ position:'absolute', top:12, left:14, fontFamily:'var(--font-mono)', fontSize:8, color:'rgba(0,201,177,0.4)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
              Orbit Visualization
            </div>
          </div>

          {/* Data scroll area */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:12 }}>

            {/* Orbital parameters */}
            <div style={{ background:'rgba(0,201,177,0.04)', border:'1px solid rgba(0,201,177,0.12)', borderRadius:6, padding:'12px 14px' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'#3A6080', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:10 }}>
                Orbital Parameters
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
                {[
                  ['Orbit Type',     orbData.type  || '—'],
                  ['Altitude',       orbData.alt   || '—'],
                  ['Period',         orbData.period || '—'],
                  ['Inclination',    orbData.incl  || '—'],
                  ['Launch Vehicle', mission.vehicle],
                  ['Launch Site',    'SDSC, Sriharikota'],
                  ['Launch Date',    new Date(mission.launchDate).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'})],
                  ['Mass',           mission.mass],
                ].map(([lbl,val])=>(
                  <div key={lbl}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'#3A6080', letterSpacing:'0.12em', textTransform:'uppercase' }}>{lbl}</div>
                    <div style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:600, color:'#E8F4FD', marginTop:2, lineHeight:1.3 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'#3A6080', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:8 }}>
                Mission Highlights
              </div>
              {mission.achievements.map((a,i)=>(
                <div key={i} style={{
                  display:'flex', alignItems:'flex-start', gap:8,
                  padding:'5px 0', borderBottom:'1px solid rgba(0,201,177,0.06)',
                  fontFamily:'var(--font-body)', fontSize:12, color:'#7BA7C4', lineHeight:1.5,
                }}>
                  <span style={{ color:mission.color, fontSize:9, marginTop:3, flexShrink:0 }}>◆</span>
                  {a}
                </div>
              ))}
            </div>

            {/* Description */}
            <div style={{ padding:'10px 12px', background:'rgba(255,153,51,0.05)', border:'1px solid rgba(255,153,51,0.15)', borderRadius:5 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'#FF9933', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:4 }}>About</div>
              <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'#7BA7C4', lineHeight:1.6 }}>{mission.description}</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
