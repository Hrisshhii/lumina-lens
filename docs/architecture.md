# Lumina Lens System Architecture

> Complete architectural specification for the Lumina Lens platform.

---

## 1. Architectural Philosophy

Lumina Lens transforms a mobile smartphone into an intelligent, augmented window to the cosmos. To achieve high precision with low latency, the system is designed around clean separation of responsibilities:

1. **Strict Engine Isolation:**
   - **The Sensor Engine never does astronomy.** It strictly interacts with device hardware (GPS, Magnetometer, Accelerometer) to determine observer position on Earth and device pointing orientation.
   - **The Astronomy Engine never touches hardware.** It is a pure mathematical and ephemeris engine that accepts observer coordinates `(latitude, longitude, time)` and outputs topocentric sky coordinates `(Altitude, Azimuth)` relative to the local horizon.
   - **The Star Identity / Metadata Layer never computes positions.** It answers *"What is this object?"* (names, distance, spectral type, physical description) rather than *"Where is this object right now?"*.
2. **Vectorized Sky Computation:**
   - Rather than calculating each star individually, the Astronomy Engine performs vectorized array mathematics over thousands of catalog stars simultaneously using Skyfield and NumPy, returning real-time sky results in ~20ms.
3. **Graceful Degradation:**
   - Missing GPS permissions fall back seamlessly to default coordinates.
   - Missing orientation hardware defaults to inactive state without crashing the UI.
   - Stars with sparse catalog data render available fields gracefully without schema errors.

---

## 2. High-Level System Architecture

```text
                           PHYSICAL UNIVERSE
                                   │
                                   ▼
                    Smart Phone Hardware Sensors
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
        GPS Receiver          Magnetometer          Accelerometer
     (Lat, Lon, Altitude)     (Magnetic Field)      (Gravity Vector)
            │                      │                      │
            └──────────────────────┼──────────────────────┘
                                   ▼
                       MOBILE CLIENT (app/)
                         [Sensor Engine]
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
           Live Location                      Orientation Hook
     (getDeviceLocation())                 (useDeviceOrientation())
     Latitude, Longitude                   Azimuth (0-360°), Altitude (0-90°)
                │                                     │
                │ HTTP GET                            ▼
                ▼ (/sky/visible)               Orientation HUD
         [API Client]                         (Heading & Sky Aim)
        (services/api.ts)                             │
                │                                     │
════════════════╪═════════════════════════════════════╪══════════════════════
                ▼                                     │
         BACKEND (backend/)                           │
         [FastAPI Application]                        │
                │                                     │
        ┌───────┴───────────────────┐                 │
        ▼                           ▼                 │
  [API Routes]                [API Routes]            │
   (api/sky.py)              (api/stars.py)           │
        │                           │                 │
        ▼                           ▼                 │
[Astronomy Engine]           [Star Service]           │
(Skyfield + DE421 +          (Hipparcos Metadata +    │
 Hipparcos Catalog)           Enriched Profiles)      │
        │                           │                 │
        ▼                           ▼                 │
Topocentric Stars List       Star Profile (DTO)       │
 {hip, alt, az, mag, name}   {hip_id, dist, spec...}  │
        │                           │                 │
════════════════╪═══════════════════╪═════════════════╪══════════════════════
                ▼                   ▼                 │
         [App UI Presentation & State] ◄──────────────┘
            (app/App.tsx FlatList + Badges)
            (app/src/components/StarDetailModal.tsx)
```

---

## 3. Subsystem Breakdown

### 3.1 Mobile Client Subsystems (`app/`)

#### A. Presentation Layer (`app/App.tsx`, `StarDetailModal.tsx`)
- **`App.tsx`**: Central application component that coordinates:
  - Observer state: holds live `location` and `isLiveLocation` flag.
  - Heading and tilt: consumes `useDeviceOrientation()`.
  - Sky data fetching: runs `fetchStars` on initial load and pull-to-refresh (`handleRefresh`).
  - Orientation HUD: displays live compass heading (e.g. `248° WSW`), elevation pitch (`45°`), and aim status (`🌌 Sky` when pitch > 20°, otherwise `🔭 Horizon`).
  - Coordinate badge: renders `[Live GPS]` in emerald green or `[Default]` in amber.
  - Star list: renders brightness-ranked cards with altitude, azimuth, compass direction, magnitude, and prominent star name highlights.
- **`StarDetailModal.tsx`**: Bottom-sheet modal displaying full astrophysical information for any tapped star:
  - Identification: Primary name, Bayer designation, Flamsteed number, constellation, alternate names.
  - Badges: Catalog HIP ID, apparent magnitude.
  - Astrometric coordinates: Right Ascension (RA in hours), Declination (Dec in degrees), trigonometric parallax (mas), proper motion (mas/yr).
  - Physical properties: Apparent magnitude, spectral classification, distance in light-years.
  - Narrative: Detailed scientific and cultural description for prominent night-sky objects.

#### B. Sensor Engine (`app/src/engines/sensor/`)
- **`location.ts` (`getDeviceLocation`)**:
  - Leverages `expo-location`.
  - Requests foreground permissions (`requestForegroundPermissionsAsync`).
  - Queries device coordinates with `Accuracy.High`.
  - Returns `DeviceLocation { latitude, longitude, altitude }`. Throws structured errors on rejection.
- **`orientation.ts` (`useDeviceOrientation`)**:
  - Leverages `expo-sensors` (`Magnetometer` and `Accelerometer`).
  - Computes magnetic heading: $\theta = \operatorname{atan2}(y, x) \times \frac{180}{\pi}$, normalized to $[0^\circ, 360^\circ)$.
  - Applies a shortest-arc angular smoothing filter to prevent heading jumps across the North border ($0^\circ \leftrightarrow 360^\circ$).
  - Computes device pitch: $\phi = \operatorname{atan2}(z, \sqrt{x^2 + y^2}) \times \frac{180}{\pi}$, clamped to $[0^\circ, 90^\circ]$.
  - Applies a low-pass filter ($\alpha = 0.2$) to eliminate sensor jitter.
  - Returns `DeviceOrientation { azimuth, altitude, available }`.
- **`index.ts`**: Clean barrel file exposing all sensor APIs.

#### C. API Communication Layer (`app/src/services/api.ts`)
- Configures platform-aware `BASE_URL`:
  - Android Emulator: `http://10.0.2.2:8000`
  - iOS Simulator / Web: `http://localhost:8000`
- Provides strongly typed async client functions:
  - `getVisibleStars(latitude, longitude, limit)`: calls `GET /sky/visible`.
  - `getStarByHip(hipId)`: calls `GET /stars/{hipId}`.
  - `healthCheck()`: calls `GET /health`.

---

### 3.2 Backend Subsystems (`backend/`)

#### A. Application Entrypoint (`backend/app/main.py`)
- Instantiates the FastAPI application.
- Configures Cross-Origin Resource Sharing (CORS) middleware.
- Mounts routes:
  - `/sky` router (`backend/app/api/sky.py`)
  - `/stars` router (`backend/app/api/stars.py`)
- Provides `GET /health` liveness endpoint.

#### B. Astronomy Engine (`backend/app/engines/astronomy/astronomy_engine.py`)
- Powered by **Skyfield**, **NumPy**, and the JPL **DE421** ephemeris.
- Maintains catalog of ~5,000 naked-eye stars ($V \le 6.0$) from the Hipparcos dataset.
- Algorithm for `get_visible_stars(latitude, longitude, limit)`:
  1. Creates observer position: `Topos(latitude_degrees=latitude, longitude_degrees=longitude)`.
  2. Queries current UTC timestamp from Skyfield timescale (`load.timescale().now()`).
  3. Computes apparent celestial position for the vectorized star array relative to the observer.
  4. Transforms celestial coordinates into local topocentric coordinates:
     $$\text{Altitude } (\text{elevation above horizon}) \quad \text{and} \quad \text{Azimuth } (\text{degrees from True North})$$
  5. Filters out stars below the local horizon ($\text{Altitude} > 0^\circ$).
  6. Sorts above-horizon stars by visual brightness ($V$ magnitude ascending).
  7. Applies prominent star naming mapping (e.g. Sirius, Vega, Betelgeuse, Rigel, Polaris).
  8. Returns truncated results matching requested `limit`.

#### C. Star Service & Metadata Layer (`backend/app/services/star_service.py`)
- Resolves deep astrophysical metadata for individual stars by Hipparcos ID.
- Combines astrometric catalog data with enriched cultural and scientific records (`ENRICHED_METADATA`).
- Calculates physical distance from trigonometric parallax:
  $$d \, (\text{light-years}) \approx \frac{3.26156}{\text{parallax (arcseconds)}} = \frac{3261.56}{\text{parallax (mas)}}$$
- Assembles and returns a validated Pydantic `Star` model (`backend/app/models/star.py`).

---

## 4. End-to-End Data Flow Sequence

```text
User Device                Mobile App              FastAPI Backend         Astronomy Engine / Catalog
    │                          │                          │                            │
    │ App Launch               │                          │                            │
    ├─────────────────────────►│                          │                            │
    │                          │                          │                            │
    │ 1. Request GPS & Sensors │                          │                            │
    │◄─────────────────────────┤                          │                            │
    │ 2. Return Lat, Lon, Tilt │                          │                            │
    ├─────────────────────────►│                          │                            │
    │                          │                          │                            │
    │                          │ 3. GET /sky/visible      │                            │
    │                          │    ?latitude=18.52       │                            │
    │                          │    &longitude=73.85      │                            │
    │                          ├─────────────────────────►│                            │
    │                          │                          │ 4. Vectorized Skyfield     │
    │                          │                          │    alt/az calculation      │
    │                          │                          ├───────────────────────────►│
    │                          │                          │ 5. Filter alt > 0 & sort   │
    │                          │                          │◄───────────────────────────┤
    │                          │ 6. Return JSON Stars     │                            │
    │                          │◄─────────────────────────┤                            │
    │                          │                          │                            │
    │ 7. Render Star List &    │                          │                            │
    │    Live Orientation HUD  │                          │                            │
    │◄─────────────────────────┤                          │                            │
    │                          │                          │                            │
    │ 8. User Taps Star Card   │                          │                            │
    ├─────────────────────────►│                          │                            │
    │                          │ 9. GET /stars/91262      │                            │
    │                          ├─────────────────────────►│                            │
    │                          │                          │ 10. Query StarService &    │
    │                          │                          │     compute distance       │
    │                          │                          ├───────────────────────────►│
    │                          │ 11. Return Star Profile  │◄───────────────────────────┤
    │                          │◄─────────────────────────┤                            │
    │ 12. Open StarDetailModal │                          │                            │
    │◄─────────────────────────┤                          │                            │
```

---

## 5. File Responsibility Matrix

| Subsystem | File Path | Primary Responsibility |
|:---|:---|:---|
| **Frontend** | `app/App.tsx` | Root screen, state orchestration, GPS badge, Orientation HUD, pull-to-refresh, star card list. |
| **Frontend** | `app/src/components/StarDetailModal.tsx` | Slide-up modal displaying detailed astrophysical profile and descriptions. |
| **Frontend** | `app/src/engines/sensor/location.ts` | Requests location permissions and retrieves device latitude, longitude, and altitude. |
| **Frontend** | `app/src/engines/sensor/orientation.ts` | Custom hook consuming magnetometer and accelerometer with angular filtering. |
| **Frontend** | `app/src/engines/sensor/index.ts` | Barrel file re-exporting sensor engine utilities. |
| **Frontend** | `app/src/services/api.ts` | Typed HTTP client for `/health`, `/sky/visible`, and `/stars/{hip_id}`. |
| **Backend** | `backend/app/main.py` | FastAPI application factory, CORS middleware, router registration, `/health`. |
| **Backend** | `backend/app/api/sky.py` | Endpoint controller for `GET /sky/visible` with coordinate validation. |
| **Backend** | `backend/app/api/stars.py` | Endpoint controller for `GET /stars/{hip_id}` with 404 handling. |
| **Backend** | `backend/app/engines/astronomy/astronomy_engine.py` | Vectorized ephemeris calculations, topocentric alt/az transforms, horizon filtering. |
| **Backend** | `backend/app/services/star_service.py` | Hipparcos row resolution, parallax-distance computation, enriched scientific data. |
| **Backend** | `backend/app/models/star.py` | Pydantic data schemas defining the contract for star profiles. |

---

## 6. Future Architectural Extensions

As Lumina Lens progresses beyond Phase 1, the following engines will be integrated into this pipeline:

1. **Vision Engine (Phase 2):**
   - Direct camera frame acquisition via mobile camera stream.
   - Grayscale conversion, adaptive thresholding, noise reduction.
   - Blob detection and sub-pixel star centroid localization.
2. **Plate Solving Engine (Phase 3):**
   - Generation of geometric asterism invariants (triangles/quads) from detected star centroids.
   - Kd-tree spatial index search against the Hipparcos catalog.
   - True camera pose determination (Field of View, camera orientation quaternion).
3. **Augmented Reality Canvas (Phase 4):**
   - High-performance OpenGL/Skia graphics layer drawing labels, constellation stick figures, and celestial grids directly over camera feed.
4. **AI Astronomy Assistant (Phase 5):**
   - Natural language conversational engine with identified celestial objects injected as live conversational context.
