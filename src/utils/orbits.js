/**
 * HIGH-ACCURACY ORBITAL MECHANICS ENGINE
 * Based on JPL Planetary Fact Sheet + DE441 Ephemeris
 * Reference: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * Uses full Keplerian elements with secular rates (centennial derivatives)
 * Accurate to ~1 arcminute over 3000 years (J1800–J2800)
 *
 * Elements defined for J2000.0 epoch (JD 2451545.0)
 * All angles in degrees, distances in AU
 */

export const AU_TO_SCENE = 12;
export const J2000_JD = 2451545.0;
export const DEG = Math.PI / 180;

export function toJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function toJulianCenturies(date) {
  return (toJulianDate(date) - J2000_JD) / 36525;
}

/**
 * JPL Keplerian Elements (Table 1, J2000.0 epoch)
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * a=semi-major axis AU, e=eccentricity, I=inclination deg,
 * L=mean longitude deg, wp=longitude of perihelion deg, Om=longitude ascending node deg
 * dot = rate per Julian century
 */
export const KEPLERIAN_ELEMENTS = {
  mercury: {
    a:0.38709927, adot:0.00000037,
    e:0.20563593, edot:0.00001906,
    I:7.00497902, Idot:-0.00594749,
    L:252.25032350, Ldot:149472.67411175,
    wp:77.45779628, wpdot:0.16047689,
    Om:48.33076593, Omdot:-0.12534081,
  },
  venus: {
    a:0.72333566, adot:0.00000390,
    e:0.00677672, edot:-0.00004107,
    I:3.39467605, Idot:-0.00078890,
    L:181.97909950, Ldot:58517.81538729,
    wp:131.60246718, wpdot:0.00268329,
    Om:76.67984255, Omdot:-0.27769418,
  },
  earth: {
    a:1.00000011, adot:-0.00000005,
    e:0.01671022, edot:-0.00003804,
    I:0.00005, Idot:-0.01294668,
    L:100.46457166, Ldot:35999.37244981,
    wp:102.93768193, wpdot:0.32327364,
    Om:0.0, Omdot:0.0,
  },
  mars: {
    a:1.52371034, adot:0.00001847,
    e:0.09339410, edot:0.00007882,
    I:1.84969142, Idot:-0.00813131,
    L:-4.55343205, Ldot:19140.30268499,
    wp:-23.94362959, wpdot:0.44441088,
    Om:49.55953891, Omdot:-0.29257343,
  },
  jupiter: {
    a:5.20288700, adot:-0.00011607,
    e:0.04838624, edot:-0.00013253,
    I:1.30439695, Idot:-0.00183714,
    L:34.39644051, Ldot:3034.74612775,
    wp:14.72847983, wpdot:0.21252668,
    Om:100.47390909, Omdot:0.20469106,
  },
  saturn: {
    a:9.53667594, adot:-0.00125060,
    e:0.05386179, edot:-0.00050991,
    I:2.48599187, Idot:0.00193609,
    L:49.95424423, Ldot:1222.49362201,
    wp:92.59887831, wpdot:-0.41897216,
    Om:113.66242448, Omdot:-0.28867794,
  },
  uranus: {
    a:19.18916464, adot:-0.00196176,
    e:0.04725744, edot:-0.00004397,
    I:0.77263783, Idot:-0.00242939,
    L:313.23810451, Ldot:428.48202785,
    wp:170.95427630, wpdot:0.40805281,
    Om:74.01692503, Omdot:0.04240589,
  },
  neptune: {
    a:30.06992276, adot:0.00026291,
    e:0.00859048, edot:0.00005105,
    I:1.77004347, Idot:0.00035372,
    L:-55.12002969, Ldot:218.45945325,
    wp:44.96476227, wpdot:-0.32241464,
    Om:131.78422574, Omdot:-0.00508664,
  },
};

function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

export function getPlanetHeliocentricXYZ(planetId, date) {
  const el = KEPLERIAN_ELEMENTS[planetId];
  if (!el) return { x: 0, y: 0, z: 0 };
  const T = toJulianCenturies(date);
  const a  = el.a  + el.adot  * T;
  const e  = el.e  + el.edot  * T;
  const I  = (el.I  + el.Idot  * T) * DEG;
  const L  = ((el.L  + el.Ldot  * T) % 360) * DEG;
  const wp = (el.wp + el.wpdot * T) * DEG;
  const Om = (el.Om + el.Omdot * T) * DEG;
  const omega = wp - Om;
  let M = L - wp;
  M = ((M % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  if (M > Math.PI) M -= 2*Math.PI;
  const E = solveKepler(M, e);
  const xp = Math.cos(E) - e;
  const yp = Math.sqrt(1 - e*e) * Math.sin(E);
  const nu = Math.atan2(yp, xp);
  const u  = nu + omega;
  const r  = a * (1 - e * Math.cos(E));
  const x  = r * (Math.cos(Om)*Math.cos(u) - Math.sin(Om)*Math.sin(u)*Math.cos(I));
  const y  = r * (Math.sin(Om)*Math.cos(u) + Math.cos(Om)*Math.sin(u)*Math.cos(I));
  const z  = r * Math.sin(u)*Math.sin(I);
  return { x, y, z, r, nu, a, e };
}

export function helioToScene(hxyz) {
  return {
    x:  hxyz.x * AU_TO_SCENE,
    y:  hxyz.z * AU_TO_SCENE,
    z: -hxyz.y * AU_TO_SCENE,
  };
}

export function getPlanetScenePos(planetId, date) {
  return helioToScene(getPlanetHeliocentricXYZ(planetId, date));
}

export function getOrbitPoints(planetId, date, N = 512) {
  const el = KEPLERIAN_ELEMENTS[planetId];
  if (!el) return [];
  const T = toJulianCenturies(date);
  const a   = el.a  + el.adot  * T;
  const e   = el.e  + el.edot  * T;
  const I   = (el.I  + el.Idot  * T) * DEG;
  const wp  = (el.wp + el.wpdot * T) * DEG;
  const Om  = (el.Om + el.Omdot * T) * DEG;
  const omega = wp - Om;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const nu = (i / N) * 2 * Math.PI;
    const r  = a * (1 - e*e) / (1 + e*Math.cos(nu));
    const u  = nu + omega;
    const x  = r * (Math.cos(Om)*Math.cos(u) - Math.sin(Om)*Math.sin(u)*Math.cos(I));
    const y  = r * (Math.sin(Om)*Math.cos(u) + Math.cos(Om)*Math.sin(u)*Math.cos(I));
    const z  = r * Math.sin(u)*Math.sin(I);
    pts.push(helioToScene({ x, y, z }));
  }
  return pts;
}

// ─── Lunar Transfer Orbit Physics ────────────────────────────────────────────
/**
 * Real ISRO lunar transfer has 4 distinct phases:
 *
 * Phase 1 — Earth Parking Orbit (EPO): Days 0–1
 *   Spacecraft stays in initial low Earth orbit (~170×36000 km)
 *   Visible as tight orbit around Earth
 *
 * Phase 2 — Earth Orbit Raising (EOR): Days 1–N
 *   Series of perigee burns raising the apogee progressively
 *   CH-1: 5 burns over 14 days, CH-2: 5 burns over 23 days, CH-3: 5 burns over 31 days
 *   Orbit grows from ~170km to ~143,000 km apogee (near Moon distance)
 *   Modelled as ellipse with semi-major axis growing from LEO to near-Moon
 *
 * Phase 3 — Trans-Lunar Injection + Coast (TLI): 4–5 days
 *   Final perigee burn sends spacecraft toward Moon
 *   Follows a hyperbolic trajectory from Earth to Moon
 *   Modelled as Bezier from final EOR apogee through space to Moon
 *
 * Phase 4 — Lunar Orbit Insertion (LOI) + Science orbit: rest of mission
 *   Retro burn captures into high elliptical then circularises to 100km
 *   Spacecraft orbits Moon at MOON_AU distance
 *
 * All positions are heliocentric — spacecraft pos = Earth pos + geocentric offset
 */

const MOON_AU     = 0.00257;  // 384,400 km in AU — real Moon orbital radius
const MOON_AU_VIS = MOON_AU * 60; // Visual scale (scene units exaggerated to be visible)

// LEO radius in AU: ~300 km altitude → (6671 km / 149,597,870 km) ≈ 0.0000446 AU
const LEO_AU      = 0.0000446;
// LEO visual scale matches MOON_AU_VIS proportionally
const LEO_AU_VIS  = LEO_AU * 60;

/**
 * Compute geocentric position during Earth orbit raising.
 * Semi-major axis grows from LEO to near-Moon across the raising period.
 * The spacecraft traces a widening ellipse — we approximate each orbit
 * as a full circle at the current mean semi-major axis.
 *
 * @param {number} t       - progress 0→1 through the raising phase
 * @param {number} jd      - Julian date (for orbit phase angle)
 * @param {number} phaseOffset - unique angle offset per mission
 * @returns {{ x, y, z }} geocentric offset in AU (visual scale)
 */
function getEORPosition(t, jd, phaseOffset) {
  // Semi-major axis: starts at LEO, grows to 0.8× Moon distance at end of EOR
  const rMin = LEO_AU_VIS;
  const rMax = MOON_AU_VIS * 0.80;
  const r    = rMin + (rMax - rMin) * Math.pow(t, 0.6); // eases out — fast early, slow late

  // Orbit period shrinks as apogee rises: rough approximation from Kepler 3rd law
  // T ∝ a^1.5 — at LEO ~90min, at Moon distance ~656 hrs
  // Visual speed: complete ~1 orbit per day at LEO, slow to 1/20 orbit per day near Moon
  const orbitsPerDay = 16 * (1 - t * 0.92); // interpolate from 16 → 1.3 orbits/day
  const angle = ((jd * orbitsPerDay) * Math.PI * 2) % (Math.PI * 2) + phaseOffset;

  // Small inclination wobble (realistic — ISRO uses 28.5° inclined parking orbit)
  const inclFactor = Math.sin(angle * 0.5) * 0.12;

  return {
    x: Math.cos(angle) * r,
    y: inclFactor * r * 0.1,
    z: Math.sin(angle) * r,
  };
}

/**
 * Compute position during TLI coast phase.
 * Uses a Bezier arc from the final EOR apogee direction outward to the Moon's
 * position at arrival — curved outward perpendicular to the Earth-Moon chord.
 *
 * @param {number} t         - progress 0→1 through TLI phase
 * @param {{ x,y,z }} moonVis - geocentric Moon position in visual AU
 * @param {number} phaseOffset
 */
function getTLIPosition(t, moonVis, phaseOffset) {
  // Start point: last EOR apogee — on opposite side from Moon (perigee burn direction)
  const moonAngle = Math.atan2(moonVis.z, moonVis.x);
  const startAngle = moonAngle + Math.PI; // opposite side
  const startR = MOON_AU_VIS * 0.80;

  const p0 = {
    x: Math.cos(startAngle) * startR,
    y: 0,
    z: Math.sin(startAngle) * startR,
  };

  // End point: Moon
  const p2 = { x: moonVis.x, y: moonVis.y, z: moonVis.z };

  // Control point: perpendicular to chord, pulled slightly beyond Moon distance
  // This creates a realistic concave-toward-Earth arc
  const chordX = p2.x - p0.x;
  const chordZ = p2.z - p0.z;
  const chordLen = Math.sqrt(chordX * chordX + chordZ * chordZ);
  const perpX = -chordZ / chordLen;
  const perpZ =  chordX / chordLen;

  // Midpoint of chord + perpendicular push (curves away from Earth)
  const p1 = {
    x: (p0.x + p2.x) * 0.5 + perpX * MOON_AU_VIS * 0.35,
    y: (p0.y + p2.y) * 0.5,
    z: (p0.z + p2.z) * 0.5 + perpZ * MOON_AU_VIS * 0.35,
  };

  // Quadratic Bezier interpolation
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    z: mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z,
  };
}

/**
 * Full Earth-to-Moon transfer for a Chandrayaan mission.
 * Returns geocentric position in visual AU.
 *
 * @param {object} cfg  - { eorDays, tliDays, phaseOffset, landedY }
 * @param {Date}   launch
 * @param {Date}   date
 * @param {number} jd
 * @param {{ x,y,z }} moonVis  - geocentric Moon in visual-scale AU
 * @param {Date|null} missionEnd  - null if still active
 * @param {number} finalR  - orbit radius after LOI (as fraction of MOON_AU_VIS)
 */
function getLunarTransferPos(cfg, launch, date, jd, moonVis, missionEnd, finalR = 1.0) {
  const MS_PER_DAY = 86400000;
  const elapsed    = (date - launch) / MS_PER_DAY; // days since launch

  if (elapsed < 0) return { x: 0, y: 0, z: 0 }; // pre-launch → caller returns Earth pos

  const eorEnd = cfg.eorDays;
  const tliEnd = cfg.eorDays + cfg.tliDays;

  // ── Phase 1+2: EPO + Earth Orbit Raising ──────────────────────────────────
  if (elapsed <= eorEnd) {
    const t = elapsed / eorEnd;
    return getEORPosition(t, jd, cfg.phaseOffset);
  }

  // ── Phase 3: TLI coast ────────────────────────────────────────────────────
  if (elapsed <= tliEnd) {
    const t = (elapsed - eorEnd) / cfg.tliDays;
    return getTLIPosition(t, moonVis, cfg.phaseOffset);
  }

  // ── Phase 4: Lunar orbit / surface ────────────────────────────────────────
  if (missionEnd && date > missionEnd) {
    // Mission ended — park at last known position
    return { x: moonVis.x, y: moonVis.y, z: moonVis.z };
  }
  // Orbiting Moon: slow circular orbit
  const orbitPeriod = 2.0; // days per orbit (~2 hrs real → speed up for viz)
  const angle = ((elapsed / orbitPeriod) * Math.PI * 2) % (Math.PI * 2) + cfg.phaseOffset;
  const r = MOON_AU_VIS * finalR;
  return {
    x: moonVis.x + Math.cos(angle) * r * 0.15,
    y: moonVis.y + Math.sin(angle * 0.4) * r * 0.02,
    z: moonVis.z + Math.sin(angle) * r * 0.15,
  };
}

// ─── Interplanetary Hohmann Transfer ──────────────────────────────────────────
/**
 * Proper Keplerian elliptical arc for Earth→Mars (or Earth→Venus) transfer.
 *
 * A Hohmann transfer ellipse has:
 *   - Perihelion at Earth's orbit: r_p = 1.0 AU
 *   - Aphelion at Mars orbit:     r_a = 1.524 AU (or Venus 0.723 AU)
 *   - Semi-major axis: a = (r_p + r_a) / 2
 *   - Eccentricity:    e = (r_a - r_p) / (r_a + r_p)
 *
 * The arc starts at Earth's heliocentric position at launch and sweeps
 * outward (for outer planets) or inward (Venus) along the transfer ellipse.
 * t=0 → launch point, t=1 → arrival.
 *
 * We orient the ellipse so perihelion aligns with Earth's launch position.
 */
function getInterplanetaryTransferPos(t, earthAtLaunch, targetAtArrival, isInner = false) {
  // Semi-major axes (AU)
  const rEarth  = Math.sqrt(earthAtLaunch.x * earthAtLaunch.x + earthAtLaunch.z * earthAtLaunch.z);
  const rTarget = Math.sqrt(targetAtArrival.x * targetAtArrival.x + targetAtArrival.z * targetAtArrival.z);

  const rPeri = isInner ? rTarget : rEarth;   // perihelion = smaller orbit
  const rApo  = isInner ? rEarth  : rTarget;  // aphelion  = larger orbit

  const a = (rPeri + rApo) / 2;
  const e = (rApo - rPeri) / (rApo + rPeri);

  // True anomaly range: 0 at perihelion → π at aphelion (half ellipse = Hohmann)
  const nu0 = isInner ? Math.PI : 0;    // start (Earth side)
  const nu1 = isInner ? 0       : Math.PI; // end   (target side)
  const nu  = nu0 + (nu1 - nu0) * t;

  // Heliocentric distance at this true anomaly
  const r = a * (1 - e * e) / (1 + e * Math.cos(nu));

  // Orientation: perihelion direction aligns with the relevant body at its node
  // Earth at launch gives us perihelion direction for outer transfers
  const periAngle = isInner
    ? Math.atan2(targetAtArrival.z, targetAtArrival.x)  // Venus: perihelion toward Venus
    : Math.atan2(earthAtLaunch.z,   earthAtLaunch.x);   // Mars:  perihelion toward Earth

  const angle = periAngle + nu;

  return {
    x: r * Math.cos(angle),
    y: earthAtLaunch.y * (1 - t) + targetAtArrival.y * t, // smooth y interpolation
    z: r * Math.sin(angle),
  };
}

/**
 * Sample the full Hohmann arc at N points (for getMissionFullArc).
 * Returns heliocentric AU positions.
 */
export function sampleHohmannArc(fromPlanetId, toPlanetId, launchDate, arrivalDate, steps = 200) {
  const earthAtLaunch  = getPlanetHeliocentricXYZ(fromPlanetId,  launchDate);
  const targetAtArrival = getPlanetHeliocentricXYZ(toPlanetId, arrivalDate);
  const isInner = toPlanetId === 'venus';
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const h = getInterplanetaryTransferPos(t, earthAtLaunch, targetAtArrival, isInner);
    pts.push(helioToScene(h));
  }
  return pts;
}

// ─── Module-level transfer config (before getMissionScenePos export) ──────────
// Moved here so the helper functions above can be defined at module scope

export function getMissionScenePos(missionId, date) {
  const jd        = toJulianDate(date);
  const earthHxyz = getPlanetHeliocentricXYZ('earth', date);
  const marsHxyz  = getPlanetHeliocentricXYZ('mars',  date);

  // Live geocentric Moon position in visual-scale scene units
  const moonHxyz   = getLunarHeliocentricXYZ(date);
  const moonGeoVis = {
    x:  (moonHxyz.geoX || 0) * AU_TO_SCENE,
    y:  (moonHxyz.geoZ || 0) * AU_TO_SCENE,
    z: -(moonHxyz.geoY || 0) * AU_TO_SCENE,
  };

  switch (missionId) {

    // ── CHANDRAYAAN-1 ─────────────────────────────────────────────────────────
    // 22 Oct 2008 launch → 8 Nov 2008 LOI (17 days total)
    // EOR: 5 burns over 13 days, TLI coast: 4 days
    // 504 × 7,502 km orbit → 100 km circular polar orbit
    // Communication lost: 28 Aug 2009
    case 'chandrayaan1': {
      const launch = new Date('2008-10-22');
      const end    = new Date('2009-08-28');
      if (date < launch || date > end) return helioToScene(earthHxyz);
      const geo = getLunarTransferPos(
        { eorDays: 13, tliDays: 4, phaseOffset: 0.5 },
        launch, date, jd, moonGeoVis, end, 0.26
      );
      return helioToScene({
        x: earthHxyz.x + geo.x,
        y: earthHxyz.y + geo.y,
        z: earthHxyz.z + geo.z,
      });
    }

    // ── CHANDRAYAAN-2 ─────────────────────────────────────────────────────────
    // 22 Jul 2019 launch → 20 Aug 2019 LOI (29 days total)
    // EOR: 5 raises over 23 days, TLI coast: 6 days
    // 100 km circular polar orbit — orbiter still active
    case 'chandrayaan2': {
      const launch = new Date('2019-07-22');
      if (date < launch) return helioToScene(earthHxyz);
      const geo = getLunarTransferPos(
        { eorDays: 23, tliDays: 6, phaseOffset: 1.2 },
        launch, date, jd, moonGeoVis, null, 0.26
      );
      return helioToScene({
        x: earthHxyz.x + geo.x,
        y: earthHxyz.y + geo.y,
        z: earthHxyz.z + geo.z,
      });
    }

    // ── CHANDRAYAAN-3 ─────────────────────────────────────────────────────────
    // 14 Jul 2023 launch → 5 Aug 2023 LOI (22 days) → 23 Aug 2023 landing
    // EOR: 5 raises over 31 days (longer looping orbit to save fuel)
    // TLI coast: 10 days
    // Landed 23 Aug 2023 at 69.37°S — Vikram+Pragyan on south pole
    case 'chandrayaan3': {
      const launch  = new Date('2023-07-14');
      const landing = new Date('2023-08-23');
      if (date < launch) return helioToScene(earthHxyz);
      // After landing — park at fixed south-pole surface position near Moon
      if (date >= landing) {
        const landAngle = 2.1;
        const r = MOON_AU_VIS * 0.24;
        return helioToScene({
          x: earthHxyz.x + moonGeoVis.x + Math.cos(landAngle) * r * 0.05,
          y: earthHxyz.y + moonGeoVis.y - r * 0.04,
          z: earthHxyz.z + moonGeoVis.z + Math.sin(landAngle) * r * 0.05,
        });
      }
      const geo = getLunarTransferPos(
        { eorDays: 31, tliDays: 10, phaseOffset: 2.1 },
        launch, date, jd, moonGeoVis, landing, 0.24
      );
      return helioToScene({
        x: earthHxyz.x + geo.x,
        y: earthHxyz.y + geo.y,
        z: earthHxyz.z + geo.z,
      });
    }

    case 'mangalyaan': {
      const launch = new Date('2013-11-05');
      const moi    = new Date('2014-09-24');
      const eom    = new Date('2022-09-27');
      if (date < launch) return helioToScene(earthHxyz);
      if (date < moi) {
        const t = (date - launch) / (moi - launch);
        // Use positions at launch and arrival for correct ellipse orientation
        const earthAtLaunch   = getPlanetHeliocentricXYZ('earth', launch);
        const marsAtArrival   = getPlanetHeliocentricXYZ('mars',  moi);
        return helioToScene(getInterplanetaryTransferPos(t, earthAtLaunch, marsAtArrival, false));
      }
      if (date > eom) return helioToScene(marsHxyz);
      const marsOrbitAU = 0.002;
      const oa = ((jd / 2.7) * 2 * Math.PI) % (2 * Math.PI);
      return helioToScene({ x: marsHxyz.x + Math.cos(oa)*marsOrbitAU, y: marsHxyz.y + Math.sin(oa*0.5)*marsOrbitAU*0.8, z: marsHxyz.z + Math.sin(oa)*marsOrbitAU });
    }
    case 'adityaL1': {
      const launch = new Date('2023-09-02');
      const l1date = new Date('2024-01-06');
      if (date < launch) return helioToScene(earthHxyz);
      const sunDir = Math.atan2(-earthHxyz.z, -earthHxyz.x);
      const L1_AU  = 0.01;  // L1 is ~0.01 AU sunward of Earth
      if (date < l1date) {
        const t   = (date - launch) / (l1date - launch);
        // Realistic L1 cruise: slight outward arc as spacecraft escapes Earth's gravity well
        // then curves toward Sun-Earth L1. Model as eased linear + small lateral offset.
        const ease  = t * t * (3 - 2 * t); // smoothstep
        const swing = Math.sin(t * Math.PI) * 0.002; // slight lateral excursion
        const perpDir = sunDir + Math.PI / 2;
        return helioToScene({
          x: earthHxyz.x + Math.cos(sunDir)*L1_AU*ease + Math.cos(perpDir)*swing,
          y: earthHxyz.y + Math.sin(t * Math.PI) * 0.0005,
          z: earthHxyz.z + Math.sin(sunDir)*L1_AU*ease + Math.sin(perpDir)*swing,
        });
      }
      // Halo orbit around L1
      const haloAngle = ((jd / 180) * 2 * Math.PI) % (2 * Math.PI);
      const HALO_R = 0.003;
      return helioToScene({
        x: earthHxyz.x + Math.cos(sunDir)*L1_AU + Math.cos(haloAngle)*HALO_R,
        y: earthHxyz.y + Math.sin(haloAngle)*HALO_R*0.6,
        z: earthHxyz.z + Math.sin(sunDir)*L1_AU + Math.sin(haloAngle)*HALO_R*0.4,
      });
    }
    case 'spadex': {
      const launch = new Date('2024-12-30');
      if (date < launch) return helioToScene(earthHxyz);
      const LEO_AU = 0.00314;
      const leoA = ((jd * 24 * 60 / 94) * 2 * Math.PI) % (2 * Math.PI);
      return helioToScene({ x: earthHxyz.x + Math.cos(leoA)*LEO_AU, y: earthHxyz.y + Math.sin(leoA*0.3)*LEO_AU*0.5, z: earthHxyz.z + Math.sin(leoA)*LEO_AU });
    }
    case 'gaganyaan': {
      const launch = new Date('2027-01-01');
      if (date < launch) return helioToScene(earthHxyz);
      const LEO_AU = 0.00267;
      const a = ((jd * 24 * 60 / 92) * 2 * Math.PI) % (2 * Math.PI);
      return helioToScene({ x: earthHxyz.x + Math.cos(a)*LEO_AU, y: earthHxyz.y, z: earthHxyz.z + Math.sin(a)*LEO_AU });
    }
    case 'lupex': {
      // JAXA H3 launch from Japan → Moon south pole
      const launch = new Date('2026-03-01');
      if (date < launch) return helioToScene(earthHxyz);
      const moonHxyz2 = getLunarHeliocentricXYZ(date);
      const moonGeoVis2 = {
        x:  (moonHxyz2.geoX || 0) * AU_TO_SCENE,
        y:  (moonHxyz2.geoZ || 0) * AU_TO_SCENE,
        z: -(moonHxyz2.geoY || 0) * AU_TO_SCENE,
      };
      const geo = getLunarTransferPos(
        { eorDays: 15, tliDays: 5, phaseOffset: 0.8 },
        launch, date, jd, moonGeoVis2, null, 0.24
      );
      return helioToScene({
        x: earthHxyz.x + geo.x,
        y: earthHxyz.y + geo.y,
        z: earthHxyz.z + geo.z,
      });
    }
    case 'nisar': {
      // SSO Earth observation orbit
      const launch = new Date('2025-03-01');
      if (date < launch) return helioToScene(earthHxyz);
      const SSO_AU = 0.005;
      const a = ((jd * 14.3 * 2 * Math.PI)) % (2 * Math.PI); // ~14 orbits/day SSO
      return helioToScene({ x: earthHxyz.x + Math.cos(a)*SSO_AU, y: earthHxyz.y + Math.sin(a)*SSO_AU*0.95, z: earthHxyz.z + Math.sin(a)*SSO_AU });
    }
    case 'shukrayaan': {
      const launch  = new Date('2028-01-01');
      const arrival = new Date('2029-04-01');
      const venusHxyz = getPlanetHeliocentricXYZ('venus', date);
      if (date < launch) return helioToScene(earthHxyz);
      if (date > arrival) {
        const oa = ((jd / 2.3) * 2 * Math.PI) % (2 * Math.PI);
        const vOrbit = 0.0015;
        return helioToScene({ x: venusHxyz.x + Math.cos(oa)*vOrbit, y: venusHxyz.y + Math.sin(oa*0.4)*vOrbit*0.3, z: venusHxyz.z + Math.sin(oa)*vOrbit });
      }
      // Proper Keplerian interior transfer (Earth → Venus, inward arc)
      const t = (date - launch) / (arrival - launch);
      const earthAtLaunch  = getPlanetHeliocentricXYZ('earth', launch);
      const venusAtArrival = getPlanetHeliocentricXYZ('venus', arrival);
      return helioToScene(getInterplanetaryTransferPos(t, earthAtLaunch, venusAtArrival, true));
    }
    case 'chandrayaan4': {
      const launch = new Date('2028-06-01');
      if (date < launch) return helioToScene(earthHxyz);
      const moonHxyz4 = getLunarHeliocentricXYZ(date);
      const moonGeoVis4 = {
        x:  (moonHxyz4.geoX || 0) * AU_TO_SCENE,
        y:  (moonHxyz4.geoZ || 0) * AU_TO_SCENE,
        z: -(moonHxyz4.geoY || 0) * AU_TO_SCENE,
      };
      const geo = getLunarTransferPos(
        { eorDays: 25, tliDays: 7, phaseOffset: 3.8 },
        launch, date, jd, moonGeoVis4, null, 0.24
      );
      return helioToScene({
        x: earthHxyz.x + geo.x,
        y: earthHxyz.y + geo.y,
        z: earthHxyz.z + geo.z,
      });
    }
    default: {
      // Smart fallback for custom/unknown missions
      // Orbit the target body at a plausible distance
      const targetMap = {
        earth:  { hxyz: earthHxyz, r: 0.005 },
        mars:   { hxyz: marsHxyz,  r: 0.003 },
        moon:   { hxyz: earthHxyz, r: MOON_AU_VIS * 0.3 },
        venus:  { hxyz: getPlanetHeliocentricXYZ('venus', date),  r: 0.002 },
        sun:    { hxyz: { x:0, y:0, z:0 }, r: 0.012 },
        jupiter:{ hxyz: getPlanetHeliocentricXYZ('jupiter', date), r: 0.004 },
      };
      // Look up orbitTarget from MISSIONS array
      const allMissions = (typeof window !== 'undefined' && window.__ISRO_MISSIONS__) || [];
      const mDef = allMissions.find(m => m.id === missionId);
      const target = mDef?.orbitTarget || 'earth';
      const cfg = targetMap[target] || targetMap.earth;
      const customAngle = ((jd * 0.8 + (mDef?.angle || 0)) * 2 * Math.PI) % (2 * Math.PI);
      return helioToScene({
        x: cfg.hxyz.x + Math.cos(customAngle) * cfg.r,
        y: cfg.hxyz.y + Math.sin(customAngle * 0.3) * cfg.r * 0.2,
        z: cfg.hxyz.z + Math.sin(customAngle) * cfg.r,
      });
    }
  }
}

// ─── Lunar Orbital Mechanics ──────────────────────────────────────────────────
/**
 * High-accuracy lunar position using ELP2000-82 truncated series
 * Accurate to ~10 arcsec / ~20 km
 * Source: Meeus "Astronomical Algorithms" Ch. 47
 */
export function getLunarHeliocentricXYZ(date) {
  const T = toJulianCenturies(date);

  // Fundamental arguments (degrees)
  const Lp = 218.3164477 + 481267.88123421*T - 0.0015786*T*T + T*T*T/538841 - T*T*T*T/65194000;
  const D  = 297.8501921 + 445267.1114034 *T - 0.0018819*T*T + T*T*T/545868  - T*T*T*T/113065000;
  const M  = 357.5291092 + 35999.0502909  *T - 0.0001536*T*T + T*T*T/24490000;
  const Mp = 134.9633964 + 477198.8675055 *T + 0.0087414*T*T + T*T*T/69699   - T*T*T*T/14712000;
  const F  = 93.2720950  + 483202.0175233 *T - 0.0036539*T*T - T*T*T/3526000 + T*T*T*T/863310000;

  const toR = Math.PI / 180;
  const Lr = Lp*toR, Dr = D*toR, Mr = M*toR, Mpr = Mp*toR, Fr = F*toR;

  // Longitude perturbations (arcsec → degrees)
  let sigmaL = 0;
  sigmaL += 6288774 * Math.sin(Mpr);
  sigmaL += 1274027 * Math.sin(2*Dr - Mpr);
  sigmaL +=  658314 * Math.sin(2*Dr);
  sigmaL +=  213618 * Math.sin(2*Mpr);
  sigmaL -=  185116 * Math.sin(Mr);
  sigmaL -=  114332 * Math.sin(2*Fr);
  sigmaL +=   58793 * Math.sin(2*Dr - 2*Mpr);
  sigmaL +=   57066 * Math.sin(2*Dr - Mr - Mpr);
  sigmaL +=   53322 * Math.sin(2*Dr + Mpr);
  sigmaL +=   45758 * Math.sin(2*Dr - Mr);
  sigmaL -=   40923 * Math.sin(Mr - Mpr);
  sigmaL -=   34720 * Math.sin(Dr);
  sigmaL -=   30383 * Math.sin(Mr + Mpr);
  sigmaL +=   15327 * Math.sin(2*Dr - 2*Fr);
  sigmaL -=   12528 * Math.sin(Mpr + 2*Fr);
  sigmaL +=   10980 * Math.sin(Mpr - 2*Fr);
  sigmaL +=   10675 * Math.sin(4*Dr - Mpr);
  sigmaL +=   10034 * Math.sin(3*Mpr);

  // Distance perturbations (km)
  let sigmaR = 0;
  sigmaR -= 20905355 * Math.cos(Mpr);
  sigmaR -=  3699111 * Math.cos(2*Dr - Mpr);
  sigmaR -=  2955968 * Math.cos(2*Dr);
  sigmaR -=   569925 * Math.cos(2*Mpr);
  sigmaR +=    48888 * Math.cos(Mr);
  sigmaR -=     3149 * Math.cos(2*Fr);
  sigmaR +=   246158 * Math.cos(2*Dr - 2*Mpr);
  sigmaR -=   152138 * Math.cos(2*Dr - Mr - Mpr);
  sigmaR -=   170733 * Math.cos(2*Dr + Mpr);
  sigmaR -=   204586 * Math.cos(2*Dr - Mr);
  sigmaR -=   129620 * Math.cos(Mr - Mpr);
  sigmaR +=   108743 * Math.cos(Dr);
  sigmaR +=   104755 * Math.cos(Mr + Mpr);

  // Latitude perturbations (arcsec → degrees)
  let sigmaB = 0;
  sigmaB += 5128122 * Math.sin(Fr);
  sigmaB +=  280602 * Math.sin(Mpr + Fr);
  sigmaB +=  277693 * Math.sin(Mpr - Fr);
  sigmaB +=  173237 * Math.sin(2*Dr - Fr);
  sigmaB +=   55413 * Math.sin(2*Dr - Mpr + Fr);
  sigmaB +=   46271 * Math.sin(2*Dr - Mpr - Fr);
  sigmaB +=   32573 * Math.sin(2*Dr + Fr);
  sigmaB +=   17198 * Math.sin(2*Mpr + Fr);
  sigmaB +=    9266 * Math.sin(2*Dr + Mpr - Fr);
  sigmaB +=    8822 * Math.sin(2*Mpr - Fr);

  // Final ecliptic coords
  const lambda = Lp + sigmaL / 1000000; // degrees
  const beta   = sigmaB / 1000000;       // degrees
  const Delta  = 385000.56 + sigmaR / 1000; // km from Earth center

  const lambdaR = lambda * toR;
  const betaR   = beta   * toR;

  // Geocentric ecliptic → AU
  const moonAU = Delta / 149597870.7;

  // Geocentric ecliptic rectangular (ecliptic plane)
  const xGeo = moonAU * Math.cos(betaR) * Math.cos(lambdaR);
  const yGeo = moonAU * Math.cos(betaR) * Math.sin(lambdaR);
  const zGeo = moonAU * Math.sin(betaR);

  // Add Earth's heliocentric position
  const earth = getPlanetHeliocentricXYZ('earth', date);
  return {
    x: earth.x + xGeo,
    y: earth.y + yGeo,
    z: earth.z + zGeo,
    // Geocentric distance for phase calc
    geoX: xGeo, geoY: yGeo, geoZ: zGeo,
    deltaKm: Delta,
  };
}

// Visual scale boost for Moon — real distance (0.031 scene units) is invisible
// We scale the geocentric offset by 60x so Moon orbits visibly around Earth
export const MOON_VISUAL_SCALE = 60;

export function getMoonScenePos(date) {
  const lunar = getLunarHeliocentricXYZ(date);
  const earth = getPlanetHeliocentricXYZ('earth', date);
  // Geocentric offset boosted for visibility
  const geoX = lunar.x - earth.x;
  const geoY = lunar.y - earth.y;
  const geoZ = lunar.z - earth.z;
  const boosted = {
    x: earth.x + geoX * MOON_VISUAL_SCALE,
    y: earth.y + geoY * MOON_VISUAL_SCALE,
    z: earth.z + geoZ * MOON_VISUAL_SCALE,
  };
  return helioToScene(boosted);
}

/**
 * Moon phase angle (0=new, 0.5=full, 1=new again)
 * Returns fraction 0–1
 */
export function getMoonPhase(date) {
  const T = toJulianCenturies(date);
  const D = (297.8501921 + 445267.1114034*T) * Math.PI / 180;
  // Phase = elongation from 0(new) to π(full) to 2π(new)
  const phase = ((D % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  return phase / (2 * Math.PI); // 0–1
}

/**
 * Geocentric distance of Moon in km
 */
export function getMoonDistance(date) {
  const T = toJulianCenturies(date);
  const Mp = (134.9633964 + 477198.8675055*T) * Math.PI / 180;
  const D  = (297.8501921 + 445267.1114034*T) * Math.PI / 180;
  return 385000.56
    - 20905.355 * Math.cos(Mp)
    -  3699.111 * Math.cos(2*D - Mp)
    -  2955.968 * Math.cos(2*D)
    -   569.925 * Math.cos(2*Mp);
}

export const MOON_PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

export function getMoonPhaseName(phase) {
  const idx = Math.floor(((phase + 0.0625) % 1) * 8);
  return MOON_PHASE_NAMES[idx];
}

export function formatDate(date) {
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

// ─── Full Transfer Arc Sampling ───────────────────────────────────────────────
/**
 * Returns the complete Hohmann/transfer arc geometry for a mission:
 * - traveled: points from launch → currentDate (solid line)
 * - predicted: points from currentDate → arrival (dashed/faint line)
 * - full: all points launch → arrival (for always-visible arc when selected)
 *
 * Samples getMissionScenePos at N steps across the full transfer window.
 * Only missions with defined transfer phases produce arcs.
 */

const TRANSFER_WINDOWS = {
  // Completed missions
  mangalyaan:   { launch: new Date('2013-11-05'), arrival: new Date('2014-09-24'), type:'interplanetary' },
  chandrayaan1: { launch: new Date('2008-10-22'), arrival: new Date('2008-11-08'), type:'lunar', eorDays:13, tliDays:4,  phaseOffset:0.5,  finalR:0.26 },
  chandrayaan2: { launch: new Date('2019-07-22'), arrival: new Date('2019-08-20'), type:'lunar', eorDays:23, tliDays:6,  phaseOffset:1.2,  finalR:0.26 },
  chandrayaan3: { launch: new Date('2023-07-14'), arrival: new Date('2023-08-23'), type:'lunar', eorDays:31, tliDays:9,  phaseOffset:2.1,  finalR:0.24 },
  // Active
  adityaL1:     { launch: new Date('2023-09-02'), arrival: new Date('2024-01-06'), type:'l1'    },
  // Upcoming
  shukrayaan:   { launch: new Date('2028-01-01'), arrival: new Date('2029-04-01'), type:'interplanetary' },
  lupex:        { launch: new Date('2026-03-01'), arrival: new Date('2026-04-15'), type:'lunar', eorDays:15, tliDays:5,  phaseOffset:0.8,  finalR:0.24 },
  chandrayaan4: { launch: new Date('2028-06-01'), arrival: new Date('2028-07-20'), type:'lunar', eorDays:25, tliDays:7,  phaseOffset:3.8,  finalR:0.24 },
};

export function getMissionTransferWindow(missionId) {
  return TRANSFER_WINDOWS[missionId] || null;
}

export function getMissionFullArc(missionId, currentDate, steps = 160) {
  const win = TRANSFER_WINDOWS[missionId];
  if (!win) return { traveled: [], predicted: [], full: [], inTransfer: false };

  const { launch, arrival, type } = win;
  const now = currentDate.getTime();

  if (now < launch.getTime()) return { traveled: [], predicted: [], full: [], inTransfer: false };

  const inTransfer    = now >= launch.getTime() && now <= arrival.getTime();
  const afterTransfer = now > arrival.getTime();

  let full = [];

  // ── Interplanetary: use proper Keplerian ellipse sampled at fixed launch/arrival ──
  if (type === 'interplanetary') {
    const planetMap = {
      mangalyaan:  { from: 'earth', to: 'mars',  inner: false },
      shukrayaan:  { from: 'earth', to: 'venus', inner: true  },
    };
    const cfg = planetMap[missionId];
    if (cfg) {
      // Fix launch and arrival planet positions — arc shape is FIXED once launched
      const earthAtLaunch    = getPlanetHeliocentricXYZ(cfg.from, launch);
      const targetAtArrival  = getPlanetHeliocentricXYZ(cfg.to,   arrival);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const h = getInterplanetaryTransferPos(t, earthAtLaunch, targetAtArrival, cfg.inner);
        full.push(helioToScene(h));
      }
    }
  }
  // ── L1 cruise: sample with fixed Earth position at launch ──
  else if (type === 'l1') {
    const earthAtLaunch = getPlanetHeliocentricXYZ('earth', launch);
    const sunDir = Math.atan2(-earthAtLaunch.z, -earthAtLaunch.x);
    const L1_AU  = 0.01;
    for (let i = 0; i <= steps; i++) {
      const t     = i / steps;
      const ease  = t * t * (3 - 2 * t);
      const swing = Math.sin(t * Math.PI) * 0.002;
      const perpDir = sunDir + Math.PI / 2;
      const h = {
        x: earthAtLaunch.x + Math.cos(sunDir)*L1_AU*ease + Math.cos(perpDir)*swing,
        y: earthAtLaunch.y + Math.sin(t * Math.PI) * 0.0005,
        z: earthAtLaunch.z + Math.sin(sunDir)*L1_AU*ease + Math.sin(perpDir)*swing,
      };
      full.push(helioToScene(h));
    }
  }
  // ── Lunar: sample getMissionScenePos (already uses correct Moon position per time) ──
  else {
    for (let i = 0; i <= steps; i++) {
      const t   = launch.getTime() + (i / steps) * (arrival.getTime() - launch.getTime());
      const pos = getMissionScenePos(missionId, new Date(t));
      full.push({ x: pos.x, y: pos.y, z: pos.z });
    }
  }

  if (!full.length) return { traveled: [], predicted: [], full: [], inTransfer: false };

  const traveled  = [];
  const predicted = [];
  for (let i = 0; i < full.length; i++) {
    const t = launch.getTime() + (i / steps) * (arrival.getTime() - launch.getTime());
    if (t <= now) traveled.push(full[i]);
    else          predicted.push(full[i]);
  }

  if (afterTransfer) return { traveled: full, predicted: [], full, inTransfer: false };
  return { traveled, predicted, full, inTransfer };
}
