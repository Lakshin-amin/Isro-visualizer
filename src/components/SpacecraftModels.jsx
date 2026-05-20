import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * HIGH-FIDELITY ISRO SPACECRAFT MODELS
 * Geometry based on official ISRO mission brochures, press kits, and NASA NSSDCA
 * Each model: bus structure + MLI thermal blankets + solar arrays + instruments + propulsion
 */

// ─── Reusable geometry helpers ────────────────────────────────────────────────

// Multi-layer solar panel with individual cell grid, frame rails, deployment hinge
function SolarArray({ w=1.4, h=0.7, px=0, py=0, pz=0, rx=0, ry=0, rz=0, segments=3 }) {
  const cells = [];
  const cw = w / segments;
  for (let i = 0; i < segments; i++) {
    cells.push(
      <group key={i} position={[px + (i - (segments-1)/2) * cw, py, pz]} rotation={[rx,ry,rz]}>
        {/* Cell substrate */}
        <mesh>
          <boxGeometry args={[cw*0.97, h*0.97, 0.018]}/>
          <meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/>
        </mesh>
        {/* Reflective cell grid */}
        {Array.from({length:5}).map((_,r)=>(
          <mesh key={r} position={[0, -h/2 + (r+0.5)*(h/5), 0.011]}>
            <boxGeometry args={[cw*0.94, 0.003, 0.001]}/>
            <meshBasicMaterial color="#2255CC"/>
          </mesh>
        ))}
        {Array.from({length:4}).map((_,c)=>(
          <mesh key={c} position={[-cw/2 + (c+1)*(cw/4), 0, 0.011]}>
            <boxGeometry args={[0.003, h*0.94, 0.001]}/>
            <meshBasicMaterial color="#2255CC"/>
          </mesh>
        ))}
        {/* Aluminium frame */}
        <mesh>
          <boxGeometry args={[cw+0.02, h+0.02, 0.012]}/>
          <meshStandardMaterial color="#888888" roughness={0.25} metalness={0.85} wireframe={false}/>
        </mesh>
        {/* Cell segment divider strut */}
        {i < segments-1 && (
          <mesh position={[cw/2, 0, 0]}>
            <boxGeometry args={[0.025, h, 0.025]}/>
            <meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/>
          </mesh>
        )}
      </group>
    );
  }
  return <>{cells}</>;
}

// MLI thermal blanket panel (gold/silver foil appearance)
function MLI({ w, h, d, px=0, py=0, pz=0, gold=true }) {
  return (
    <mesh position={[px,py,pz]}>
      <boxGeometry args={[w,h,d]}/>
      <meshStandardMaterial
        color={gold ? '#C8960C' : '#CCCCCC'}
        roughness={0.15} metalness={0.95}
        envMapIntensity={1.5}/>
    </mesh>
  );
}

// Parabolic HGA dish with feed horn, struts, and drive mechanism
function HGA({ r=0.5, px=0, py=0, pz=0, rotX=0, rotY=0 }) {
  return (
    <group position={[px,py,pz]} rotation={[rotX,rotY,0]}>
      {/* Dish */}
      <mesh>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI*2, 0, Math.PI/2]}/>
        <meshStandardMaterial color="#D8D8D8" roughness={0.12} metalness={0.92} side={THREE.DoubleSide}/>
      </mesh>
      {/* Dish rim ring */}
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[r, 0.018, 8, 40]}/>
        <meshStandardMaterial color="#AAAAAA" roughness={0.2} metalness={0.9}/>
      </mesh>
      {/* 4 feed support struts */}
      {[0,1,2,3].map(i => {
        const a = i * Math.PI/2;
        return (
          <mesh key={i} position={[Math.cos(a)*r*0.45, Math.sin(a)*r*0.45, r*0.35]}
            rotation={[Math.atan2(r*0.35, r*0.45), a, 0]}>
            <cylinderGeometry args={[0.008, 0.008, r*0.6, 6]}/>
            <meshStandardMaterial color="#999999" metalness={0.8} roughness={0.3}/>
          </mesh>
        );
      })}
      {/* Feed horn */}
      <mesh position={[0, 0, r*0.55]}>
        <cylinderGeometry args={[0.04, 0.07, 0.22, 12]}/>
        <meshStandardMaterial color="#666666" metalness={0.75} roughness={0.4}/>
      </mesh>
      {/* Sub-reflector */}
      <mesh position={[0, 0, r*0.6]}>
        <sphereGeometry args={[0.06, 10, 8, 0, Math.PI*2, 0, Math.PI/2]}/>
        <meshStandardMaterial color="#CCCCCC" roughness={0.1} metalness={0.95} side={THREE.DoubleSide}/>
      </mesh>
      {/* Pedestal / drive */}
      <mesh position={[0,0,-r*0.28]}>
        <cylinderGeometry args={[0.06, 0.08, r*0.45, 10]}/>
        <meshStandardMaterial color="#777777" metalness={0.8} roughness={0.3}/>
      </mesh>
    </group>
  );
}

// Engine bell (nozzle)
function EngineBell({ throat=0.05, exit=0.18, len=0.28, px=0, py=0, pz=0, rotX=0 }) {
  return (
    <group position={[px,py,pz]} rotation={[rotX,0,0]}>
      <mesh>
        <cylinderGeometry args={[throat, exit, len, 20]}/>
        <meshStandardMaterial color="#3A3A3A" roughness={0.45} metalness={0.75}/>
      </mesh>
      {/* Expansion rib rings */}
      {[0.3,0.6,0.85].map((t,i)=>(
        <mesh key={i} position={[0, -len/2 + t*len, 0]} rotation={[Math.PI/2,0,0]}>
          <torusGeometry args={[throat + (exit-throat)*t, 0.01, 6, 20]}/>
          <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.4}/>
        </mesh>
      ))}
      {/* Heat discolouration ring */}
      <mesh position={[0, len*0.35, 0]} rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[throat*1.4, 0.04, 6, 20]}/>
        <meshStandardMaterial color="#5A3010" roughness={0.9} metalness={0.1}/>
      </mesh>
    </group>
  );
}

// Small attitude control thruster
function Thruster({ px=0, py=0, pz=0, rotX=0, rotZ=0 }) {
  return (
    <group position={[px,py,pz]} rotation={[rotX,0,rotZ]}>
      <mesh><cylinderGeometry args={[0.025, 0.042, 0.1, 8]}/><meshStandardMaterial color="#404040" roughness={0.5} metalness={0.7}/></mesh>
      <mesh position={[0,0.04,0]}><cylinderGeometry args={[0.015, 0.025, 0.06, 8]}/><meshStandardMaterial color="#333333" roughness={0.6} metalness={0.6}/></mesh>
    </group>
  );
}

// ─── MANGALYAAN — Mars Orbiter Mission ────────────────────────────────────────
// 1.5×0.75×0.68 m cuboid, 1 solar panel wing (2.35m²), 2.2m HGA, LAM 440N engine
export function MangalyaanModel({ scale=1 }) {
  const g = useRef();
  return (
    <group ref={g} scale={[scale,scale,scale]}>
      {/* Isogrid aluminium bus structure */}
      <mesh>
        <boxGeometry args={[0.75, 0.68, 1.5]}/>
        <meshStandardMaterial color="#444444" roughness={0.5} metalness={0.6}/>
      </mesh>
      {/* MLI blankets — 5 faces (bottom open for engine) */}
      <MLI w={0.74} h={0.67} d={0.01} pz={0.755} gold={true}/>
      <MLI w={0.74} h={0.67} d={0.01} pz={-0.755} gold={false}/>
      <MLI w={0.74} h={1.5}  d={0.01} py={0.345}  gold={true}/>
      <MLI w={0.73} h={1.49} d={0.01} px={0.38}   gold={true}/>
      <MLI w={0.73} h={1.49} d={0.01} px={-0.38}  gold={false}/>

      {/* Single deployable solar panel wing (+X) — 1.4m × 1.8m */}
      <group position={[1.32, 0, -0.1]}>
        <SolarArray w={1.8} h={1.0} segments={3}/>
        {/* Deployment hinge */}
        <mesh position={[-0.92, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} rotation={[0,0,Math.PI/2]}/>
          <meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/>
        </mesh>
      </group>
      {/* Panel yoke */}
      <mesh position={[0.42, 0, -0.1]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.69, 8]}/>
        <meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/>
      </mesh>

      {/* 2.2m High Gain Antenna */}
      <HGA r={0.55} py={0.5} pz={-0.6} rotX={-Math.PI/5}/>

      {/* LAM 440N main engine */}
      <EngineBell throat={0.065} exit={0.2} len={0.32} pz={0.82} rotX={Math.PI/2}/>

      {/* 8 × 22N attitude control thrusters */}
      {[[-0.36,-0.33,0.6],[0.36,-0.33,0.6],[-0.36,0.33,0.6],[0.36,0.33,0.6],
        [-0.36,-0.33,-0.6],[0.36,-0.33,-0.6],[-0.36,0.33,-0.6],[0.36,0.33,-0.6]]
        .map(([x,y,z],i)=><Thruster key={i} px={x} py={y} pz={z} rotX={z>0?Math.PI/2:-Math.PI/2}/>)
      }

      {/* Propellant tank (visible through open bottom) */}
      <mesh position={[0, 0, 0.15]}>
        <sphereGeometry args={[0.26, 16, 16]}/>
        <meshStandardMaterial color="#778899" roughness={0.3} metalness={0.8}/>
      </mesh>

      {/* Medium Gain Antenna (MGA) */}
      <group position={[-0.38, 0.42, 0.2]} rotation={[0.4, -0.3, 0]}>
        <mesh><sphereGeometry args={[0.18, 12, 8, 0, Math.PI*2, 0, Math.PI/2]}/><meshStandardMaterial color="#CCCCCC" roughness={0.15} metalness={0.9} side={THREE.DoubleSide}/></mesh>
        <mesh position={[0,0,-0.1]}><cylinderGeometry args={[0.012,0.012,0.22,6]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/></mesh>
      </group>

      {/* LAP (Lyman Alpha Photometer) instrument */}
      <mesh position={[0.38, 0.35, 0.55]}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 10]}/>
        <meshStandardMaterial color="#222244" roughness={0.5} metalness={0.5}/>
      </mesh>
      {/* MENCA instrument */}
      <mesh position={[-0.38, 0.35, 0.55]}>
        <boxGeometry args={[0.1, 0.1, 0.14]}/>
        <meshStandardMaterial color="#334455" roughness={0.6} metalness={0.4}/>
      </mesh>

      {/* Star sensors */}
      {[[0.38,0.35,-0.4],[-0.38,0.35,-0.4]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,y,z]} rotation={[0.3,i*Math.PI,0]}>
          <boxGeometry args={[0.06,0.06,0.12]}/>
          <meshStandardMaterial color="#111122" roughness={0.7} metalness={0.3}/>
        </mesh>
      ))}
    </group>
  );
}

// ─── CHANDRAYAAN-3 — Vikram Lander + Pragyan Rover ────────────────────────────
// Vikram: 1.996×1.996×1.153m, 4 legs, ChaSTE/ILSA/Rambha-LP payloads
// Pragyan: 6-wheel rocker-bogie, APXS+LIBS instruments
export function Chandrayaan3Model({ scale=1 }) {
  const g = useRef();
  return (
    <group ref={g} scale={[scale,scale,scale]}>

      {/* ── Vikram Lander ── */}
      {/* Primary structure box */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[1.0, 0.56, 1.0]}/>
        <meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/>
      </mesh>
      {/* MLI top face */}
      <MLI w={0.99} h={0.99} d={0.012} py={0.565} gold={true}/>
      {/* Side faces MLI */}
      <MLI w={0.99} h={0.55} d={0.012} pz={0.505} gold={false}/>
      <MLI w={0.99} h={0.55} d={0.012} pz={-0.505} gold={true}/>
      <MLI w={0.55} h={0.99} d={0.012} px={0.505} gold={true}/>
      <MLI w={0.55} h={0.99} d={0.012} px={-0.505} gold={false}/>

      {/* Solar panels — 2 wings on opposite sides */}
      <group position={[-1.08, 0.28, 0]}>
        <SolarArray w={1.05} h={0.62} segments={2}/>
        <mesh position={[0.55,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.02,0.02,0.13,8]}/><meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/></mesh>
      </group>
      <group position={[1.08, 0.28, 0]}>
        <SolarArray w={1.05} h={0.62} segments={2}/>
        <mesh position={[-0.55,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.02,0.02,0.13,8]}/><meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/></mesh>
      </group>

      {/* 4 landing legs — folded-out position */}
      {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([lx,lz],i) => {
        const ax = lx * 0.5, az = lz * 0.5;
        return (
          <group key={i} position={[ax, 0.05, az]}>
            {/* Primary leg strut */}
            <mesh rotation={[lz*0.45, 0, lx*0.45]}>
              <cylinderGeometry args={[0.025, 0.022, 0.82, 8]}/>
              <meshStandardMaterial color="#999999" metalness={0.85} roughness={0.2}/>
            </mesh>
            {/* Secondary cross strut */}
            <mesh position={[lx*0.12, -0.25, lz*0.12]} rotation={[-lz*0.5, 0, lx*0.6]}>
              <cylinderGeometry args={[0.014, 0.014, 0.5, 6]}/>
              <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3}/>
            </mesh>
            {/* Footpad */}
            <mesh position={[lx*0.26, -0.46, lz*0.26]}>
              <cylinderGeometry args={[0.1, 0.1, 0.04, 14]}/>
              <meshStandardMaterial color="#666666" roughness={0.7} metalness={0.5}/>
            </mesh>
            {/* Crush core (honeycomb shock absorber) */}
            <mesh position={[lx*0.26, -0.42, lz*0.26]}>
              <cylinderGeometry args={[0.06, 0.06, 0.1, 10]}/>
              <meshStandardMaterial color="#AA8800" roughness={0.8} metalness={0.3}/>
            </mesh>
          </group>
        );
      })}

      {/* ChaSTE probe (thermal conductivity) */}
      <mesh position={[0.35, 0.28, 0.52]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.35, 8]}/>
        <meshStandardMaterial color="#CC8800" roughness={0.5} metalness={0.6}/>
      </mesh>
      {/* Rambha-LP (Langmuir probe) */}
      <mesh position={[-0.4, 0.6, 0.1]}>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 6]}/>
        <meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.2}/>
      </mesh>
      <mesh position={[-0.4, 0.82, 0.1]}>
        <sphereGeometry args={[0.03, 8, 8]}/>
        <meshStandardMaterial color="#DDDDDD" metalness={0.9} roughness={0.15}/>
      </mesh>
      {/* ILSA (seismometer) */}
      <mesh position={[0, 0.28, -0.52]}>
        <boxGeometry args={[0.16, 0.1, 0.14]}/>
        <meshStandardMaterial color="#334455" roughness={0.6} metalness={0.4}/>
      </mesh>

      {/* Rover ramp */}
      <mesh position={[0, -0.04, 0.54]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.42, 0.015, 0.6]}/>
        <meshStandardMaterial color="#AA8810" roughness={0.6} metalness={0.4}/>
      </mesh>
      {/* Ramp rails */}
      {[-0.19, 0.19].map((rx, i) => (
        <mesh key={i} position={[rx, -0.04, 0.54]} rotation={[0.55,0,0]}>
          <boxGeometry args={[0.02, 0.03, 0.62]}/>
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3}/>
        </mesh>
      ))}

      {/* ── Pragyan Rover ── */}
      <group position={[0.16, -0.12, 0.9]}>
        {/* Rover body */}
        <mesh><boxGeometry args={[0.32, 0.16, 0.42]}/><meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/></mesh>
        <MLI w={0.31} h={0.41} d={0.01} py={0.085} gold={true}/>

        {/* Rover solar panel */}
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.36, 0.01, 0.4]}/>
          <meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/>
        </mesh>
        {/* Solar cell grid on rover panel */}
        {Array.from({length:4}).map((_,r)=>(
          <mesh key={r} position={[0, 0.146, -0.16 + r*0.11]}>
            <boxGeometry args={[0.34, 0.002, 0.002]}/><meshBasicMaterial color="#2255CC"/>
          </mesh>
        ))}

        {/* Mast / camera unit */}
        <mesh position={[0, 0.26, 0.18]}>
          <cylinderGeometry args={[0.025, 0.025, 0.24, 8]}/>
          <meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/>
        </mesh>
        {/* NavCam stereo pair */}
        {[-0.04, 0.04].map((cx,i)=>(
          <mesh key={i} position={[cx, 0.39, 0.19]}>
            <cylinderGeometry args={[0.018, 0.018, 0.04, 8]} rotation={[Math.PI/2,0,0]}/>
            <meshStandardMaterial color="#111111" roughness={0.7} metalness={0.3}/>
          </mesh>
        ))}

        {/* 6-wheel rocker-bogie suspension */}
        {[[-0.2,0.18],[-0.2,0],[-0.2,-0.18],[0.2,0.18],[0.2,0],[0.2,-0.18]].map(([wx,wz],i)=>(
          <group key={i} position={[wx, -0.12, wz]}>
            {/* Wheel */}
            <mesh rotation={[0,0,Math.PI/2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.048, 14]}/>
              <meshStandardMaterial color="#222222" roughness={0.95} metalness={0.1}/>
            </mesh>
            {/* Wheel tread pattern */}
            {Array.from({length:8}).map((_,t)=>{
              const a = t * Math.PI/4;
              return (
                <mesh key={t} position={[wx>0?0.026:-0.026, Math.sin(a)*0.065, Math.cos(a)*0.065]} rotation={[0,0,Math.PI/2]}>
                  <boxGeometry args={[0.01, 0.012, 0.035]}/>
                  <meshStandardMaterial color="#444444" roughness={0.9} metalness={0.1}/>
                </mesh>
              );
            })}
            {/* Suspension arm */}
            <mesh position={[wx>0?-0.08:0.08, 0.05, 0]} rotation={[0, 0, wx>0?0.4:-0.4]}>
              <boxGeometry args={[0.18, 0.02, 0.02]}/>
              <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3}/>
            </mesh>
          </group>
        ))}

        {/* LIBS laser instrument */}
        <mesh position={[0, -0.02, 0.22]}>
          <cylinderGeometry args={[0.022, 0.022, 0.12, 8]}/>
          <meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/>
        </mesh>
        {/* LIBS laser aperture */}
        <mesh position={[0, -0.02, 0.285]}>
          <cylinderGeometry args={[0.014, 0.014, 0.02, 8]}/>
          <meshBasicMaterial color="#FF3300"/>
        </mesh>
        {/* APXS instrument */}
        <mesh position={[0.17, -0.06, 0.2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.1, 8]}/>
          <meshStandardMaterial color="#445566" roughness={0.5} metalness={0.5}/>
        </mesh>
      </group>
    </group>
  );
}

// ─── ADITYA-L1 — Solar Observatory ────────────────────────────────────────────
// 1.5×1.5×1.1m bus, VELC + SUIT + PAPA + SoLEXS instruments, large solar wings
export function AdityaL1Model({ scale=1 }) {
  const g = useRef();
  return (
    <group ref={g} scale={[scale,scale,scale]}>
      {/* Main bus */}
      <mesh>
        <boxGeometry args={[0.9, 0.85, 0.85]}/>
        <meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/>
      </mesh>
      {/* MLI on all 6 faces */}
      {[[0,0,0.435,0.89,0.84,0.01,true],[0,0,-0.435,0.89,0.84,0.01,false],
        [0,0.435,0,0.89,0.84,0.01,true],[0,-0.435,0,0.89,0.84,0.01,false],
        [0.455,0,0,0.84,0.84,0.01,true],[-0.455,0,0,0.84,0.84,0.01,false]]
        .map(([x,y,z,w,h,d,g2],i)=><MLI key={i} px={x} py={y} pz={z} w={w} h={h} d={d} gold={g2}/>)
      }

      {/* VELC coronagraph telescope — largest instrument, +Z face (sun-facing) */}
      <group position={[0, 0.08, 0.76]}>
        {/* Main tube */}
        <mesh><cylinderGeometry args={[0.15, 0.18, 0.9, 20]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#222233" roughness={0.6} metalness={0.4}/></mesh>
        {/* Baffles */}
        {[0.3, 0.55, 0.78].map((t,i)=>(
          <mesh key={i} position={[0, 0, 0.45*t-0.05]}>
            <torusGeometry args={[0.165+i*0.005, 0.014, 8, 24]}/><meshStandardMaterial color="#444444" metalness={0.7} roughness={0.4}/>
          </mesh>
        ))}
        {/* Entrance aperture */}
        <mesh position={[0, 0, 0.46]}>
          <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} rotation={[Math.PI/2,0,0]}/>
          <meshStandardMaterial color="#111111" roughness={0.9} metalness={0.1}/>
        </mesh>
        {/* Occulter disk */}
        <mesh position={[0, 0, 0.42]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 10]} rotation={[Math.PI/2,0,0]}/>
          <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2}/>
        </mesh>
        {/* Thermal radiator */}
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.04, 0.35, 0.88]}/>
          <meshStandardMaterial color="#DDDDDD" roughness={0.3} metalness={0.6}/>
        </mesh>
      </group>

      {/* SUIT UV telescope */}
      <group position={[0.38, 0.3, 0.4]}>
        <mesh><cylinderGeometry args={[0.075, 0.09, 0.45, 14]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#334455" roughness={0.55} metalness={0.5}/></mesh>
        <mesh position={[0,0,0.24]}><cylinderGeometry args={[0.07,0.07,0.03,12]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#111111" roughness={0.9} metalness={0.1}/></mesh>
      </group>

      {/* SoLEXS X-ray spectrometer */}
      <mesh position={[-0.35, 0.32, 0.35]}>
        <boxGeometry args={[0.14, 0.12, 0.32]}/>
        <meshStandardMaterial color="#445566" roughness={0.55} metalness={0.45}/>
      </mesh>
      {/* Aperture */}
      <mesh position={[-0.35, 0.32, 0.52]}>
        <cylinderGeometry args={[0.04,0.04,0.04,10]} rotation={[Math.PI/2,0,0]}/>
        <meshStandardMaterial color="#111111" roughness={0.9} metalness={0.1}/>
      </mesh>

      {/* PAPA particle detector */}
      <mesh position={[0, -0.44, 0.35]}>
        <cylinderGeometry args={[0.08, 0.08, 0.22, 12]} rotation={[Math.PI/2,0,0]}/>
        <meshStandardMaterial color="#334455" roughness={0.6} metalness={0.4}/>
      </mesh>

      {/* Large solar wings — 2×2 panel arrays each side */}
      {[-1, 1].map((side, si) => (
        <group key={si} position={[side * 1.32, 0, -0.1]}>
          <SolarArray w={1.85} h={1.1} segments={4}/>
          {/* Deployment hinge */}
          <mesh position={[side>0?-0.95:0.95, 0, 0]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.1, 8]}/>
            <meshStandardMaterial color="#777777" metalness={0.85} roughness={0.25}/>
          </mesh>
        </group>
      ))}
      {/* Wing attachment booms */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} position={[side*0.5, 0, -0.1]} rotation={[0,0,Math.PI/2]}>
          <cylinderGeometry args={[0.025,0.025,0.55,8]}/>
          <meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/>
        </mesh>
      ))}

      {/* 1.5m HGA */}
      <HGA r={0.48} py={-0.55} pz={0.1} rotX={Math.PI/4}/>

      {/* Star sensors × 2 */}
      {[[0.46, 0.44, -0.2],[-0.46, 0.44, -0.2]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,y,z]} rotation={[0.35, i*Math.PI, 0]}>
          <boxGeometry args={[0.06,0.06,0.12]}/>
          <meshStandardMaterial color="#111122" roughness={0.7} metalness={0.3}/>
        </mesh>
      ))}

      {/* Propulsion module — 440N LAM + tanks */}
      <mesh position={[0, 0, -0.56]}>
        <sphereGeometry args={[0.22, 16, 16]}/>
        <meshStandardMaterial color="#778899" roughness={0.35} metalness={0.8}/>
      </mesh>
      <EngineBell throat={0.065} exit={0.21} len={0.32} pz={-0.84} rotX={-Math.PI/2}/>
      {/* RCS thrusters × 8 */}
      {[0,1,2,3].map(i=>{
        const a=i*Math.PI/2;
        return [1,-1].map(s=>(
          <Thruster key={`${i}-${s}`} px={Math.cos(a)*0.46} py={Math.sin(a)*0.43} pz={s*0.35} rotX={s>0?Math.PI/2:-Math.PI/2}/>
        ));
      })}
    </group>
  );
}

// ─── CHANDRAYAAN-2 ORBITER ─────────────────────────────────────────────────────
// 2.5×1.5×1.8m, 8 payloads, TMC-2 camera, IIRS, OHRC, CLASS, SAR, etc.
export function Chandrayaan2Model({ scale=1 }) {
  const g = useRef();
  return (
    <group ref={g} scale={[scale,scale,scale]}>
      {/* Bus */}
      <mesh><boxGeometry args={[0.95, 0.78, 1.12]}/><meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/></mesh>
      {/* MLI */}
      <MLI w={0.94} h={0.77} d={0.01} pz={0.57} gold={true}/>
      <MLI w={0.94} h={0.77} d={0.01} pz={-0.57} gold={false}/>
      <MLI w={0.94} h={1.11} d={0.01} py={0.4} gold={true}/>
      <MLI w={0.94} h={1.1}  d={0.01} py={-0.4} gold={false}/>
      <MLI w={0.77} h={1.11} d={0.01} px={0.485} gold={true}/>
      <MLI w={0.77} h={1.1}  d={0.01} px={-0.485} gold={false}/>

      {/* 2× large solar arrays */}
      {[-1,1].map((s,i)=>(
        <group key={i} position={[s*1.45, 0, 0]}>
          <SolarArray w={1.9} h={0.95} segments={3}/>
          <mesh position={[s>0?-0.97:0.97,0,0]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.03,0.03,0.12,8]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/>
          </mesh>
        </group>
      ))}

      {/* 2.2m HGA */}
      <HGA r={0.55} py={0.55} pz={-0.35} rotX={-Math.PI/5}/>

      {/* TMC-2 terrain mapping camera */}
      <group position={[0, -0.41, 0.4]}>
        <mesh><boxGeometry args={[0.22, 0.2, 0.3]}/><meshStandardMaterial color="#222233" roughness={0.6} metalness={0.4}/></mesh>
        <mesh position={[0,-0.12,0]}><cylinderGeometry args={[0.06,0.08,0.2,12]}/><meshStandardMaterial color="#111111" roughness={0.8} metalness={0.2}/></mesh>
      </group>
      {/* OHRC (Orbiter High Resolution Camera) */}
      <mesh position={[0.3, -0.4, 0.2]}>
        <cylinderGeometry args={[0.06,0.08,0.35,12]}/><meshStandardMaterial color="#222233" roughness={0.6} metalness={0.4}/>
      </mesh>
      {/* IIRS spectrometer */}
      <mesh position={[-0.3, -0.4, 0.2]}>
        <boxGeometry args={[0.18,0.2,0.38]}/><meshStandardMaterial color="#334455" roughness={0.55} metalness={0.45}/>
      </mesh>
      {/* SAR antenna */}
      <mesh position={[0, -0.42, -0.25]}>
        <boxGeometry args={[0.88,0.04,0.58]}/><meshStandardMaterial color="#222244" roughness={0.5} metalness={0.55}/>
      </mesh>
      {/* CLASS X-ray spectrometer */}
      <mesh position={[0.45, -0.41, -0.1]}>
        <cylinderGeometry args={[0.05,0.05,0.22,10]}/><meshStandardMaterial color="#445566" roughness={0.55} metalness={0.45}/>
      </mesh>

      {/* Engine */}
      <EngineBell throat={0.07} exit={0.22} len={0.3} pz={0.62} rotX={Math.PI/2}/>
      {/* Tanks */}
      {[[0.25,0,0],[-0.25,0,0],[0,0.25,0],[0,-0.25,0]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,y,z]}>
          <sphereGeometry args={[0.18,12,12]}/><meshStandardMaterial color="#778899" roughness={0.35} metalness={0.8}/>
        </mesh>
      ))}
    </group>
  );
}

// ─── CHANDRAYAAN-1 ─────────────────────────────────────────────────────────────
export function Chandrayaan1Model({ scale=1 }) {
  const g = useRef();
  return (
    <group ref={g} scale={[scale,scale,scale]}>
      <mesh><boxGeometry args={[0.78, 0.78, 0.78]}/><meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/></mesh>
      <MLI w={0.77} h={0.77} d={0.01} pz={0.4} gold={true}/>
      <MLI w={0.77} h={0.77} d={0.01} pz={-0.4} gold={false}/>
      <MLI w={0.77} h={0.77} d={0.01} py={0.4} gold={true}/>
      <MLI w={0.76} h={0.77} d={0.01} px={0.4} gold={true}/>
      <MLI w={0.76} h={0.77} d={0.01} px={-0.4} gold={false}/>
      {/* Solar arrays */}
      {[-1,1].map((s,i)=>(
        <group key={i} position={[s*1.18, 0, 0]}>
          <SolarArray w={1.4} h={0.72} segments={2}/>
        </group>
      ))}
      {/* HGA */}
      <HGA r={0.28} py={0.52} pz={0} rotX={-Math.PI/6}/>
      {/* Moon Impact Probe (MIP) */}
      <group position={[0, -0.42, 0]}>
        <mesh><boxGeometry args={[0.3,0.2,0.3]}/><meshStandardMaterial color="#884400" roughness={0.7} metalness={0.4}/></mesh>
        <mesh position={[0,-0.12,0]}><cylinderGeometry args={[0.1,0.1,0.06,8]}/><meshStandardMaterial color="#666666" roughness={0.6} metalness={0.5}/></mesh>
      </group>
      {/* TMC, HySI, LLRI instruments */}
      <mesh position={[0,-0.42,0.25]}><boxGeometry args={[0.18,0.16,0.22]}/><meshStandardMaterial color="#222233" roughness={0.6} metalness={0.4}/></mesh>
      <mesh position={[0.38,-0.3,0.2]}><cylinderGeometry args={[0.05,0.07,0.25,10]}/><meshStandardMaterial color="#334455" roughness={0.55} metalness={0.45}/></mesh>
      <EngineBell throat={0.05} exit={0.15} len={0.22} py={0} pz={0.44} rotX={Math.PI/2}/>
    </group>
  );
}

// ─── SPADEX — Space Docking Experiment ─────────────────────────────────────────
export function SpaDeXModel({ scale=1 }) {
  const g = useRef();
  const sep = useRef(0);
  useFrame(({ clock }) => {
    sep.current = 0.18 + Math.sin(clock.getElapsedTime() * 0.4) * 0.06;
  });

  return (
    <group ref={g} scale={[scale,scale,scale]}>
      {/* SDX-01 Chaser */}
      <group position={[0, 0, 0.62 + (sep.current||0.18)]}>
        {/* Main body */}
        <mesh><cylinderGeometry args={[0.24, 0.24, 0.78, 18]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#667788" roughness={0.3} metalness={0.8}/></mesh>
        <MLI w={0.47} h={0.76} d={0.012} gold={true}/>
        {/* Docking port (Chaser active) */}
        <group position={[0, 0, -0.41]}>
          <mesh><cylinderGeometry args={[0.11, 0.11, 0.12, 14]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/></mesh>
          <mesh position={[0,0,-0.07]}><torusGeometry args={[0.1,0.015,8,20]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/></mesh>
          {/* Capture latches */}
          {[0,1,2].map(i=>{
            const a=i*Math.PI*2/3;
            return <mesh key={i} position={[Math.cos(a)*0.09,Math.sin(a)*0.09,-0.08]}><boxGeometry args={[0.02,0.02,0.04]}/><meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.2}/></mesh>;
          })}
          {/* Proximity sensors */}
          {[0,1,2,3].map(i=>{
            const a=i*Math.PI/2;
            return <mesh key={i} position={[Math.cos(a)*0.13,Math.sin(a)*0.13,-0.04]}><sphereGeometry args={[0.02,6,6]}/><meshBasicMaterial color="#00FFAA"/></mesh>;
          })}
        </group>
        {/* Solar panels */}
        {[-1,1].map((s,i)=>(
          <group key={i} position={[s*0.72, 0, 0.05]}>
            <SolarArray w={0.88} h={0.42} segments={2}/>
          </group>
        ))}
        {/* Thrusters × 4 */}
        {[0,1,2,3].map(i=>{
          const a=i*Math.PI/2;
          return <Thruster key={i} px={Math.cos(a)*0.25} py={Math.sin(a)*0.25} pz={0.42} rotX={Math.PI/2}/>;
        })}
      </group>

      {/* SDX-02 Target (passive) */}
      <group position={[0, 0, -0.62 - (sep.current||0.18)]}>
        <mesh><cylinderGeometry args={[0.24, 0.24, 0.78, 18]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#556677" roughness={0.3} metalness={0.8}/></mesh>
        <MLI w={0.47} h={0.76} d={0.012} gold={false}/>
        {/* Passive docking cone */}
        <group position={[0, 0, 0.41]}>
          <mesh><cylinderGeometry args={[0.13, 0.08, 0.14, 14]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#999999" metalness={0.85} roughness={0.25}/></mesh>
          <mesh position={[0,0,0.08]}><torusGeometry args={[0.08,0.015,8,20]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/></mesh>
        </group>
        {[-1,1].map((s,i)=>(
          <group key={i} position={[s*0.72, 0, -0.05]}>
            <SolarArray w={0.88} h={0.42} segments={2}/>
          </group>
        ))}
        {[0,1,2,3].map(i=>{
          const a=i*Math.PI/2;
          return <Thruster key={i} px={Math.cos(a)*0.25} py={Math.sin(a)*0.25} pz={-0.42} rotX={-Math.PI/2}/>;
        })}
      </group>

      {/* Docking laser beam (visible when gap is small) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, Math.max(0.1, (sep.current||0.18)*2.2 - 0.5), 6]} rotation={[Math.PI/2,0,0]}/>
        <meshBasicMaterial color="#00FFAA" transparent opacity={0.5}/>
      </mesh>
    </group>
  );
}

// ─── GAGANYAAN — Human Spaceflight ─────────────────────────────────────────────
export function GaganyaanModel({ scale=1 }) {
  const g = useRef();
  return (
    <group ref={g} scale={[scale,scale,scale]}>
      {/* ── Crew Module ── */}
      <group position={[0, 0.62, 0]}>
        {/* Conical pressure vessel */}
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.48, 0.95, 24]}/>
          <meshStandardMaterial color="#DDDDDD" roughness={0.55} metalness={0.3}/>
        </mesh>
        {/* Ablative heat shield */}
        <mesh position={[0, -0.505, 0]}>
          <cylinderGeometry args={[0.485, 0.485, 0.09, 24]}/>
          <meshStandardMaterial color="#6B2D0A" roughness={0.95} metalness={0.05}/>
        </mesh>
        {/* Afterbody TPS tiles */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.49, 0.48, 0.6, 24]}/>
          <meshStandardMaterial color="#C8C0B0" roughness={0.85} metalness={0.1}/>
        </mesh>
        {/* 3 portholes */}
        {[0, 2.09, 4.19].map((a, i) => (
          <mesh key={i} position={[Math.sin(a)*0.43, 0.1, Math.cos(a)*0.43]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 12]} rotation={[0, a, Math.PI/2]}/>
            <meshStandardMaterial color="#88AACC" roughness={0.1} metalness={0.1} transparent opacity={0.65}/>
          </mesh>
        ))}
        {/* Forward hatch */}
        <mesh position={[0, 0.43, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 16]}/>
          <meshStandardMaterial color="#CCCCCC" roughness={0.4} metalness={0.5}/>
        </mesh>
        {/* Drogue chute mortars × 2 */}
        {[-0.18, 0.18].map((ox, i) => (
          <mesh key={i} position={[ox, 0.38, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.16, 8]}/>
            <meshStandardMaterial color="#CC8800" roughness={0.7} metalness={0.2}/>
          </mesh>
        ))}
        {/* Main chute canister */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.14, 14]}/>
          <meshStandardMaterial color="#CC8800" roughness={0.7} metalness={0.2}/>
        </mesh>
        {/* Crew ECS vents */}
        {[0,1,2,3].map(i=>{
          const a=i*Math.PI/2+Math.PI/4;
          return <mesh key={i} position={[Math.cos(a)*0.46, -0.35, Math.sin(a)*0.46]}>
            <cylinderGeometry args={[0.025,0.025,0.06,6]}/><meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3}/>
          </mesh>;
        })}
      </group>

      {/* ── Service Module ── */}
      <group position={[0, -0.42, 0]}>
        {/* Main cylinder */}
        <mesh><cylinderGeometry args={[0.48, 0.48, 1.1, 24]}/><meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/></mesh>
        {/* MLI wraps */}
        <MLI w={0.95} h={1.09} d={0.012} px={0.485} gold={true}/>
        <MLI w={0.95} h={1.09} d={0.012} px={-0.485} gold={false}/>
        <MLI w={0.95} h={1.09} d={0.012} pz={0.485} gold={true}/>
        <MLI w={0.95} h={1.09} d={0.012} pz={-0.485} gold={false}/>

        {/* 4 solar panels on deployable arms */}
        {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((angle, i) => (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh position={[0.55, 0.1, 0]} rotation={[0,0,Math.PI/2]}>
              <cylinderGeometry args={[0.022, 0.022, 0.58, 8]}/>
              <meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/>
            </mesh>
            <group position={[0.96, 0.1, 0]}>
              <SolarArray w={0.78} h={0.58} segments={2}/>
            </group>
          </group>
        ))}

        {/* 440N main bipropellant engine */}
        <EngineBell throat={0.07} exit={0.22} len={0.32} py={-0.68} rotX={-Math.PI/2}/>

        {/* 2× bi-prop tanks */}
        {[-0.18, 0.18].map((ox, i) => (
          <mesh key={i} position={[ox, 0, 0]}>
            <sphereGeometry args={[0.25, 14, 14]}/>
            <meshStandardMaterial color="#778899" roughness={0.35} metalness={0.8}/>
          </mesh>
        ))}

        {/* 16× RCS thrusters (quad pods × 4) */}
        {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((angle, i) => (
          <group key={i} rotation={[0, angle, 0]}>
            {[[-0.42, -0.45], [-0.42, -0.1]].map(([rx, ry], j) => (
              <mesh key={j} position={[rx, ry, 0]}>
                <cylinderGeometry args={[0.025, 0.04, 0.1, 8]} rotation={[0, 0, Math.PI/2]}/>
                <meshStandardMaterial color="#444444" roughness={0.5} metalness={0.7}/>
              </mesh>
            ))}
          </group>
        ))}

        {/* IINU inertial navigation box */}
        <mesh position={[0, 0.2, 0.49]}>
          <boxGeometry args={[0.16, 0.14, 0.12]}/>
          <meshStandardMaterial color="#334455" roughness={0.6} metalness={0.4}/>
        </mesh>
      </group>

      {/* ── Crew Module / Service Module umbilical ring ── */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.06, 24]}/>
        <meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/>
      </mesh>
    </group>
  );
}


// ─── NISAR — NASA-ISRO SAR ─────────────────────────────────────────────────────
// Large hexagonal bus, huge deployable SAR antenna boom, solar panels
export function NISARModel({ scale=1 }) {
  return (
    <group scale={[scale,scale,scale]}>
      {/* Hexagonal bus */}
      <mesh><cylinderGeometry args={[0.55, 0.55, 0.65, 6]}/><meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/></mesh>
      {/* Top deck MLI */}
      <mesh position={[0,0.34,0]}><cylinderGeometry args={[0.54,0.54,0.02,6]}/><meshStandardMaterial color="#C8A020" roughness={0.2} metalness={0.9}/></mesh>
      {/* SAR antenna boom — 12m deployed, shown at scale */}
      <group position={[0, 0, 0.8]}>
        {/* Boom */}
        <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.025,0.025,1.6,8]}/><meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/></mesh>
        {/* L-band reflector (large) */}
        <mesh position={[0,0,0.85]}><boxGeometry args={[2.4,0.55,0.02]}/><meshStandardMaterial color="#223355" roughness={0.4} metalness={0.5} side={THREE.DoubleSide}/></mesh>
        {/* S-band reflector (small, offset) */}
        <mesh position={[0.8,0.35,0.5]}><boxGeometry args={[1.2,0.3,0.02]}/><meshStandardMaterial color="#334466" roughness={0.4} metalness={0.5} side={THREE.DoubleSide}/></mesh>
        {/* Struts */}
        {[-1,1].map((s,i)=><mesh key={i} position={[s*1.1,0,0.55]} rotation={[0,0,s*0.15]}><cylinderGeometry args={[0.01,0.01,0.6,6]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/></mesh>)}
      </group>
      {/* Twin solar panels */}
      {[-1,1].map((s,i)=>(
        <group key={i} position={[s*1.1, 0, -0.2]}>
          <mesh><boxGeometry args={[1.2,0.85,0.02]}/><meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/></mesh>
          <mesh position={[s>0?-0.62:0.62,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.022,0.022,0.6,8]}/><meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/></mesh>
        </group>
      ))}
      {/* High Gain Antenna */}
      <group position={[0,0.55,-0.3]} rotation={[-0.3,0,0]}>
        <mesh><sphereGeometry args={[0.35,16,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#CCCCCC" roughness={0.15} metalness={0.92} side={THREE.DoubleSide}/></mesh>
      </group>
    </group>
  );
}

// ─── SHUKRAYAAN-1 — Venus Orbiter ──────────────────────────────────────────────
// Based on Chandrayaan-2 orbiter bus with SAR + modified instruments for Venus
export function ShukrayaanModel({ scale=1 }) {
  return (
    <group scale={[scale,scale,scale]}>
      {/* Bus */}
      <mesh><boxGeometry args={[0.9,0.78,1.05]}/><meshStandardMaterial color="#333333" roughness={0.55} metalness={0.55}/></mesh>
      {/* MLI — golden to handle Venus solar intensity */}
      <mesh position={[0,0,0.535]}><boxGeometry args={[0.89,0.77,0.01]}/><meshStandardMaterial color="#D4A800" roughness={0.15} metalness={0.95}/></mesh>
      <mesh position={[0,0,-0.535]}><boxGeometry args={[0.89,0.77,0.01]}/><meshStandardMaterial color="#D4A800" roughness={0.15} metalness={0.95}/></mesh>
      <mesh position={[0,0.4,0]}><boxGeometry args={[0.89,0.01,1.04]}/><meshStandardMaterial color="#D4A800" roughness={0.15} metalness={0.95}/></mesh>
      {/* Solar panels — smaller than Mars mission (Venus is closer to Sun, less area needed) */}
      {[-1,1].map((s,i)=>(
        <group key={i} position={[s*1.1, 0, 0]}>
          <mesh><boxGeometry args={[1.1,0.65,0.022]}/><meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/></mesh>
        </group>
      ))}
      {/* SAR antenna */}
      <mesh position={[0,-0.42,-0.1]}><boxGeometry args={[0.85,0.04,0.55]}/><meshStandardMaterial color="#222244" roughness={0.5} metalness={0.55}/></mesh>
      {/* VATM atmospheric instrument */}
      <mesh position={[0.38,0.42,0.3]}><cylinderGeometry args={[0.06,0.08,0.32,12]}/><meshStandardMaterial color="#334455" roughness={0.55} metalness={0.45}/></mesh>
      {/* HGA */}
      <group position={[0,0.55,-0.25]} rotation={[-0.3,0,0]}>
        <mesh><sphereGeometry args={[0.44,20,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#CCCCCC" roughness={0.2} metalness={0.85} side={THREE.DoubleSide}/></mesh>
      </group>
      <mesh position={[0,0,0.58]}><cylinderGeometry args={[0.065,0.18,0.3,12]}/><meshStandardMaterial color="#333333" roughness={0.5} metalness={0.7}/></mesh>
    </group>
  );
}

// ─── LUPEX Rover ──────────────────────────────────────────────────────────────
// JAXA lander + ISRO rover — larger rover than Pragyan with drill system
export function LUPEXModel({ scale=1 }) {
  return (
    <group scale={[scale,scale,scale]}>
      {/* JAXA lander base */}
      <group position={[0, -0.35, 0]}>
        <mesh><boxGeometry args={[0.9,0.4,0.9]}/><meshStandardMaterial color="#445566" roughness={0.5} metalness={0.6}/></mesh>
        {/* 4 landing legs */}
        {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([lx,lz],i)=>(
          <group key={i} position={[lx*0.45,0,lz*0.45]}>
            <mesh rotation={[lz*0.4,0,lx*0.4]}><cylinderGeometry args={[0.022,0.022,0.65,8]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.2}/></mesh>
            <mesh position={[lx*0.22,-0.38,lz*0.22]}><cylinderGeometry args={[0.09,0.09,0.04,12]}/><meshStandardMaterial color="#666666" roughness={0.7} metalness={0.5}/></mesh>
          </group>
        ))}
        {/* Lander solar panels */}
        {[-1,1].map((s,i)=>(
          <mesh key={i} position={[s*0.7,0.25,0]}><boxGeometry args={[0.7,0.5,0.02]}/><meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/></mesh>
        ))}
      </group>
      {/* ISRO rover body — larger than Pragyan */}
      <group position={[0, 0.08, 0]}>
        <mesh><boxGeometry args={[0.45,0.22,0.6]}/><meshStandardMaterial color="#C8A020" roughness={0.45} metalness={0.6}/></mesh>
        {/* Rover solar panel */}
        <mesh position={[0,0.18,0]}><boxGeometry args={[0.52,0.012,0.58]}/><meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/></mesh>
        {/* Drill system — key LUPEX instrument */}
        <group position={[0,-0.14,0.32]}>
          <mesh><cylinderGeometry args={[0.04,0.04,0.55,10]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/></mesh>
          {/* Drill bit */}
          <mesh position={[0,-0.3,0]}><coneGeometry args={[0.035,0.15,8]}/><meshStandardMaterial color="#666666" metalness={0.9} roughness={0.2}/></mesh>
        </group>
        {/* 6 wheels with wider treads for soft regolith */}
        {[[-0.28,0.18],[-0.28,0],[-0.28,-0.18],[0.28,0.18],[0.28,0],[0.28,-0.18]].map(([wx,wz],i)=>(
          <mesh key={i} position={[wx,-0.14,wz]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.085,0.085,0.06,14]}/><meshStandardMaterial color="#222222" roughness={0.95} metalness={0.1}/>
          </mesh>
        ))}
        {/* NavCam mast */}
        <mesh position={[0,0.28,0.2]}><cylinderGeometry args={[0.02,0.02,0.28,8]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/></mesh>
        {[-0.05,0.05].map((cx,i)=>(
          <mesh key={i} position={[cx,0.42,0.22]}><cylinderGeometry args={[0.018,0.018,0.04,8]} rotation={[Math.PI/2,0,0]}/><meshStandardMaterial color="#111111" roughness={0.7} metalness={0.3}/></mesh>
        ))}
      </group>
    </group>
  );
}

// ─── CHANDRAYAAN-4 — Sample Return ────────────────────────────────────────────
// Complex: Propulsion Module + Lander + Ascent Vehicle + Transfer + Re-entry Capsule
export function Chandrayaan4Model({ scale=1 }) {
  return (
    <group scale={[scale,scale,scale]}>
      {/* Propulsion Module (stays in lunar orbit) */}
      <group position={[0, 0.7, 0]}>
        <mesh><cylinderGeometry args={[0.42,0.42,0.7,20]}/><meshStandardMaterial color="#445566" roughness={0.45} metalness={0.65}/></mesh>
        {/* PM solar panels */}
        {[0,Math.PI/2,Math.PI,Math.PI*1.5].map((angle,i)=>(
          <group key={i} rotation={[0,angle,0]}>
            <mesh position={[0.7,0,0]}><boxGeometry args={[0.7,0.5,0.02]}/><meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/></mesh>
            <mesh position={[0.37,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.02,0.02,0.4,8]}/><meshStandardMaterial color="#AAAAAA" metalness={0.9} roughness={0.2}/></mesh>
          </group>
        ))}
        <mesh position={[0,0.42,0]}><cylinderGeometry args={[0.44,0.44,0.04,20]}/><meshStandardMaterial color="#888888" metalness={0.85} roughness={0.25}/></mesh>
      </group>

      {/* Lander Module (same as Vikram heritage) */}
      <group position={[0, 0.08, 0]}>
        <mesh><boxGeometry args={[0.85,0.5,0.85]}/><meshStandardMaterial color="#C8A020" roughness={0.4} metalness={0.6}/></mesh>
        {[-1,1].map((s,i)=>(
          <group key={i} position={[s*0.92, 0, 0]}>
            <mesh><boxGeometry args={[0.88,0.5,0.02]}/><meshStandardMaterial color="#1A3460" roughness={0.35} metalness={0.4} side={THREE.DoubleSide}/></mesh>
          </group>
        ))}
        {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([lx,lz],i)=>(
          <group key={i} position={[lx*0.42,0,lz*0.42]}>
            <mesh rotation={[lz*0.42,0,lx*0.42]}><cylinderGeometry args={[0.023,0.023,0.72,8]}/><meshStandardMaterial color="#999999" metalness={0.85} roughness={0.2}/></mesh>
            <mesh position={[lx*0.23,-0.44,lz*0.23]}><cylinderGeometry args={[0.09,0.09,0.04,12]}/><meshStandardMaterial color="#666666" roughness={0.7} metalness={0.5}/></mesh>
          </group>
        ))}
      </group>

      {/* Ascent Vehicle (returns samples to orbit) */}
      <group position={[0, -0.48, 0]}>
        <mesh rotation={[Math.PI,0,0]}><coneGeometry args={[0.22,0.55,16]}/><meshStandardMaterial color="#CCCCCC" roughness={0.45} metalness={0.5}/></mesh>
        {/* Sample container */}
        <mesh position={[0,0.15,0]}><cylinderGeometry args={[0.12,0.12,0.25,14]}/><meshStandardMaterial color="#D4A800" roughness={0.3} metalness={0.7}/></mesh>
        {/* Ascent engine */}
        <mesh position={[0,0.32,0]}><cylinderGeometry args={[0.055,0.13,0.2,12]}/><meshStandardMaterial color="#333333" roughness={0.5} metalness={0.7}/></mesh>
      </group>
    </group>
  );
}

// ─── Model map ────────────────────────────────────────────────────────────────
export const SPACECRAFT_MODELS = {
  mangalyaan:   MangalyaanModel,
  chandrayaan1: Chandrayaan1Model,
  chandrayaan2: Chandrayaan2Model,
  chandrayaan3: Chandrayaan3Model,
  adityaL1:     AdityaL1Model,
  spadex:       SpaDeXModel,
  gaganyaan:    GaganyaanModel,
  nisar:        NISARModel,
  shukrayaan:   ShukrayaanModel,
  lupex:        LUPEXModel,
  chandrayaan4: Chandrayaan4Model,
};

export function getSpacecraftModel(missionId) {
  return SPACECRAFT_MODELS[missionId] || null;
}
