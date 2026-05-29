# 🚀 ISRO Solar System Visualizer

An interactive 3D visualization of ISRO missions in the Solar System — inspired by NASA's Eyes on the Solar System, built for India's space programme.

## ✨ Features

- **3D Solar System** — All 8 planets with accurate orbital mechanics, asteroid belt, Saturn's rings
- **ISRO Mission Markers** — Chandrayaan 1/2/3, Mangalyaan, Aditya-L1, SpaDeX, Gaganyaan
- **Mission Info Panels** — Click any spacecraft to see full mission details, achievements, specs
- **Time Scrubber** — Rewind/fast-forward through 2008–2028, watch missions launch in real time
- **Professional HUD** — Mission telemetry, live FPS, status indicators, ISRO stat counters
- **Sidebar** — Filter missions by status (Active / Completed / Upcoming)
- **Cyberpunk Space Aesthetic** — Orbitron font, teal/saffron/gold palette, scanline overlay

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| 3D Engine | Three.js via @react-three/fiber |
| Helpers | @react-three/drei (Stars, OrbitControls) |
| Framework | React 18 + Vite |
| Styling | Pure CSS with CSS variables |
| Fonts | Orbitron · Rajdhani · JetBrains Mono |
| Orbit Math | Keplerian elements (circular approximation) |

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 🎮 Controls

| Action | Control |
|---|---|
| Rotate | Left mouse drag |
| Zoom | Scroll wheel |
| Pan | Right mouse drag |
| Select mission | Click spacecraft / sidebar |
| Time travel | Bottom scrubber |
| Play/Pause | ▶ button |
| Speed | 1x / 10x / 100x / 1000x |

## 🛸 Missions Included

Chandrayaan-1 (2008) · Mangalyaan/MOM (2013) · Chandrayaan-2 (2019) · Chandrayaan-3 (2023) · Aditya-L1 (2023) · SpaDeX (2024) · Gaganyaan (2027)

## 🔭 v2 Roadmap

- Real ephemeris data from NASA HORIZONS API
- IRNSS / GSAT satellite constellation view
- Mission transfer orbit trajectories
- Mobile touch controls
- Sound design

---

Built for India's space journey · Data from isro.gov.in
