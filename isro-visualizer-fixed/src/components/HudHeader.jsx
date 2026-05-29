import { useState, useRef, useEffect } from 'react';
import { CAMERA_PRESETS } from './SolarSystem';
import { STATS } from '../data/missions';
import SearchBar from './SearchBar';

// Closes dropdown when clicking outside
function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

// Generic dropdown wrapper
function Dropdown({ trigger, children, align = 'right', width = 220 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useClickOutside(ref, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(p => !p)}>{trigger(open)}</div>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          [align]: 0,
          width,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-active)',
          borderRadius: 7,
          padding: '12px 14px',
          backdropFilter: 'var(--panel-blur)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          zIndex: 300,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Btn({ active, onClick, children, title }) {
  return (
    <button className={`hud-btn ${active ? 'active' : ''}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

function SliderRow({ label, value, min, max, step, onChange, display, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--isro-teal)' }}>{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(format ? format(e.target.value) : parseFloat(e.target.value))}
        style={{
          width: '100%', height: 3, appearance: 'none', WebkitAppearance: 'none',
          background: `linear-gradient(to right, var(--accent-primary) ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
          borderRadius: 2, outline: 'none', cursor: 'pointer',
        }}
      />
    </div>
  );
}

function PresetRow({ options, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(([label, val]) => (
        <button key={val} onClick={() => onSelect(val)} style={{
          flex: 1, padding: '3px 0', borderRadius: 3, cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.05em',
          background: Math.abs(active - val) < 0.05 ? 'rgba(0,201,177,0.18)' : 'transparent',
          border: `1px solid ${Math.abs(active - val) < 0.05 ? 'var(--border-active)' : 'var(--border-subtle)'}`,
          color: Math.abs(active - val) < 0.05 ? 'var(--accent-primary)' : 'var(--text-muted)',
          transition: 'all 0.1s',
        }}>{label}</button>
      ))}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 0' }}/>;
}

export default function HudHeader({
  showOrbits, onToggleOrbits, orbitBrightness, onOrbitBrightness,
  showConstellation, onToggleConstellation,
  showLabels, onToggleLabels,
  showUpcoming, onToggleUpcoming,
  soundEnabled, onToggleSound,
  theme, onToggleTheme,
  onFocusObject,
  compareMode, onToggleCompare,
  onAddMission,
  scaleMultiplier, onScaleMultiplier,
  sizeMode, onSizeMode, sizeMultiplier, onSizeMultiplier,
  cameraPreset, onSetPreset, fov, onSetFov,
}) {
  return (
    <div className="hud-header" style={{ flexWrap: 'nowrap', gap: 12 }}>

      {/* ── Logo ── */}
      <div className="hud-logo" style={{ flexShrink: 0 }}>
        <div className="logo-ring"><span className="logo-ring-inner">☽</span></div>
        <div className="logo-text">
          <span className="logo-isro">ISRO</span>
          <span className="logo-subtitle">Mission Control · Solar Viz</span>
        </div>
      </div>

      {/* ── Stats (hidden below 1300px via CSS) ── */}
      <div className="hud-stats" style={{ flexShrink: 0 }}>
        {STATS.map(s => (
          <div key={s.label} className="hud-stat">
            <div className="hud-stat-value">{s.value}</div>
            <div className="hud-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }}/>

      {/* ── Right controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

        {/* Search */}
        <SearchBar onFocus={onFocusObject} theme={theme}/>

        {/* ── View ── Camera presets + FOV */}
        <Dropdown width={240} trigger={open => (
          <Btn active={cameraPreset !== 'overview' || fov !== 48}>⊹ View</Btn>
        )}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:9 }}>Camera Preset</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:10 }}>
            {Object.entries(CAMERA_PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => onSetPreset(key)} style={{
                padding:'6px 8px', borderRadius:4, cursor:'pointer', textAlign:'left', transition:'all 0.1s',
                background: cameraPreset===key ? 'rgba(0,201,177,0.14)' : 'rgba(0,0,0,0.18)',
                border:`1px solid ${cameraPreset===key ? 'var(--border-active)' : 'var(--border-subtle)'}`,
              }}>
                <div style={{ fontFamily:'var(--font-body)', fontSize:11, fontWeight:600, color: cameraPreset===key ? 'var(--accent-primary)' : 'var(--text-primary)', lineHeight:1.2 }}>{p.label}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-muted)', marginTop:2 }}>{p.sub}</div>
              </button>
            ))}
          </div>
          <Divider/>
          <SliderRow label="Field of View" value={fov} min={25} max={90} step={1}
            onChange={onSetFov} display={`${fov}°`}/>
          <Divider/>
          <button onClick={() => { onSetPreset('overview'); onSetFov(48); }} style={{
            width:'100%', padding:'5px 0', background:'transparent',
            border:'1px solid var(--border-subtle)', borderRadius:4,
            color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:8,
            letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer',
          }}>↺ Reset</button>
        </Dropdown>

        {/* ── Display ── Orbits + Labels + Constellation */}
        <Dropdown width={220} trigger={open => (
          <Btn active={showOrbits || showLabels || showConstellation}>⊡ Display</Btn>
        )}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:9 }}>Display Options</div>

          {/* Orbit toggle + brightness */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>Orbit paths</span>
            <button onClick={onToggleOrbits} style={{
              padding:'2px 10px', borderRadius:3, cursor:'pointer',
              fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em',
              background: showOrbits ? 'rgba(0,201,177,0.16)' : 'transparent',
              border:`1px solid ${showOrbits ? 'var(--border-active)' : 'var(--border-subtle)'}`,
              color: showOrbits ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}>{showOrbits ? 'ON' : 'OFF'}</button>
          </div>
          {showOrbits && (
            <div style={{ marginBottom:10, paddingLeft:4 }}>
              <SliderRow label="Brightness" value={Math.round(orbitBrightness*100)} min={0} max={100} step={5}
                onChange={v => onOrbitBrightness(v/100)} display={`${Math.round(orbitBrightness*100)}%`}/>
            </div>
          )}

          {/* Labels toggle */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>Planet labels</span>
            <button onClick={onToggleLabels} style={{
              padding:'2px 10px', borderRadius:3, cursor:'pointer',
              fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em',
              background: showLabels ? 'rgba(0,201,177,0.16)' : 'transparent',
              border:`1px solid ${showLabels ? 'var(--border-active)' : 'var(--border-subtle)'}`,
              color: showLabels ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}>{showLabels ? 'ON' : 'OFF'}</button>
          </div>

          {/* NavIC constellation */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>NavIC satellites</span>
            <button onClick={onToggleConstellation} style={{
              padding:'2px 10px', borderRadius:3, cursor:'pointer',
              fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em',
              background: showConstellation ? 'rgba(0,201,177,0.16)' : 'transparent',
              border:`1px solid ${showConstellation ? 'var(--border-active)' : 'var(--border-subtle)'}`,
              color: showConstellation ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}>{showConstellation ? 'ON' : 'OFF'}</button>
          </div>
        </Dropdown>

        {/* ── Scale ── Planet sizes + spacecraft scale */}
        <Dropdown width={240} trigger={open => (
          <Btn active={sizeMode !== 'artistic' || scaleMultiplier !== 1 || sizeMultiplier !== 1}>◉ Scale</Btn>
        )}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:9 }}>Planet Size Mode</div>
          {[
            { key:'artistic', label:'Artistic',  sub:'Boosted for visibility' },
            { key:'relative', label:'Relative',  sub:'Real proportions'       },
            { key:'true',     label:'True Scale', sub:'Physically accurate'   },
          ].map(({ key, label, sub }) => (
            <div key={key} onClick={() => onSizeMode(key)} style={{
              display:'flex', alignItems:'center', gap:9,
              padding:'6px 8px', marginBottom:4, borderRadius:4, cursor:'pointer',
              background: sizeMode===key ? 'rgba(0,201,177,0.11)' : 'transparent',
              border:`1px solid ${sizeMode===key ? 'var(--border-active)' : 'var(--border-subtle)'}`,
            }}>
              <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background: sizeMode===key ? 'var(--accent-primary)' : 'var(--text-muted)' }}/>
              <div>
                <div style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:600, color: sizeMode===key ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-muted)' }}>{sub}</div>
              </div>
            </div>
          ))}
          <Divider/>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <SliderRow label="Planet multiplier" value={Math.round(sizeMultiplier*100)} min={25} max={300} step={25}
              onChange={v => onSizeMultiplier(v/100)} display={`${Math.round(sizeMultiplier*100)}%`}/>
            <SliderRow label="Spacecraft multiplier" value={Math.round(scaleMultiplier*100)} min={20} max={300} step={10}
              onChange={v => onScaleMultiplier(v/100)} display={`${Math.round(scaleMultiplier*100)}%`}/>
          </div>
        </Dropdown>

        {/* ── Missions ── Upcoming + Compare + Add */}
        <Dropdown width={200} trigger={open => (
          <Btn active={compareMode || showUpcoming}>⊞ Missions</Btn>
        )}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:9 }}>Mission Tools</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <button onClick={onToggleUpcoming} style={{
              padding:'8px 10px', borderRadius:4, cursor:'pointer', textAlign:'left',
              background: showUpcoming ? 'rgba(255,153,51,0.12)' : 'rgba(0,0,0,0.15)',
              border:`1px solid ${showUpcoming ? 'rgba(255,153,51,0.4)' : 'var(--border-subtle)'}`,
            }}>
              <div style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:600, color: showUpcoming ? 'var(--isro-saffron)' : 'var(--text-primary)' }}>◷ Upcoming & Countdowns</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', marginTop:2 }}>5 missions scheduled</div>
            </button>
            <button onClick={onToggleCompare} style={{
              padding:'8px 10px', borderRadius:4, cursor:'pointer', textAlign:'left',
              background: compareMode ? 'rgba(0,201,177,0.12)' : 'rgba(0,0,0,0.15)',
              border:`1px solid ${compareMode ? 'var(--border-active)' : 'var(--border-subtle)'}`,
            }}>
              <div style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:600, color: compareMode ? 'var(--accent-primary)' : 'var(--text-primary)' }}>⊞ Compare Missions</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', marginTop:2 }}>Side-by-side analysis</div>
            </button>
            <button onClick={onAddMission} style={{
              padding:'8px 10px', borderRadius:4, cursor:'pointer', textAlign:'left',
              background:'rgba(0,201,177,0.08)',
              border:'1px solid var(--border-active)',
            }}>
              <div style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:600, color:'var(--accent-primary)' }}>+ Add Custom Mission</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', marginTop:2 }}>Custom satellite or spacecraft</div>
            </button>
          </div>
        </Dropdown>

        {/* ── Settings ── Sound + Theme */}
        <Dropdown width={180} align="right" trigger={open => (
          <Btn>⚙</Btn>
        )}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:9 }}>Settings</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>Sound</span>
              <button onClick={onToggleSound} style={{
                padding:'2px 10px', borderRadius:3, cursor:'pointer',
                fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em',
                background: soundEnabled ? 'rgba(0,201,177,0.16)' : 'transparent',
                border:`1px solid ${soundEnabled ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                color: soundEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}>{soundEnabled ? '♪ ON' : '♪ OFF'}</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:500, color:'var(--text-primary)' }}>Theme</span>
              <button onClick={onToggleTheme} style={{
                padding:'2px 10px', borderRadius:3, cursor:'pointer',
                fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.1em',
                background:'transparent', border:'1px solid var(--border-subtle)',
                color:'var(--text-muted)',
              }}>{theme === 'dark' ? '☀ Light' : '◐ Dark'}</button>
            </div>
            <Divider/>
            <a href="https://www.isro.gov.in" target="_blank" rel="noreferrer" style={{
              display:'block', padding:'6px 10px', borderRadius:4,
              background:'rgba(0,0,0,0.15)', border:'1px solid var(--border-subtle)',
              color:'var(--text-secondary)', fontFamily:'var(--font-body)', fontSize:12, fontWeight:500,
              textDecoration:'none', textAlign:'center',
            }}>↗ ISRO.gov.in</a>
          </div>
        </Dropdown>

      </div>
    </div>
  );
}
