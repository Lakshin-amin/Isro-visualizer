export default function MissionPanel({ mission, onClose, onInspect, isCustom, onRemove }) {
  if (!mission) return null;

  const statusColors = {
    active: '#00FF88',
    completed: '#00C9B1',
    upcoming: '#FF9933',
  };

  const color = statusColors[mission.status] || '#00C9B1';

  return (
    <div className={`mission-panel ${!mission ? 'hidden' : ''}`}>
      {/* Colored top bar */}
      <div
        className="panel-glow-bar"
        style={{ background: `linear-gradient(90deg, ${mission.color}, transparent)` }}
      />

      <div className="panel-header">
        <div className="panel-mission-name">{mission.name}</div>
        <div style={{ display:'flex', gap:6 }}>
          {isCustom && onRemove && (
            <button onClick={onRemove} style={{
              padding:'4px 8px', background:'rgba(255,68,68,0.1)',
              border:'1px solid rgba(255,68,68,0.3)', borderRadius:4,
              color:'var(--isro-red)', fontFamily:'var(--font-mono)',
              fontSize:9, letterSpacing:'0.1em', cursor:'pointer',
              textTransform:'uppercase',
            }}>
              Delete
            </button>
          )}
          {onInspect && (
            <button onClick={onInspect} style={{
              padding:'4px 10px', background:'rgba(0,201,177,0.12)',
              border:'1px solid rgba(0,201,177,0.4)', borderRadius:4,
              color:'var(--isro-teal)', fontFamily:'var(--font-mono)',
              fontSize:9, letterSpacing:'0.1em', cursor:'pointer',
              textTransform:'uppercase',
            }} title="Open 3D inspector">
              3D View
            </button>
          )}
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="panel-body">
        {/* Status */}
        <div className="panel-status-row">
          <div
            className="panel-status-dot"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="panel-status-text" style={{ color }}>
            {mission.statusLabel}
          </span>
        </div>

        {/* Vehicle */}
        <div className="panel-vehicle-row">
          <span className="vehicle-label">Launch Vehicle</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>·</span>
          <span className="vehicle-value">{mission.vehicle}</span>
        </div>

        {/* Description */}
        <p className="panel-desc">{mission.description}</p>

        {/* Specs grid */}
        <div className="panel-specs">
          <div className="spec-item">
            <div className="spec-label">Launch Date</div>
            <div className="spec-value">
              {new Date(mission.launchDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="spec-item">
            <div className="spec-label">Mass</div>
            <div className="spec-value">{mission.mass}</div>
          </div>
          <div className="spec-item">
            <div className="spec-label">Orbit</div>
            <div className="spec-value">{mission.orbit}</div>
          </div>
          <div className="spec-item">
            <div className="spec-label">Duration</div>
            <div className="spec-value">{mission.duration}</div>
          </div>
        </div>

        {/* Achievements */}
        <div className="panel-achievements">
          <div className="achievements-title">Key Achievements</div>
          {mission.achievements.map((a, i) => (
            <div key={i} className="achievement-item">
              <span className="achievement-icon">◆</span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
