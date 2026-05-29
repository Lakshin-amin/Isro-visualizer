import { useState, useEffect } from 'react';
import { MISSIONS } from '../data/missions';
import { formatDate } from '../utils/orbits';

export function CornerTelemetry({ date }) {
  const [fps, setFps] = useState(60);
  const activeMissions = MISSIONS.filter(m => m.status === 'active').length;

  useEffect(() => {
    let last = performance.now();
    let frames = 0;
    let id;
    const loop = (now) => {
      frames++;
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="corner-deco">
      <div className="telemetry-item">
        <span className="telemetry-dot" />
        <span>LIVE</span>
        <span className="telemetry-value">{activeMissions} MISSIONS ACTIVE</span>
      </div>
      <div className="telemetry-item">
        <span>DATE</span>
        <span className="telemetry-value">{formatDate(date)}</span>
      </div>
      <div className="telemetry-item">
        <span>RENDER</span>
        <span className="telemetry-value">{fps} FPS</span>
      </div>
      <div className="telemetry-item">
        <span>SOURCE</span>
        <span className="telemetry-value">ISRO.GOV.IN</span>
      </div>
    </div>
  );
}

export function MissionLegend() {
  const statusMap = [
    { key: 'active', color: '#00FF88', label: 'Active Mission' },
    { key: 'completed', color: '#00C9B1', label: 'Completed' },
    { key: 'upcoming', color: '#FF9933', label: 'Upcoming' },
  ];

  return (
    <div className="legend">
      <div className="legend-title">Mission Status</div>
      {statusMap.map(s => (
        <div key={s.key} className="legend-item">
          <div className="legend-dot" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
          <span className="legend-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
