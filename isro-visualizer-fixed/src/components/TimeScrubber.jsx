import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { formatDate } from '../utils/orbits';

// ─── Speed presets ────────────────────────────────────────────────────────────
const SPEEDS = [
  { label: '1x',    value: 1    },
  { label: '10x',   value: 10   },
  { label: '100x',  value: 100  },
  { label: '1000x', value: 1000 },
];

// ─── Range presets ────────────────────────────────────────────────────────────
const RANGE_PRESETS = [
  { label: 'All Missions',  start: 2008, end: 2030 },
  { label: 'History',       start: 1960, end: 2010 },
  { label: 'Golden Era',    start: 2013, end: 2024 },
  { label: 'Lunar Focus',   start: 2008, end: 2016 },
  { label: 'Recent',        start: 2019, end: 2026 },
  { label: 'Future',        start: 2025, end: 2030 },
  { label: 'Full History',  start: 1960, end: 2030 },
];

// ─── Historical ISRO milestones (beyond mission launches) ─────────────────────
const MILESTONES = [
  { year: 1963, label: 'First sounding rocket', short: '1963', color: '#888888' },
  { year: 1969, label: 'ISRO founded', short: 'Founded', color: '#FFD700' },
  { year: 1975, label: 'Aryabhata — first Indian satellite', short: 'Aryabhata', color: '#FF9933' },
  { year: 1980, label: 'SLV-3 — first orbital launch', short: 'SLV-3', color: '#FF9933' },
  { year: 1994, label: 'PSLV first success', short: 'PSLV', color: '#00C9B1' },
  { year: 2001, label: 'GSLV first launch', short: 'GSLV', color: '#00C9B1' },
];

function msOf(year, month = 0, day = 1) {
  return new Date(year, month, day).getTime();
}

// ─── Dual-handle range slider ─────────────────────────────────────────────────
function DualRangeSlider({ minYear, maxYear, startYear, endYear, onStartChange, onEndChange }) {
  const trackRef  = useRef();
  const dragging  = useRef(null); // 'start' | 'end' | null

  const toPercent = y => ((y - minYear) / (maxYear - minYear)) * 100;
  const toYear    = pct => Math.round(minYear + (pct / 100) * (maxYear - minYear));

  const getClientX = (e) => e.touches ? e.touches[0].clientX : e.clientX;

  const getClickYear = useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((getClientX(e) - rect.left) / rect.width) * 100));
    return toYear(pct);
  }, [minYear, maxYear]);

  const onMouseDown = (handle) => (e) => {
    e.preventDefault();
    dragging.current = handle;
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !trackRef.current) return;
      const y = getClickYear(e);
      if (dragging.current === 'start') onStartChange(Math.min(y, endYear - 1));
      else                              onEndChange(Math.max(y, startYear + 1));
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [getClickYear, startYear, endYear, onStartChange, onEndChange]);

  const startPct = toPercent(startYear);
  const endPct   = toPercent(endYear);

  return (
    <div ref={trackRef} style={{ position:'relative', height:20, cursor:'default', userSelect:'none', margin:'4px 0' }}>
      {/* Track background */}
      <div style={{
        position:'absolute', left:0, right:0, top:'50%', transform:'translateY(-50%)',
        height:3, background:'rgba(255,255,255,0.06)', borderRadius:2,
      }}/>
      {/* Active range fill */}
      <div style={{
        position:'absolute', top:'50%', transform:'translateY(-50%)',
        left:`${startPct}%`, width:`${endPct - startPct}%`,
        height:3, background:'var(--accent-primary)', borderRadius:2, opacity:0.7,
      }}/>
      {/* Year labels for each handle */}
      <div style={{
        position:'absolute', left:`${startPct}%`, top:-14,
        transform:'translateX(-50%)',
        fontFamily:'var(--font-mono)', fontSize:7, color:'var(--accent-primary)',
        letterSpacing:'0.08em', whiteSpace:'nowrap',
      }}>{startYear}</div>
      <div style={{
        position:'absolute', left:`${endPct}%`, top:-14,
        transform:'translateX(-50%)',
        fontFamily:'var(--font-mono)', fontSize:7, color:'var(--accent-primary)',
        letterSpacing:'0.08em', whiteSpace:'nowrap',
      }}>{endYear}</div>
      {/* Start handle */}
      <div
        onMouseDown={onMouseDown('start')}
        onTouchStart={onMouseDown('start')}
        style={{
          position:'absolute', left:`${startPct}%`, top:'50%',
          transform:'translate(-50%, -50%)',
          width:14, height:14, borderRadius:'50%',
          background:'var(--bg-deep)', border:'2px solid var(--accent-primary)',
          cursor:'ew-resize', zIndex:3,
          boxShadow:'0 0 6px var(--accent-glow)',
        }}
      />
      {/* End handle */}
      <div
        onMouseDown={onMouseDown('end')}
        onTouchStart={onMouseDown('end')}
        style={{
          position:'absolute', left:`${endPct}%`, top:'50%',
          transform:'translate(-50%, -50%)',
          width:14, height:14, borderRadius:'50%',
          background:'var(--bg-deep)', border:'2px solid var(--accent-primary)',
          cursor:'ew-resize', zIndex:3,
          boxShadow:'0 0 6px var(--accent-glow)',
        }}
      />
    </div>
  );
}

// ─── Mission density mini-map ─────────────────────────────────────────────────
function DensityMap({ missions, rangeStart, rangeEnd, onJump }) {
  const span = rangeEnd - rangeStart;
  // Bin missions by year
  const bins = useMemo(() => {
    const b = {};
    for (let y = rangeStart; y <= rangeEnd; y++) b[y] = 0;
    missions.forEach(m => {
      const y = new Date(m.launchDate).getFullYear();
      if (y >= rangeStart && y <= rangeEnd) b[y] = (b[y] || 0) + 1;
    });
    return b;
  }, [missions, rangeStart, rangeEnd]);

  const maxCount = Math.max(1, ...Object.values(bins));
  const years    = Object.keys(bins).map(Number);
  const barW     = Math.max(2, Math.min(16, 260 / span));

  return (
    <div style={{
      display:'flex', alignItems:'flex-end', height:22, gap:1,
      marginBottom:4, cursor:'pointer',
    }}>
      {years.map(y => {
        const count = bins[y] || 0;
        const h     = count === 0 ? 2 : Math.max(4, (count / maxCount) * 20);
        return (
          <div
            key={y}
            onClick={() => onJump(new Date(y, 0, 1))}
            title={`${y}: ${count} mission${count !== 1 ? 's' : ''}`}
            style={{
              flex:1, height:`${h}px`,
              background: count > 0 ? `rgba(0,201,177,${0.3 + (count/maxCount)*0.6})` : 'rgba(255,255,255,0.04)',
              borderRadius:'1px 1px 0 0',
              minWidth: 1,
              transition:'background 0.2s',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TimeScrubber({ date, onDateChange, missions = [] }) {
  const [isPlaying,   setIsPlaying]  = useState(false);
  const [speed,       setSpeed]      = useState(100);
  const [rangeStart,  setRangeStart] = useState(2008);
  const [rangeEnd,    setRangeEnd]   = useState(2030);
  const [showRange,   setShowRange]  = useState(false);
  const [showJump,    setShowJump]   = useState(false);
  const [jumpYear,    setJumpYear]   = useState('');
  const [jumpMonth,   setJumpMonth]  = useState('01');
  const [hoveredMark, setHoveredMark]= useState(null);
  const [markTipPos,  setMarkTipPos] = useState({ x:0, y:0 });
  const [showDensity, setShowDensity]= useState(true);

  const rafRef      = useRef(null);
  const lastTimeRef = useRef(null);

  const MIN_MS   = useMemo(() => msOf(rangeStart),       [rangeStart]);
  const MAX_MS   = useMemo(() => msOf(rangeEnd, 11, 31), [rangeEnd]);
  const RANGE_MS = MAX_MS - MIN_MS;

  const progressPercent = Math.max(0, Math.min(100,
    ((date.getTime() - MIN_MS) / RANGE_MS) * 100
  ));

  // ── Playback ──────────────────────────────────────────────────────────────
  const tick = useCallback((timestamp) => {
    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    onDateChange(prev => {
      const next = new Date(prev.getTime() + delta * speed * 86400);
      if (next.getTime() >= MAX_MS) { setIsPlaying(false); return new Date(MAX_MS); }
      return next;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, onDateChange, MAX_MS]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, tick]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onDateChange(d => new Date(d.getTime() + speed * 86400000));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onDateChange(d => new Date(d.getTime() - speed * 86400000));
      }
      if (e.key === '[') setSpeed(s => {
        const idx = SPEEDS.findIndex(sp => sp.value === s);
        return SPEEDS[Math.max(0, idx - 1)].value;
      });
      if (e.key === ']') setSpeed(s => {
        const idx = SPEEDS.findIndex(sp => sp.value === s);
        return SPEEDS[Math.min(SPEEDS.length - 1, idx + 1)].value;
      });
      if (e.key === 'Home') onDateChange(new Date(MIN_MS));
      if (e.key === 'End')  onDateChange(new Date(MAX_MS));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [speed, onDateChange, MIN_MS, MAX_MS]);

  const handleTrackChange = (e) => {
    const pct = parseFloat(e.target.value) / 100;
    onDateChange(new Date(MIN_MS + pct * RANGE_MS));
  };

  const handlePlayPause = () => {
    if (date.getTime() >= MAX_MS) onDateChange(new Date(MIN_MS));
    setIsPlaying(p => !p);
  };

  const handleNow = () => { setIsPlaying(false); onDateChange(new Date()); };

  const handleJump = () => {
    const y = parseInt(jumpYear);
    const m = parseInt(jumpMonth) - 1;
    if (y >= 1900 && y <= 2100) {
      onDateChange(new Date(y, m, 1));
      // Auto-expand range if needed
      if (y < rangeStart) setRangeStart(Math.max(1960, y - 2));
      if (y > rangeEnd)   setRangeEnd(Math.min(2100, y + 2));
      setShowJump(false);
      setJumpYear('');
    }
  };

  // ── Mission markers ───────────────────────────────────────────────────────
  const missionMarkers = useMemo(() =>
    missions
      .filter(m => m.launchDate && m.shortName)
      .map(m => {
        const ms  = new Date(m.launchDate).getTime();
        const pct = ((ms - MIN_MS) / RANGE_MS) * 100;
        return { ...m, pct, ms };
      })
      .filter(m => m.pct >= 0 && m.pct <= 100),
  [missions, MIN_MS, RANGE_MS]);

  // ── Historical milestone markers ──────────────────────────────────────────
  const milestoneMarkers = useMemo(() =>
    MILESTONES
      .map(m => {
        const ms  = msOf(m.year);
        const pct = ((ms - MIN_MS) / RANGE_MS) * 100;
        return { ...m, pct, ms };
      })
      .filter(m => m.pct >= 0 && m.pct <= 100),
  [MIN_MS, RANGE_MS]);

  // ── Year ticks ────────────────────────────────────────────────────────────
  const yearTicks = useMemo(() => {
    const span = rangeEnd - rangeStart;
    const interval = span <= 6 ? 1 : span <= 15 ? 2 : span <= 40 ? 5 : 10;
    const ticks = [];
    for (let y = Math.ceil(rangeStart / interval) * interval; y <= rangeEnd; y += interval) {
      const pct = ((msOf(y) - MIN_MS) / RANGE_MS) * 100;
      if (pct >= 0 && pct <= 100) ticks.push({ y, pct });
    }
    return ticks;
  }, [rangeStart, rangeEnd, MIN_MS, RANGE_MS]);

  // ── Auto-expand when scrubbing near edge ─────────────────────────────────
  const nearEdge = progressPercent > 97 || progressPercent < 3;

  return (
    <div className="time-scrubber" style={{ paddingBottom: 8 }}>

      {/* ── Top row ── */}
      <div className="scrubber-top">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="scrubber-label">Timeline</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)' }}>
            {rangeStart}–{rangeEnd}
          </span>
        </div>
        <span className="scrubber-date">{formatDate(date)}</span>
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {SPEEDS.map(s => (
            <button key={s.label} className={`speed-btn ${speed === s.value ? 'active' : ''}`}
              onClick={() => setSpeed(s.value)} title={`${s.label} (use [ ] to change)`}>
              {s.label}
            </button>
          ))}

          {/* Jump to date */}
          <div style={{ position:'relative' }}>
            <button className="speed-btn" onClick={() => { setShowJump(p=>!p); setShowRange(false); }} title="Jump to date (⌖)">⌖</button>
            {showJump && (
              <div style={{
                position:'absolute', bottom:'calc(100% + 6px)', right:0,
                background:'var(--bg-glass)', border:'1px solid var(--border-active)',
                borderRadius:6, padding:'10px 12px', backdropFilter:'var(--panel-blur)',
                boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:300, width:190,
                display:'flex', flexDirection:'column', gap:7,
              }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
                  Jump to Date
                </div>
                <div style={{ display:'flex', gap:5 }}>
                  <input type="number" placeholder="YYYY" value={jumpYear}
                    onChange={e => setJumpYear(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJump()}
                    style={{ flex:2, padding:'5px 7px', background:'rgba(0,0,0,0.4)', border:'1px solid var(--border-subtle)', borderRadius:4, color:'var(--text-primary)', fontFamily:'var(--font-mono)', fontSize:11, outline:'none', width:0 }}
                  />
                  <select value={jumpMonth} onChange={e => setJumpMonth(e.target.value)}
                    style={{ flex:1.5, padding:'5px 4px', background:'rgba(0,0,0,0.4)', border:'1px solid var(--border-subtle)', borderRadius:4, color:'var(--text-primary)', fontFamily:'var(--font-mono)', fontSize:10, outline:'none', cursor:'pointer', width:0 }}>
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                      .map((m,i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                  </select>
                </div>
                <button onClick={handleJump} style={{ padding:'5px 0', background:'rgba(0,201,177,0.14)', border:'1px solid var(--border-active)', borderRadius:4, color:'var(--accent-primary)', fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer' }}>
                  Go ↵
                </button>
                {/* Quick mission year buttons */}
                <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:2 }}>Key Years</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {[1969,1975,2008,2013,2019,2023,2024,2027,2028].map(y => (
                    <button key={y} onClick={() => { onDateChange(new Date(y,0,1)); if(y<rangeStart) setRangeStart(y-2); if(y>rangeEnd) setRangeEnd(y+2); setShowJump(false); }}
                      style={{ padding:'3px 5px', background:'transparent', border:'1px solid var(--border-subtle)', borderRadius:3, color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:8, cursor:'pointer' }}>
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Range selector */}
          <div style={{ position:'relative' }}>
            <button className={`speed-btn ${showRange ? 'active' : ''}`}
              onClick={() => { setShowRange(p=>!p); setShowJump(false); }} title="Set timeline range">
              ⊟
            </button>
            {showRange && (
              <div style={{
                position:'absolute', bottom:'calc(100% + 6px)', right:0,
                background:'var(--bg-glass)', border:'1px solid var(--border-active)',
                borderRadius:6, padding:'12px 14px', backdropFilter:'var(--panel-blur)',
                boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:300, width:280,
              }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:10 }}>
                  Timeline Range
                </div>

                {/* Preset grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:14 }}>
                  {RANGE_PRESETS.map(p => (
                    <button key={p.label}
                      onClick={() => { setRangeStart(p.start); setRangeEnd(p.end); setShowRange(false); }}
                      style={{
                        padding:'6px 8px', textAlign:'left',
                        background: rangeStart===p.start && rangeEnd===p.end ? 'rgba(0,201,177,0.14)' : 'rgba(0,0,0,0.18)',
                        border: `1px solid ${rangeStart===p.start && rangeEnd===p.end ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                        borderRadius:4, cursor:'pointer', transition:'all 0.1s',
                      }}>
                      <div style={{ fontFamily:'var(--font-body)', fontSize:11, fontWeight:600, color: rangeStart===p.start && rangeEnd===p.end ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{p.label}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-muted)', marginTop:1 }}>{p.start}–{p.end}</div>
                    </button>
                  ))}
                </div>

                {/* Dual-handle range slider */}
                <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:18 }}>
                  Custom Range
                </div>
                <DualRangeSlider
                  minYear={1960} maxYear={2100}
                  startYear={rangeStart} endYear={rangeEnd}
                  onStartChange={setRangeStart} onEndChange={setRangeEnd}
                />

                {/* Density map preview inside range panel */}
                <div style={{ marginTop:14, borderTop:'1px solid var(--border-subtle)', paddingTop:10 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
                    Mission Density
                  </div>
                  <DensityMap missions={missions} rangeStart={rangeStart} rangeEnd={rangeEnd} onJump={onDateChange}/>
                </div>

                <div style={{ marginTop:6, fontFamily:'var(--font-mono)', fontSize:7, color:'rgba(0,201,177,0.4)', letterSpacing:'0.08em', lineHeight:1.5 }}>
                  {rangeEnd - rangeStart} yr span · {missionMarkers.length} mission{missionMarkers.length !== 1 ? 's' : ''} visible
                </div>
              </div>
            )}
          </div>

          <button className="speed-btn" onClick={handleNow} title="Jump to today (NOW)">NOW</button>
        </div>
      </div>

      {/* ── Density strip (above track) ── */}
      {showDensity && missions.length > 0 && (
        <div style={{ marginBottom:3 }}>
          <DensityMap missions={missions} rangeStart={rangeStart} rangeEnd={rangeEnd} onJump={onDateChange}/>
        </div>
      )}

      {/* ── Track + play ── */}
      <div className="scrubber-controls">
        <button className="play-btn" onClick={handlePlayPause} title="Play/Pause (Space)">
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="scrubber-track-wrap" style={{ position:'relative' }}>
          <input
            type="range" className="scrubber-track"
            min="0" max="100" step="0.01"
            value={progressPercent.toFixed(2)}
            onChange={handleTrackChange}
            style={{ background:`linear-gradient(to right, var(--accent-primary) ${progressPercent}%, rgba(255,255,255,0.08) ${progressPercent}%)` }}
          />

          {/* Historical milestone markers — diamond shape below track */}
          {milestoneMarkers.map((m, i) => (
            <div key={i}
              onMouseEnter={(e) => { setHoveredMark({ ...m, isMilestone:true }); setMarkTipPos({ x:e.clientX, y:e.clientY }); }}
              onMouseMove={(e)  => setMarkTipPos({ x:e.clientX, y:e.clientY })}
              onMouseLeave={()  => setHoveredMark(null)}
              onClick={() => onDateChange(new Date(m.ms))}
              style={{
                position:'absolute', left:`${m.pct}%`, top:'50%',
                transform:'translate(-50%, 8px) rotate(45deg)',
                width:6, height:6,
                background: m.color,
                border:'1px solid rgba(0,4,12,0.6)',
                cursor:'pointer', zIndex:1, opacity:0.75,
              }}
            />
          ))}

          {/* Mission dot markers */}
          {missionMarkers.map(m => (
            <div key={m.id}
              onMouseEnter={(e) => { setHoveredMark(m); setMarkTipPos({ x:e.clientX, y:e.clientY }); }}
              onMouseMove={(e)  => setMarkTipPos({ x:e.clientX, y:e.clientY })}
              onMouseLeave={()  => setHoveredMark(null)}
              onClick={() => onDateChange(new Date(m.ms))}
              style={{
                position:'absolute', left:`${m.pct}%`, top:'50%',
                transform:'translate(-50%, -50%)',
                width: m.status==='active' ? 8 : 6,
                height: m.status==='active' ? 8 : 6,
                borderRadius:'50%',
                background: m.color,
                boxShadow:`0 0 ${m.status==='active' ? 6 : 3}px ${m.color}`,
                cursor:'pointer', zIndex:2,
                border:'1.5px solid rgba(0,4,12,0.8)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Year ticks ── */}
      <div style={{ position:'relative', height:14, marginTop:3 }}>
        {yearTicks.map(({ y, pct }) => (
          <div key={y} onClick={() => onDateChange(new Date(y,0,1))}
            style={{
              position:'absolute', left:`${pct}%`, top:0,
              transform:'translateX(-50%)',
              fontFamily:'var(--font-mono)', fontSize:7,
              color: y === new Date().getFullYear() ? 'var(--isro-teal)' : 'var(--text-muted)',
              cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
            }}
            title={`Jump to ${y}`}
          >{y}</div>
        ))}
        {/* Today marker */}
        {(() => {
          const nowPct = ((Date.now() - MIN_MS) / RANGE_MS) * 100;
          if (nowPct < 0 || nowPct > 100) return null;
          return (
            <div style={{ position:'absolute', left:`${nowPct}%`, top:0, width:1, height:5, background:'var(--isro-teal)', transform:'translateX(-50%)', opacity:0.6 }}/>
          );
        })()}
      </div>

      {/* ── Auto-expand hint ── */}
      {nearEdge && (
        <div style={{
          marginTop:4, textAlign:'center', fontFamily:'var(--font-mono)', fontSize:7,
          color:'rgba(0,201,177,0.5)', letterSpacing:'0.1em',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          Near range edge —
          <button
            onClick={() => { setRangeStart(Math.max(1960, rangeStart-5)); setRangeEnd(Math.min(2100, rangeEnd+5)); }}
            style={{ background:'transparent', border:'none', color:'var(--accent-primary)', fontFamily:'var(--font-mono)', fontSize:7, cursor:'pointer', letterSpacing:'0.1em', textDecoration:'underline', padding:0 }}
          >
            extend range ±5 years
          </button>
        </div>
      )}

      {/* ── Keyboard hint ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:3 }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:6, color:'rgba(255,255,255,0.12)', letterSpacing:'0.1em' }}>
          Space · ←→ step · [ ] speed · Home/End
        </span>
      </div>

      {/* ── Marker tooltip ── */}
      {hoveredMark && (
        <div style={{
          position:'fixed', left:markTipPos.x, top:markTipPos.y - 56,
          transform:'translateX(-50%)', pointerEvents:'none', zIndex:9999,
          background:'rgba(0,4,12,0.95)', border:`1px solid ${hoveredMark.color}55`,
          borderRadius:5, padding:'6px 10px', backdropFilter:'blur(12px)', whiteSpace:'nowrap',
        }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:700, color:hoveredMark.color, letterSpacing:'0.1em' }}>
            {hoveredMark.name || hoveredMark.label}
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', marginTop:2 }}>
            {hoveredMark.isMilestone
              ? `${hoveredMark.year} · ISRO History`
              : `${new Date(hoveredMark.launchDate).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'})} · ${hoveredMark.status}`
            }
          </div>
        </div>
      )}
    </div>
  );
}
