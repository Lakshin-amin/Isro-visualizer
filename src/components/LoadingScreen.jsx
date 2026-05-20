import { useEffect, useState } from 'react';
import { preloadAllTextures } from '../utils/proceduralTextures';

const LINES = [
  'Initializing orbital mechanics...',
  'Generating planet surfaces...',
  'Computing normal maps...',
  'Loading mission telemetry...',
  'Calibrating solar coordinates...',
  'Systems online.',
];

export default function LoadingScreen({ onDone }) {
  const [line,     setLine]     = useState(0);
  const [texPct,   setTexPct]   = useState(0);
  const [texDone,  setTexDone]  = useState(false);

  useEffect(() => {
    // Generate all procedural textures during load — uses requestIdleCallback if available
    const run = () => {
      preloadAllTextures((pct) => setTexPct(pct));
      setTexDone(true);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 3000 });
    } else {
      setTimeout(run, 100);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLine(l => {
        if (l >= LINES.length - 1) { clearInterval(interval); return l; }
        return l + 1;
      });
    }, 400);

    const timer = setTimeout(() => {
      if (texDone) onDone();
      else {
        // Wait until textures finish
        const wait = setInterval(() => {
          if (texDone) { clearInterval(wait); onDone(); }
        }, 100);
      }
    }, 2600);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [onDone, texDone]);

  return (
    <div className="loading-screen">
      <div className="loading-logo">ISRO</div>
      <div className="loading-sub">Solar System Visualization</div>
      <div className="loading-bar-wrap">
        <div className="loading-bar" />
      </div>
      <div className="loading-text">{LINES[line]}</div>
      {texPct > 0 && texPct < 100 && (
        <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'rgba(0,201,177,0.4)', letterSpacing:'0.18em', marginTop:4 }}>
          textures {texPct}%
        </div>
      )}
    </div>
  );
}
