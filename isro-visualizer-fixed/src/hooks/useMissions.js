import { useState, useCallback } from 'react';
import { MISSIONS as BASE_MISSIONS } from '../data/missions';

const STORAGE_KEY = 'isro_custom_missions';

function loadCustom() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustom(missions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(missions)); } catch {}
}

export function useMissions() {
  const [custom, setCustom] = useState(() => loadCustom());

  const missions = [...BASE_MISSIONS, ...custom];

  const addMission = useCallback((mission) => {
    setCustom(prev => {
      const next = [...prev, { ...mission, _custom: true }];
      saveCustom(next);
      return next;
    });
  }, []);

  const removeMission = useCallback((id) => {
    setCustom(prev => {
      const next = prev.filter(m => m.id !== id);
      saveCustom(next);
      return next;
    });
  }, []);

  const isCustom = useCallback((id) => custom.some(m => m.id === id), [custom]);

  return { missions, custom, addMission, removeMission, isCustom };
}
