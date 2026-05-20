import { useState } from 'react';
import { STATS } from '../data/missions';

const FILTERS = ['All', 'Active', 'Completed', 'Upcoming'];

export default function Sidebar({ missions, selectedMission, onMissionSelect, onMissionInspect, onRemoveMission, isCustom, collapsed, onToggle, compareMode, compareMissions, onAddCompare, onAddMission }) {
  const [filter, setFilter] = useState('All');

  const filtered = missions.filter(m => {
    if (filter === 'All') return true;
    return m.status === filter.toLowerCase();
  });

  return (
    <>
      <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            {compareMode ? 'Select 2 Missions to Compare' : 'ISRO Missions'}
          </div>
          <div className="sidebar-filter">
            {FILTERS.map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-list">
          {filtered.map(mission => {
            const inCompare = compareMissions?.some(m => m?.id === mission.id);
            return (
              <div
                key={mission.id}
                className={`mission-item ${selectedMission?.id === mission.id && !compareMode ? 'active' : ''} ${inCompare ? 'active' : ''}`}
                onClick={() => compareMode ? onAddCompare(mission) : onMissionSelect(mission)}
                style={{ opacity: compareMode && compareMissions?.filter(Boolean).length >= 2 && !inCompare ? 0.4 : 1 }}
              >
                <div className="mission-dot" style={{ background: mission.color, color: mission.color }}/>
                <div className="mission-info">
                  <div className="mission-name">{mission.name}</div>
                  <div className="mission-meta">
                    <span className="mission-date">{new Date(mission.launchDate).getFullYear()}</span>
                    <span className={`mission-status-badge status-${mission.status}`}>{mission.status}</span>
                    {inCompare && <span style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--isro-teal)', letterSpacing:'0.1em' }}>✓ SELECTED</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--border-subtle)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'var(--isro-teal)' }}>{s.value}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <button className={`sidebar-toggle ${collapsed ? 'collapsed' : ''}`} onClick={onToggle}>
        {collapsed ? '›' : '‹'}
      </button>
    </>
  );
}
