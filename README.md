# 🌌 Lumina Lens

> **Point. Discover. Explore the Universe.**

Lumina Lens is an open-source, AI-powered astronomy application that identifies visible stars, constellations, and celestial objects in the night sky using computer vision, real-time astronomical ephemerides, phone sensors, and augmented reality.

---

## 🚀 Project Status: Phase 1 (Foundation & Sky Prediction)

We are actively building **Phase 1: Foundation & Sky Prediction**.

- [x] **Step 1:** Git repository & project foundation
- [x] **Step 2:** React Native / Expo mobile application setup
- [x] **Step 3:** Metro development server configured
- [x] **Step 4:** Cross-platform web support enabled
- [x] **Step 5:** Astronomy Engine v1 (Skyfield, JPL ephemeris `de421.bsp`)
- [x] **Step 6:** Hipparcos catalog integration (~5,000 naked-eye stars)
- [x] **Step 7:** Mobile app connected to `/sky/visible` endpoint
- [x] **Step 8:** Star Identity & Metadata Layer (`/stars/{hip_id}` + `StarDetailModal`)
- [x] **Step 9:** Sensor Engine (Live device GPS location + Real-time Orientation HUD)
- [ ] **Step 10:** Debug Sky Visualization (2D celestial dome / radar map)
- [ ] **Step 11:** Astronomical Prediction Verification & Cross-check

---

## 🌟 Key Features Implemented

- 📍 **Live Device Geolocation:** Automatically requests GPS permissions via `expo-location` and calculates sky predictions for the user's exact latitude and longitude on Earth, with graceful fallback to default coordinates.
- 🧭 **Real-Time Orientation HUD:** Tracks device heading (azimuth 0°–360° via magnetometer) and tilt elevation (altitude 0°–90° via accelerometer) with angular smoothing filters, displaying live phone orientation and sky aim status.
- ⭐ **Real-Time Visible Star Prediction:** Vectorized ephemeris calculations via Skyfield and the Hipparcos catalog compute local topocentric coordinates (Altitude & Azimuth) for thousands of stars in milliseconds.
- 🔍 **Interactive Star Profiles:** Tapping any star in the visible star list opens the `StarDetailModal`, presenting detailed astrophysical metadata:
  - Common & scientific names (Bayer & Flamsteed designations)
  - Constellation membership
  - Apparent visual magnitude & spectral classification
  - Distance in light-years (calculated from trigonometric parallax)
  - Astrometric coordinates (Right Ascension, Declination, Proper Motion)
  - Scientific descriptions for prominent navigation stars
- 🔄 **Pull-to-Refresh:** Refreshes GPS coordinates and recalculates the dynamic sky as time moves forward.

---

## 🏗️ Architecture Overview

```text
               Phone Hardware Sensors
        (GPS, Magnetometer, Accelerometer)
                         │
                         ▼
                   Sensor Engine
            (app/src/engines/sensor/)
           ┌─────────────┴─────────────┐
           ▼                           ▼
     Live GPS Coords           Device Heading & Pitch
  (Latitude, Longitude)          (Azimuth, Altitude)
           │                           │
           │ HTTP (lat, lon)           ▼
           ▼                    Orientation HUD
    FastAPI Backend             (Real-time aim)
   (backend/app/main.py)
    ┌──────┴──────────────────────────┐
    ▼                                 ▼
Astronomy Engine                 Star Service
(Skyfield + Hipparcos)      (Astrophysical Metadata)
    │                                 │
    ▼                                 ▼
Topocentric Alt / Az           Star Profile & Names
    │                                 │
    └────────────────┬────────────────┘
                     ▼
           Mobile User Interface
        (app/App.tsx + StarDetailModal)
```

For full architectural specifications, see [docs/architecture.md](docs/architecture.md).

---

## 📁 Repository Structure

```text
lumina-lens/
├── app/                      # React Native / Expo mobile application
│   ├── src/
│   │   ├── components/       # UI components (StarDetailModal, etc.)
│   │   ├── engines/
│   │   │   └── sensor/       # Sensor Engine (GPS location & orientation hook)
│   │   └── services/         # API client & TypeScript interfaces (api.ts)
│   ├── App.tsx               # Root application screen, HUD & star list
│   └── package.json          # Mobile dependencies & Expo scripts
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/              # API route controllers (sky.py, stars.py)
│   │   ├── engines/
│   │   │   └── astronomy/    # Skyfield ephemeris & Hipparcos computation
│   │   ├── models/           # Pydantic data schemas (star.py)
│   │   ├── services/         # Star metadata & enrichment (star_service.py)
│   │   └── main.py           # FastAPI entrypoint & CORS configuration
│   ├── de421.bsp             # JPL planetary & lunar ephemeris
│   └── requirements.txt      # Python dependencies
├── docs/                     # Core architecture & roadmap documentation
└── research/                 # Phase research, analyses & step-by-step logs
    ├── notes/
    │   ├── Phase-0.md        # Astronomy fundamentals & system design
    │   └── Phase-1/          # Step-by-step Phase 1 implementation logs
    ├── Backend-Architecture-analysis.md
    ├── Frontend-Architecture-analysis.md
    └── Frontend-Bankend-comms-analysis.md
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **Expo Go** app on your physical mobile device (or iOS Simulator / Android Emulator)

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Test health check at: `http://localhost:8000/health`  
Interactive API docs at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd app

# Install dependencies
npm install

# Start the Expo development server
npm start
```
- Press `w` to open in your web browser.
- Scan the QR code using the **Expo Go** app on iOS or Android.

---

## 🗺️ Project Roadmap

- [x] **Phase 0:** Research, celestial coordinate mechanics & architecture definition
- [🔄] **Phase 1:** Foundation, Sensor Engine & Sky Prediction System (*In Progress*)
- [ ] **Phase 2:** Computer Vision & Real-time Star Detection
- [ ] **Phase 3:** Plate Solving & Geometric Pattern Matching
- [ ] **Phase 4:** Augmented Reality Canvas & Constellation Overlays
- [ ] **Phase 5:** AI Astronomy Assistant & Deep Sky Exploration

See [docs/roadmap.md](docs/roadmap.md) for detailed milestone tracking.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.