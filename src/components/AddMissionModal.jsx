import { useState, useId } from 'react';

const ORBIT_TARGETS = [
  { value: 'earth', label: 'Earth' },
  { value: 'moon',  label: 'Moon' },
  { value: 'mars',  label: 'Mars' },
  { value: 'venus', label: 'Venus' },
  { value: 'sun',   label: 'Sun / L1' },
];

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active',    color: '#00FF88' },
  { value: 'completed', label: 'Completed', color: '#00C9B1' },
  { value: 'upcoming',  label: 'Upcoming',  color: '#FF9933' },
];

const PALETTE = [
  '#FF4444','#FF9933','#FFD700','#00FF88','#00C9B1',
  '#4B9CD3','#A78BFA','#F472B6','#60A5FA','#34D399',
  '#FB923C','#E879F9','#F87171','#38BDF8','#4ADE80',
];

const VEHICLES = [
  'PSLV-C','GSLV Mk II','GSLV Mk III / LVM3','PSLV-XL','H3 (JAXA)',
  'Falcon 9','Ariane 6','Other',
];

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 8,
        color: error ? 'var(--isro-red)' : 'var(--text-muted)',
        letterSpacing: '0.18em', textTransform: 'uppercase',
        marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {label}
        {required && <span style={{ color: 'var(--isro-saffron)' }}>*</span>}
        {error && <span style={{ color: 'var(--isro-red)', fontWeight: 600 }}>— {error}</span>}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)', fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

export default function AddMissionModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name:        '',
    shortName:   '',
    launchDate:  '',
    status:      'upcoming',
    orbitTarget: 'earth',
    vehicle:     'PSLV-XL',
    mass:        '',
    orbit:       '',
    description: '',
    color:       '#00C9B1',
    achievement1: '',
    achievement2: '',
    achievement3: '',
    achievement4: '',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())       e.name       = 'required';
    if (!form.launchDate)        e.launchDate = 'required';
    if (!form.description.trim()) e.description = 'required';
    if (!form.achievement1.trim()) e.achievement1 = 'at least one';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitted(true);

    const achievements = [
      form.achievement1, form.achievement2,
      form.achievement3, form.achievement4,
    ].filter(Boolean);

    const id = form.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      + '_' + Date.now().toString(36);

    const mission = {
      id,
      name:        form.name.trim(),
      shortName:   form.shortName.trim() || form.name.slice(0, 6).toUpperCase(),
      launchDate:  form.launchDate,
      status:      form.status,
      statusLabel: STATUS_OPTIONS.find(s => s.value === form.status)?.label || form.status,
      orbitTarget: form.orbitTarget,
      vehicle:     form.vehicle,
      launchSite:  'Satish Dhawan Space Centre',
      mass:        form.mass || 'Unknown',
      orbit:       form.orbit || form.orbitTarget.charAt(0).toUpperCase() + form.orbitTarget.slice(1) + ' orbit',
      description: form.description.trim(),
      achievements,
      color:       form.color,
      glowColor:   form.color,
      angle:       Math.random() * 360,
      durationLabel: '',
    };

    setTimeout(() => { onAdd(mission); onClose(); }, 600);
  };

  const statusColor = STATUS_OPTIONS.find(s => s.value === form.status)?.color || '#00C9B1';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,2,8,0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 680, maxHeight: '90vh',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
      }}>
        {/* Accent bar */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${form.color}, transparent)` }}/>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Add Mission
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.15em', marginTop: 2 }}>
              Custom mission will appear in the solar system and sidebar
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border-subtle)',
            borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer',
            width: 28, height: 28, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Body — two columns */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>

          {/* ── Left column ── */}
          <div>
            <Field label="Mission Name" required error={errors.name}>
              <input
                style={{ ...inputStyle, borderColor: errors.name ? 'var(--isro-red)' : undefined }}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Mangalyaan-2"
                maxLength={40}
              />
            </Field>

            <Field label="Short Code">
              <input
                style={inputStyle}
                value={form.shortName}
                onChange={e => set('shortName', e.target.value)}
                placeholder="e.g. MOM-2 (auto if empty)"
                maxLength={8}
              />
            </Field>

            <Field label="Launch Date" required error={errors.launchDate}>
              <input
                type="date"
                style={{ ...inputStyle, colorScheme: 'dark', borderColor: errors.launchDate ? 'var(--isro-red)' : undefined }}
                value={form.launchDate}
                onChange={e => set('launchDate', e.target.value)}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Status">
                <select style={selectStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Target Body">
                <select style={selectStyle} value={form.orbitTarget} onChange={e => set('orbitTarget', e.target.value)}>
                  {ORBIT_TARGETS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Launch Vehicle">
              <select style={selectStyle} value={form.vehicle} onChange={e => set('vehicle', e.target.value)}>
                {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Mass">
                <input style={inputStyle} value={form.mass} onChange={e => set('mass', e.target.value)} placeholder="e.g. 1,500 kg"/>
              </Field>
              <Field label="Orbit">
                <input style={inputStyle} value={form.orbit} onChange={e => set('orbit', e.target.value)} placeholder="e.g. LEO 400 km"/>
              </Field>
            </div>

            {/* Color picker */}
            <Field label="Mission Color">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {PALETTE.map(col => (
                  <div
                    key={col}
                    onClick={() => set('color', col)}
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: col, cursor: 'pointer',
                      border: form.color === col
                        ? '2px solid white'
                        : '2px solid transparent',
                      boxShadow: form.color === col ? `0 0 8px ${col}` : 'none',
                      transition: 'all 0.1s',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => set('color', e.target.value)}
                  style={{ width: 20, height: 20, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                  title="Custom color"
                />
              </div>
            </Field>
          </div>

          {/* ── Right column ── */}
          <div>
            <Field label="Description" required error={errors.description}>
              <textarea
                style={{ ...inputStyle, height: 80, resize: 'vertical', borderColor: errors.description ? 'var(--isro-red)' : undefined }}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe the mission's goals and significance..."
                maxLength={400}
              />
            </Field>

            <Field label="Key Achievements" required error={errors.achievement1}>
              {[1,2,3,4].map(n => (
                <input
                  key={n}
                  style={{ ...inputStyle, marginBottom: 5, borderColor: n === 1 && errors.achievement1 ? 'var(--isro-red)' : undefined }}
                  value={form[`achievement${n}`]}
                  onChange={e => set(`achievement${n}`, e.target.value)}
                  placeholder={n === 1 ? 'Achievement 1 (required)' : `Achievement ${n} (optional)`}
                  maxLength={80}
                />
              ))}
            </Field>

            {/* Live preview card */}
            <div style={{
              marginTop: 8,
              background: 'rgba(0,0,0,0.25)',
              border: `1px solid rgba(${hexToRgb(form.color)},0.25)`,
              borderLeft: `3px solid ${form.color}`,
              borderRadius: '0 6px 6px 0',
              padding: '10px 12px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                Preview
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.color, boxShadow: `0 0 8px ${form.color}` }}/>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {form.name || 'Mission Name'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                  {form.launchDate ? new Date(form.launchDate).getFullYear() : 'YYYY'}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7,
                  color: statusColor, letterSpacing: '0.08em',
                  padding: '1px 5px',
                  background: `rgba(${hexToRgb(statusColor)},0.12)`,
                  border: `1px solid rgba(${hexToRgb(statusColor)},0.25)`,
                  borderRadius: 2, textTransform: 'uppercase',
                }}>
                  {form.status}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                  → {ORBIT_TARGETS.find(t => t.value === form.orbitTarget)?.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            Custom missions are saved to your browser storage
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitted}
              style={{
                padding: '7px 20px',
                background: submitted ? 'rgba(0,201,177,0.3)' : 'rgba(0,201,177,0.15)',
                border: '1px solid var(--border-active)',
                borderRadius: 4,
                color: submitted ? '#00FF88' : 'var(--accent-primary)',
                fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: submitted ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {submitted ? '✓ Added' : '+ Add Mission'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  try {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  } catch { return '0,201,177'; }
}
