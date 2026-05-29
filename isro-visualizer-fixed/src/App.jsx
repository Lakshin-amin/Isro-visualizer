import { useState, useCallback, useEffect } from 'react';
import './index.css';
import SolarSystem from './components/SolarSystem';
import MissionPanel from './components/MissionPanel';
import MoonPanel from './components/MoonPanel';
import SpacecraftView from './components/SpacecraftView';
import TimeScrubber from './components/TimeScrubber';
import Sidebar from './components/Sidebar';
import HudHeader from './components/HudHeader';
import LoadingScreen from './components/LoadingScreen';
import ComparePanel from './components/ComparePanel';
import UpcomingPanel from './components/UpcomingPanel';
import AddMissionModal from './components/AddMissionModal';
import { CornerTelemetry, MissionLegend } from './components/TelemetryWidgets';
import { useMissions } from './hooks/useMissions';
import { getPlanetScenePos, getMissionScenePos, getMoonScenePos, registerMissions } from './utils/orbits';
import { sound } from './utils/sound';

export default function App() {
  const { missions, addMission, removeMission, isCustom } = useMissions();

  const [loaded,           setLoaded]      = useState(false);
  const [date,             setDate]        = useState(new Date());
  const [selectedMission,  setSelMission]  = useState(null);
  const [moonSelected,     setMoonSel]     = useState(false);
  const [spacecraftView,   setScView]      = useState(null);
  const [sidebarCollapsed, setSidebar]     = useState(false);
  const [showOrbits,       setShowOrbits]  = useState(true);
  const [orbitBrightness,  setOrbitBright] = useState(0.55);
  const [showConst,        setShowConst]   = useState(false);
  const [showLabels,       setShowLabels]  = useState(true);
  const [scaleMultiplier,  setScaleMult]   = useState(1.0);
  const [sizeMode,         setSizeMode]    = useState('artistic');
  const [sizeMultiplier,   setSizeMult]    = useState(1.0);
  const [cameraPreset,     setCameraPreset]= useState('overview');
  const [fov,              setFov]         = useState(48);
  const [soundEnabled,     setSoundEnabled]= useState(false);
  const [theme,            setTheme]       = useState('dark');
  const [flyTarget,        setFlyTarget]   = useState(null);
  const [compareMode,      setCompareMode] = useState(false);
  const [compareMissions,  setCompare]     = useState([null, null]);
  const [showCompare,      setShowCompare] = useState(false);
  const [showUpcoming,     setShowUpcoming] = useState(false);
  const [showAddModal,     setShowAddModal] = useState(false);

  // Keep the module-level mission registry in sync — avoids the window global
  // race condition where React batching could leave stale data in orbits.js.
  useEffect(() => {
    registerMissions(missions);
  }, [missions]);

  const handleMissionSelect = useCallback((mission) => {
    const isSame = selectedMission?.id === mission.id;
    if (isSame) { setSelMission(null); setScView(null); return; }
    setSelMission(mission);
    setMoonSel(false);
    sound.playFocus();
    const pos = getMissionScenePos(mission.id, date);
    setFlyTarget({ ...pos, zoom: 2.0 });
    setTimeout(() => setScView(mission), 1800);
  }, [selectedMission, date]);

  const handleMissionInspect = useCallback((mission) => {
    setScView(mission); sound.playLaunch();
  }, []);

  const handlePlanetClick = useCallback((planet) => {
    sound.playFocus(); setSelMission(null); setMoonSel(false);
    if (!planet || planet.id === 'sun') { setFlyTarget({ x:0,y:0,z:0,zoom:120 }); return; }
    const pos = getPlanetScenePos(planet.id, date);
    setFlyTarget({ ...pos, zoom:18 });
  }, [date]);

  const handleMoonClick = useCallback(() => {
    sound.playFocus(); setMoonSel(true); setSelMission(null);
    const pos = getMoonScenePos(date);
    setFlyTarget({ ...pos, zoom:3 });
  }, [date]);

  const handleFocusObject = useCallback((obj) => {
    sound.playPing();
    if (obj.id === 'moon') { handleMoonClick(); return; }
    if (obj.type === 'planet' || obj.type === 'star') { handlePlanetClick(obj); return; }
    const m = missions.find(m => m.id === obj.id);
    if (m) handleMissionSelect(m);
  }, [handlePlanetClick, handleMissionSelect, handleMoonClick, missions]);

  const handleAddCompare = useCallback((mission) => {
    setCompare(prev => {
      const existing = prev.findIndex(m => m?.id === mission.id);
      if (existing >= 0) { const n=[...prev]; n[existing]=null; return n; }
      const empty = prev.findIndex(m => !m);
      if (empty < 0) return prev;
      const n=[...prev]; n[empty]=mission; return n;
    });
    setShowCompare(true); sound.playPing();
  }, []);

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabled; setSoundEnabled(next);
    if (next) { sound.init(); sound.setEnabled(true); } else sound.setEnabled(false);
  }, [soundEnabled]);

  const handleAddMission = useCallback((mission) => {
    addMission(mission);
    sound.playLaunch();
  }, [addMission]);

  const handleRemoveMission = useCallback((id) => {
    if (selectedMission?.id === id) { setSelMission(null); setScView(null); }
    removeMission(id);
  }, [selectedMission, removeMission]);

  return (
    <>
      {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}
      {spacecraftView && <SpacecraftView mission={spacecraftView} onClose={() => setScView(null)} />}
      {showAddModal && (
        <AddMissionModal
          onAdd={handleAddMission}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <div className={`app ${theme === 'light' ? 'theme-light' : ''}`}>
        <div className="scanlines" />
        <SolarSystem
          date={date}
          missions={missions}
          selectedMission={selectedMission}
          onMissionClick={handleMissionSelect}
          onPlanetClick={handlePlanetClick}
          onMoonClick={handleMoonClick}
          selectedMoon={moonSelected}
          flyTarget={flyTarget}
          onFlyDone={() => setFlyTarget(null)}
          showConstellation={showConst}
          orbitBrightness={showOrbits ? orbitBrightness : 0}
          showLabels={showLabels}
          scaleMultiplier={scaleMultiplier}
          sizeMode={sizeMode}
          sizeMultiplier={sizeMultiplier}
          cameraPreset={cameraPreset}
          fovOverride={fov}
        />
        <HudHeader
          showOrbits={showOrbits}        onToggleOrbits={() => setShowOrbits(p=>!p)}
          orbitBrightness={orbitBrightness} onOrbitBrightness={setOrbitBright}
          showConstellation={showConst}  onToggleConstellation={() => setShowConst(p=>!p)}
          soundEnabled={soundEnabled}    onToggleSound={handleToggleSound}
          theme={theme}                  onToggleTheme={() => setTheme(t => t==='dark'?'light':'dark')}
          onFocusObject={handleFocusObject}
          compareMode={compareMode}      onToggleCompare={() => { setCompareMode(p=>!p); if(!compareMode) setShowCompare(true); }}
          showUpcoming={showUpcoming}    onToggleUpcoming={() => setShowUpcoming(p=>!p)}
          onAddMission={() => setShowAddModal(true)}
          showLabels={showLabels}         onToggleLabels={() => setShowLabels(p=>!p)}
          scaleMultiplier={scaleMultiplier}  onScaleMultiplier={setScaleMult}
          sizeMode={sizeMode}               onSizeMode={setSizeMode}
          sizeMultiplier={sizeMultiplier}   onSizeMultiplier={setSizeMult}
          cameraPreset={cameraPreset}       onSetPreset={setCameraPreset}
          fov={fov}                         onSetFov={setFov}
        />
        <Sidebar
          missions={missions}
          selectedMission={selectedMission}
          onMissionSelect={handleMissionSelect}
          onMissionInspect={handleMissionInspect}
          onRemoveMission={handleRemoveMission}
          isCustom={isCustom}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebar(p=>!p)}
          compareMode={compareMode}
          compareMissions={compareMissions}
          onAddCompare={handleAddCompare}
          onAddMission={() => setShowAddModal(true)}
        />
        {selectedMission && !compareMode && (
          <MissionPanel
            mission={selectedMission}
            isCustom={isCustom(selectedMission.id)}
            onClose={() => setSelMission(null)}
            onInspect={() => handleMissionInspect(selectedMission)}
            onRemove={() => handleRemoveMission(selectedMission.id)}
          />
        )}
        {moonSelected && !selectedMission && (
          <MoonPanel date={date} onClose={() => setMoonSel(false)} />
        )}
        {showCompare && (
          <ComparePanel
            missions={compareMissions} theme={theme}
            onRemove={(idx) => setCompare(prev => { const n=[...prev]; n[idx]=null; return n; })}
            onClose={() => { setShowCompare(false); setCompareMode(false); setCompare([null,null]); }}
          />
        )}
        {showUpcoming && (
          <UpcomingPanel
            missions={missions}
            onClose={() => setShowUpcoming(false)}
            onSelect={(mission) => { handleMissionSelect(mission); setShowUpcoming(false); }}
          />
        )}
        <TimeScrubber date={date} onDateChange={setDate} />
        <MissionLegend />
        <CornerTelemetry date={date} />
      </div>
    </>
  );
}
