import { useState, useRef, useCallback, useEffect } from 'react';
import { PLANETS, MISSIONS } from '../data/missions';

const ALL_OBJECTS = [
  ...PLANETS.map(p => ({ id: p.id, name: p.name, type: 'planet', icon: '🪐', sub: p.diameter })),
  ...MISSIONS.map(m => ({ id: m.id, name: m.name, type: 'mission', icon: '🛸', sub: m.statusLabel, color: m.color })),
];

export default function SearchBar({ onFocus, theme }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [activeIdx, setActive] = useState(0);
  const inputRef = useRef();

  const search = useCallback((q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const lq = q.toLowerCase();
    const hits = ALL_OBJECTS.filter(o =>
      o.name.toLowerCase().includes(lq) || o.id.includes(lq)
    ).slice(0, 8);
    setResults(hits);
    setOpen(hits.length > 0);
    setActive(0);
  }, []);

  const select = useCallback((obj) => {
    onFocus(obj);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }, [onFocus]);

  const handleKey = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(i => Math.min(i+1, results.length-1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(i => Math.max(i-1, 0)); }
    if (e.key === 'Enter')      { if (results[activeIdx]) select(results[activeIdx]); }
    if (e.key === 'Escape')     { setOpen(false); setQuery(''); }
  };

  // Global / shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === '/' || e.key === 'f') && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement.tagName;
        if (tag !== 'INPUT') { e.preventDefault(); inputRef.current?.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: isDark ? 'rgba(4,20,40,0.75)' : 'rgba(240,248,255,0.85)',
        border: `1px solid ${open ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
        borderRadius: 5,
        backdropFilter: 'blur(16px)',
        transition: 'border-color 0.15s',
        width: 220,
      }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => search(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search planets, missions..."
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: isDark ? 'var(--text-primary)' : '#1a2a3a',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.08em', width: '100%',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: 'var(--text-muted)', letterSpacing: '0.1em',
          padding: '1px 4px', border: '1px solid var(--border-subtle)', borderRadius: 2,
          flexShrink: 0,
        }}>/</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: isDark ? 'rgba(2,8,16,0.97)' : 'rgba(240,248,255,0.97)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6, overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          zIndex: 300,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          {results.map((r, i) => (
            <div
              key={r.id}
              onMouseDown={() => select(r)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', cursor: 'pointer',
                background: i === activeIdx
                  ? 'rgba(0,201,177,0.12)'
                  : 'transparent',
                borderBottom: '1px solid rgba(0,201,177,0.06)',
                transition: 'background 0.1s',
              }}
            >
              {r.color
                ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                : <span style={{ fontSize: 11 }}>{r.icon}</span>
              }
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: isDark ? 'var(--text-primary)' : '#1a2a3a' }}>{r.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{r.type} · {r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
