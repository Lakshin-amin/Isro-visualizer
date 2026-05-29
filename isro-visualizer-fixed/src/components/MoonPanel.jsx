import { useMemo } from 'react';
import { getMoonPhase, getMoonPhaseName, getMoonDistance } from '../utils/orbits';
import { ISRO_LUNAR_SITES } from './Moon';

const PHASE_ICONS = {
  'New Moon':        '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter':   '🌓',
  'Waxing Gibbous':  '🌔',
  'Full Moon':       '🌕',
  'Waning Gibbous':  '🌖',
  'Last Quarter':    '🌗',
  'Waning Crescent': '🌘',
};

export default function MoonPanel({ date, onClose }) {
  const phase     = useMemo(() => getMoonPhase(date), [date]);
  const phaseName = useMemo(() => getMoonPhaseName(phase), [phase]);
  const distKm    = useMemo(() => Math.round(getMoonDistance(date)).toLocaleString('en-IN'), [date]);
  const phaseIcon = PHASE_ICONS[phaseName] || '🌙';
  const phasePct  = Math.round(
    phase < 0.5 ? phase * 200 : (1 - phase) * 200
  ); // illumination %

  return (
    <div className="mission-panel" style={{ top: 74 }}>
      <div className="panel-glow-bar" style={{ background: 'linear-gradient(90deg, #888888, transparent)' }} />

      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{phaseIcon}</span>
          <div className="panel-mission-name">The Moon</div>
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="panel-body">
        {/* Live phase */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6, padding: '12px 14px', marginBottom: 14,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
            Current Phase
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {phaseName}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: phase > 0.4 && phase < 0.6 ? '#FFD700' : 'var(--isro-teal)',
              letterSpacing: '0.1em',
            }}>
              {phasePct}% lit
            </div>
          </div>
          {/* Phase bar */}
          <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${phasePct}%`, background: 'linear-gradient(90deg, #888, #FFD700)', borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Specs */}
        <div className="panel-specs">
          <div className="spec-item">
            <div className="spec-label">Distance</div>
            <div className="spec-value">{distKm} km</div>
          </div>
          <div className="spec-item">
            <div className="spec-label">Diameter</div>
            <div className="spec-value">3,474 km</div>
          </div>
          <div className="spec-item">
            <div className="spec-label">Orbital Period</div>
            <div className="spec-value">27.32 days</div>
          </div>
          <div className="spec-item">
            <div className="spec-label">Inclination</div>
            <div className="spec-value">5.145°</div>
          </div>
        </div>

        {/* ISRO landing sites */}
        <div className="panel-achievements">
          <div className="achievements-title">Lunar Surface Missions</div>

          {ISRO_LUNAR_SITES.map(site => (
            <div key={site.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid rgba(0,201,177,0.07)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: site.color,
                boxShadow: `0 0 6px ${site.color}`,
                flexShrink: 0, marginTop: 3,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {site.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
                    {site.year}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
                  {site.desc}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginTop: 3 }}>
                  {site.lat.toFixed(2)}° {site.lat >= 0 ? 'N' : 'S'}, {site.lon.toFixed(2)}° {site.lon >= 0 ? 'E' : 'W'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fun fact */}
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'rgba(255,153,51,0.06)',
          border: '1px solid rgba(255,153,51,0.2)',
          borderRadius: 5,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--isro-saffron)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
            India's Lunar Achievement
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Chandrayaan-3 made India the 1st nation to soft-land near the lunar south pole, and only the 4th country to achieve a controlled lunar landing.
          </div>
        </div>
      </div>
    </div>
  );
}
