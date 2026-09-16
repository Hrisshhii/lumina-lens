# Phase 1 — Foundation & Sky Prediction

## Objective
Build the technical foundation of Lumina Lens and create the first working sky-prediction system.
The main goal of Phase 1 is:
> Given the user's location and current time, calculate which stars should currently be visible in the sky.
Computer vision, plate solving, AR, and AI are not part of this phase yet.

---

## Phase 1 Plan

1. [x] Set up the React Native mobile application.
2. [x] Set up the FastAPI backend.
3. [x] Connect the mobile application to the backend.
4. [x] Build the Astronomy Engine.
5. [x] Integrate the Hipparcos star catalog.
6. [x] Calculate visible stars using location and time.
7. [x] Connect mobile app to visible stars API.
8. [x] Build the Star Identity & Metadata layer.
9. [x] Build the Sensor Engine (GPS location & orientation).
10. [ ] Create a debug sky visualization.
11. [ ] Test and verify astronomical predictions.

---

## Phase 1 Step Documentation

- [Step 1: Verify Git Repository](./step-1:%20verify%20git%20repository.md)
- [Step 2: Create Mobile Application](./step-2:%20create%20mobile%20application.md)
- [Step 3: Start Expo Development Server](./step-3:%20start%20expo%20development%20server.md)
- [Step 4: Add Web Support](./step-4:%20add%20web%20support.md)
- [Step 5: Astronomy Engine v1](./step-5:%20astronomy%20engine%20v1.md)
- [Step 6: Hipparcos Catalog Integration](./step-6:%20hipparcos%20catalog%20integration.md)
- [Step 7: Connect Mobile App to Visible Stars API](./step-7:%20connect%20mobile%20app%20to%20visible%20stars%20api.md)
- [Step 8: Star Identity & Metadata](./step-8:%20star%20identity%20&%20metadata.md)
- [Step 9: Sensor Engine](./step-9:%20sensor%20engine.md)

---

# Current Architecture

The project contains a fully operational frontend-backend pipeline:

```text
Lumina Lens Mobile Client (app/)
├── Sensor Engine (GPS & Orientation HUD)
├── StarDetailModal (Astrophysical Identity & Metadata)
└── api.ts (Typed HTTP Client)
       │
       │ HTTP API (lat, lon)
       ▼
FastAPI Backend (backend/)
├── /sky/visible -> AstronomyEngine (Skyfield + DE421 + Hipparcos)
├── /stars/{hip_id} -> StarService (Metadata & Distance Calculation)
└── /health -> Health Check
```

---

# Current Project Structure

```text
lumina-lens/
│
├── app/                 # React Native / Expo application
│   ├── src/
│   │   ├── components/  # StarDetailModal.tsx
│   │   ├── engines/
│   │   │   └── sensor/  # location.ts, orientation.ts, index.ts
│   │   └── services/    # api.ts
│   └── App.tsx          # Main screen, live GPS badge & Orientation HUD
│
├── backend/             # FastAPI backend
│   ├── app/
│   │   ├── api/         # sky.py, stars.py
│   │   ├── engines/     # astronomy/astronomy_engine.py
│   │   ├── models/      # star.py
│   │   └── services/    # star_service.py
│   ├── de421.bsp        # JPL ephemeris
│   └── main.py          # FastAPI application
│
├── docs/                # Architecture and roadmap documentation
├── research/            # Research and step-by-step logs
└── README.md
```

---

# Phase 1 Progress

## Completed

* [x] Verify GitHub repository connection
* [x] Verify `main` branch
* [x] Create React Native application
* [x] Configure Expo
* [x] Configure TypeScript
* [x] Start Metro development server
* [x] Add Expo web dependencies
* [x] Establish initial project structure
* [x] Create Python virtual environment
* [x] Install FastAPI
* [x] Create backend application
* [x] Create `/health` API endpoint
* [x] Run FastAPI development server
* [x] Connect Expo application to FastAPI
* [x] Create Astronomy Engine (Skyfield + `de421.bsp`)
* [x] Integrate Hipparcos catalog (~5,000 stars)
* [x] Calculate visible stars (vectorized topocentric Alt/Az)
* [x] Build Star Identity & Metadata layer (`/stars/{hip_id}` + `StarDetailModal`)
* [x] Build Sensor Engine (GPS location & live orientation HUD)

## Next

* [ ] **Step 10: Debug Sky Visualization:** Build a 2D celestial radar / dome plot to visualize stars in the sky instead of only reading a text list.
* [ ] **Step 11: Astronomical Prediction Verification:** Cross-check predictions against Stellarium / SkyView for known observers to verify mathematical accuracy and complete Phase 1.

---

## Phase 1 Success Condition

At the end of Phase 1, Lumina Lens should be capable of taking:

```text
User Location (Live GPS) + Current Date & Time
                     ↓
             Astronomy Engine
                     ↓
         Visible Stars & Topocentric Angles
```

and returning accurate astronomical data verified against physical reality:

```text
Vega (HIP 91262)
Constellation: Lyra
Altitude: 59.8°
Azimuth: 42.4° (NE)
Magnitude: 0.03
Distance: 25.04 light-years
```
