import { useState, useEffect } from 'react';


function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ launched: true });
      const d = Math.floor(diff / (1000*60*60*24));
      const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
      const m = Math.floor((diff % (1000*60*60)) / (1000*60));
      const s = Math.floor((diff % (1000*60)) / 1000);
      setTimeLeft({ d, h, m, s, launched: false });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function CountdownUnit({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 20, fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '0.05em',
        lineHeight: 1,
        minWidth: 36,
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 7, color: 'var(--text-muted)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginTop: 3,
      }}>{label}</div>
    </div>
  );
}

function CountdownSep() {
  return (
    <div style={{
      fontFamily: 'var(--font-display)',
      fontSize: 18, fontWeight: 700,
      color: 'var(--text-muted)',
      marginBottom: 12, alignSelf: 'flex-start', paddingTop: 2,
    }}>:</div>
  );
}

function MissionCountdown({ mission }) {
  const t = useCountdown(mission.launchDate);
  const statusColors = { upcoming: '#FF9933', active: '#00FF88', completed: '#00C9B1' };
  const col = statusColors[mission.status] || '#FF9933';

  return (
    <div style={{
      background: 'rgba(0,201,177,0.03)',
      border: `1px solid rgba(${hexToRgb(mission.color)},0.2)`,
      borderLeft: `3px solid ${mission.color}`,
      borderRadius: '0 6px 6px 0',
      padding: '12px 14px',
      marginBottom: 8,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: mission.color, boxShadow: `0 0 8px ${mission.color}` }}/>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
            {mission.name}
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: col, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '2px 6px', background: `rgba(${hexToRgb(col)},0.1)`,
          border: `1px solid rgba(${hexToRgb(col)},0.25)`,
          borderRadius: 3,
        }}>
          {mission.statusLabel}
        </div>
      </div>

      {/* Countdown */}
      {!t.launched ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <CountdownUnit value={t.d} label="Days"/>
          <CountdownSep/>
          <CountdownUnit value={t.h} label="Hrs"/>
          <CountdownSep/>
          <CountdownUnit value={t.m} label="Min"/>
          <CountdownSep/>
          <CountdownUnit value={t.s} label="Sec"/>
        </div>
      ) : (
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 11,
          color: '#00FF88', letterSpacing: '0.15em',
          marginBottom: 8,
        }}>
          ◆ LAUNCHED
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Launch</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 1 }}>
            {new Date(mission.launchDate).toLocaleDateString('en-IN', { year:'numeric', month:'short' })}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Vehicle</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 1 }}>
            {mission.vehicle}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Target</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 1 }}>
            {mission.orbit || mission.orbitTarget}
          </div>
        </div>
      </div>
    </div>
  );
}

// hex → "r,g,b" string for rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

export default function UpcomingPanel({ missions = [], onClose, onSelect }) {
  const upcoming = missions.filter(m => m.status === 'upcoming')
    .sort((a,b) => new Date(a.launchDate) - new Date(b.launchDate));

  return (
    <div style={{
      position: 'absolute',
      right: 20, top: 74,
      width: 340, zIndex: 100,
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      backdropFilter: 'var(--panel-blur)',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    }}>
      {/* Glow bar */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #FF9933, #A78BFA, #60A5FA)' }}/>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Upcoming Missions
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 2 }}>
            {upcoming.length} missions scheduled
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: '1px solid var(--border-subtle)',
          borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer',
          width: 26, height: 26, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* Mission list */}
      <div style={{ padding: '12px 14px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {upcoming.map(m => (
          <div
            key={m.id}
            onClick={() => onSelect(m)}
            style={{ cursor: 'pointer' }}
          >
            <MissionCountdown mission={m}/>
          </div>
        ))}

        {/* Timeline bar */}
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 5 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Launch Timeline
          </div>
          <div style={{ position: 'relative', height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            {upcoming.map(m => {
              const MIN = new Date('2025-01-01').getTime();
              const MAX = new Date('2029-01-01').getTime();
              const pct = Math.max(0, Math.min(100, ((new Date(m.launchDate) - MIN) / (MAX - MIN)) * 100));
              return (
                <div key={m.id} style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: m.color,
                  boxShadow: `0 0 6px ${m.color}`,
                  cursor: 'pointer',
                }}
                  title={`${m.name} — ${new Date(m.launchDate).getFullYear()}`}
                  onClick={() => onSelect(m)}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {['2025','2026','2027','2028','2029'].map(y => (
              <span key={y} style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)' }}>{y}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
