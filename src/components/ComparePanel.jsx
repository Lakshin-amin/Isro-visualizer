import { MISSIONS } from '../data/missions';

const statusColors = { active: '#00FF88', completed: '#00C9B1', upcoming: '#FF9933' };

function MiniCard({ mission, onRemove }) {
  if (!mission) return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px dashed var(--border-subtle)', borderRadius: 6, padding: 20,
      color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9,
      letterSpacing: '0.15em', textTransform: 'uppercase',
    }}>
      Select a mission
    </div>
  );

  const color = statusColors[mission.status] || '#00C9B1';

  return (
    <div style={{
      flex: 1, background: 'rgba(0,201,177,0.04)',
      border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${mission.color}, transparent)` }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.08em', lineHeight: 1.3 }}>
            {mission.name}
          </div>
          <button onClick={onRemove} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 11, lineHeight: 1,
          }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '6px 0 10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {mission.statusLabel}
          </span>
        </div>

        {[
          ['Launch', new Date(mission.launchDate).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' })],
          ['Vehicle', mission.vehicle],
          ['Mass', mission.mass],
          ['Orbit', mission.orbit],
          ['Duration', mission.duration],
        ].map(([label, val]) => (
          <div key={label} style={{ marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginTop: 1 }}>{val}</div>
          </div>
        ))}

        <div style={{ marginTop: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 5 }}>Key Achievement</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {mission.achievements[0]}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePanel({ missions, onRemove, onClose, theme }) {
  const [m1, m2] = missions;

  return (
    <div style={{
      position: 'absolute', left: '50%', top: 76,
      transform: 'translateX(-50%)',
      width: 620, zIndex: 150,
      background: theme === 'dark' ? 'rgba(2,8,20,0.95)' : 'rgba(240,248,255,0.95)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8, backdropFilter: 'blur(20px)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      overflow: 'hidden',
    }}>
      <div style={{ height: 2, background: 'linear-gradient(90deg, var(--isro-saffron), var(--isro-teal))' }} />
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Mission Comparison
        </span>
        <button onClick={onClose} style={{
          background: 'transparent', border: '1px solid var(--border-subtle)',
          borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer',
          width: 24, height: 24, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ padding: 14, display: 'flex', gap: 10 }}>
        <MiniCard mission={m1} onRemove={() => onRemove(0)} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--isro-teal)', letterSpacing: '0.2em' }}>VS</div>
        </div>
        <MiniCard mission={m2} onRemove={() => onRemove(1)} />
      </div>

      {m1 && m2 && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Timeline</div>
          <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            {[m1, m2].map((m, i) => {
              const MIN = new Date('2008-01-01').getTime();
              const MAX = new Date('2028-01-01').getTime();
              const pct = ((new Date(m.launchDate).getTime() - MIN) / (MAX - MIN)) * 100;
              return (
                <div key={m.id} style={{
                  position: 'absolute', top: '50%', left: `${pct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: m.color,
                  boxShadow: `0 0 8px ${m.color}`,
                  zIndex: 2,
                }}>
                  <div style={{
                    position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                    fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', whiteSpace: 'nowrap',
                  }}>
                    {new Date(m.launchDate).getFullYear()}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.1em' }}>
            {Math.abs(new Date(m1.launchDate) - new Date(m2.launchDate)) / (1000*3600*24*365.25) | 0} years apart
          </div>
        </div>
      )}
    </div>
  );
}
