/**
 * Planet texture URLs — using NASA/Solar System Scope public CDN textures
 * These are loaded at runtime via Three.js TextureLoader
 */

export const PLANET_TEXTURES = {
  sun:     'https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
  mercury: 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg',
  venus:   'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg',
  earth:   'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
  earthNight: 'https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg',
  earthClouds:'https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg',
  mars:    'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
  jupiter: 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg',
  saturn:  'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg',
  uranus:  'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
  neptune: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
  moon:    'https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
  moonNormal: 'https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
};

// Fallback colors if textures fail to load
export const PLANET_FALLBACK_COLORS = {
  sun:     '#FDB813',
  mercury: '#B5B5B5',
  venus:   '#E8C07D',
  earth:   '#4B9CD3',
  mars:    '#C1440E',
  jupiter: '#C88B3A',
  saturn:  '#E4D191',
  uranus:  '#7DE8E8',
  neptune: '#3F54BA',
};
