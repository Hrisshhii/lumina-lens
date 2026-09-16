## Step 9: Sensor Engine (Device Location & Orientation)

In Step 7 and Step 8, we connected our mobile app to the backend and built the star catalog identity layer.
However, the mobile app currently uses hardcoded observer coordinates:
```text
Latitude: 18.5204° N
Longitude: 73.8567° E
(Pune, India)
```
And the app only knows which stars are above the horizon in general—it has no idea **where the user actually is on Earth**, or **which direction the phone is physically pointing in the sky**.

To bridge the physical world with our Astronomy Engine, Lumina Lens needs a dedicated **Sensor Engine**.

---

### Core Philosophy:
From our Phase 0 architecture:
> **The Sensor Engine never does astronomy.**
> It is only responsible for reading hardware sensors, filtering noise, and telling the app:
> *"Where is the device on Earth, and what direction is the camera facing?"*

```text
       Phone Sensors (Hardware)
                  ↓
            Sensor Engine
                  ↓
  { Latitude, Longitude, Heading, Pitch }
                  ↓
          Astronomy Engine
                  ↓
  Predict Visible Stars in Phone's View
```

---

### What Needs to Be Achieved:

#### 1. GPS Location on Earth
- Replace hardcoded Pune coordinates with live device GPS.
- Determine user's `latitude`, `longitude`, and GPS altitude.
- Handle location permissions (permission requested → granted → coordinates updated; if denied, fallback gracefully to default coordinates).
- Pass live coordinates to `getVisibleStars(lat, lon)` so the sky recalculates wherever the user is in the world.

#### 2. Compass Direction (Azimuth / Yaw)
- Read the phone's magnetometer / compass sensor.
- Calculate device heading: `0° to 360°` (0° = North, 90° = East, 180° = South, 270° = West).
- Answers: *"Which compass direction is the phone facing?"*

#### 3. Device Elevation / Tilt (Altitude / Pitch)
- Read the phone's accelerometer / gyroscope / device motion.
- Calculate the phone's vertical elevation angle: `0° to 90°` (0° = Horizon, 90° = Zenith / straight up).
- Answers: *"Is the user looking straight ahead, down, or up into the night sky?"*

#### 4. Sensor Fusion & Smoothing
- Raw mobile sensor readings are noisy and jittery.
- Apply basic low-pass filtering or smoothing so values don't flicker on the screen.
- Provide a clean stream of orientation updates to the app.

---

### The Plan for Step 9:

```text
┌───────────────────────────────────────────────────────────┐
│                        Step 9 Plan                        │
└───────────────────────────────────────────────────────────┘

1. Install Sensor Dependencies
   - expo-location (GPS coordinates & permissions)
   - expo-sensors (Magnetometer, Accelerometer, DeviceMotion)

2. Create Sensor Engine Architecture
   - Directory: app/src/engines/sensor/
   - SensorService / hooks for:
     * Location provider (useLocation)
     * Device orientation provider (useDeviceOrientation / useCompass)

3. Wire Location to Astronomy API
   - Replace DEFAULT_LATITUDE and DEFAULT_LONGITUDE in App.tsx
   - Automatically fetch stars for user's actual location
   - Show live location status in the header (e.g. "GPS Locked: 18.52° N, 73.85° E")

4. Build Live Orientation Display (HUD)
   - Real-time compass heading (e.g. "Azimuth: 248° WSW")
   - Real-time elevation pitch (e.g. "Altitude: 45°")
   - Visual indicator showing if the phone is pointed up at the sky

5. Test on Real Device & Simulators
   - Test permission grant and deny flows
   - Test coordinate updates and error fallbacks
```

---

### Data Flow with Sensor Engine:

```text
            User opens app & tilts phone up
                           ↓
                     Sensor Engine
             ┌─────────────┴─────────────┐
             ▼                           ▼
        Live GPS                 Compass & Pitch
   (Latitude, Longitude)        (Azimuth, Altitude)
             │                           │
             ▼                           │
      Astronomy Engine                   │
             │                           │
             ▼                           ▼
    All Visible Stars           Camera View Window
             └─────────────┬─────────────┘
                           ▼
             Stars in Current Phone View
                           ▼
                      Lumina Lens UI
```

---

### Phase 1 Progress Checklist:

- [x] Verify GitHub repository connection
- [x] Create React Native application & Expo setup
- [x] Create FastAPI backend & `/health` endpoint
- [x] Build Astronomy Engine v1 (Skyfield + ephemeris)
- [x] Integrate Hipparcos star catalog (5,000+ stars)
- [x] Connect mobile app to `/sky/visible` endpoint
- [x] Build Star Identity & Metadata layer (`/stars/{hip_id}` + `StarDetailModal`)
- [x] **Step 9: Sensor Engine (GPS location & device orientation)**
- [ ] **Step 10: Debug Sky Visualization (2D sky dome plot)** ◄ *Current Focus*
- [ ] Step 11: Astronomical Prediction Verification (cross-check with Stellarium)

---

# Step 9 Status:
The Sensor Engine has been built and connected to the Astronomy API and mobile UI.

```text
Phone Sensors (GPS + Magnetometer + Accelerometer)
                         ↓
                   Sensor Engine
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   Live Location                  Device Orientation
(Latitude, Longitude)             (Heading, Elevation)
        ↓                                 ↓
Visible Stars Calculation          Orientation HUD
(/sky/visible?latitude&longitude)  (Heading & Elevation)
```

## Changes Made:

### 1. `app/src/engines/sensor/location.ts` — GPS Location Engine
- Implemented `getDeviceLocation()` using `expo-location`.
- Requests foreground permissions dynamically.
- Fetches accurate device latitude, longitude, and altitude.

### 2. `app/src/engines/sensor/orientation.ts` — Device Orientation & Compass Engine
- Implemented `useDeviceOrientation()` hook using `expo-sensors` (`Magnetometer` + `Accelerometer`).
- Computes real-time compass heading / azimuth (`0°–360°`) from magnetic field vectors.
- Computes sky elevation angle / pitch (`0°–90°`) from gravitational acceleration vectors.
- Implements shortest-arc angular smoothing filter to prevent heading jump glitches across North (0°/360°).
- Implements low-pass filtering on elevation to eliminate sensor jitter.
- Gracefully handles devices/environments where hardware sensors are unavailable.

### 3. `app/src/engines/sensor/index.ts` — Sensor Engine Entrypoint
- Cleanly exports `location` and `orientation` APIs for the app.

### 4. `app/App.tsx` — Dynamic Coordinates & Orientation HUD
- Replaced hardcoded Pune constants with live GPS coordinates, automatically passing them to `getVisibleStars(lat, lon)` on mount and pull-to-refresh.
- Added graceful fallback to default coordinates if GPS permissions are denied.
- Added hemisphere-aware coordinate formatting (e.g. `18.5204° N, 73.8567° E`) with `[Live GPS]` and `[Default]` badges in the header.
- Added real-time **Orientation HUD** bar displaying:
  * **Heading**: e.g. `248° WSW`
  * **Elevation**: e.g. `45°`
  * **Aim**: e.g. `🌌 Sky` vs `🔭 Horizon`

## Next After This Step
- **Step 10: Debug Sky Visualization** — render a 2D celestial dome / radar map plotting stars by Alt/Az instead of just a text list.
- **Step 11: Astronomical Prediction Verification** — cross-verify calculations against Stellarium / SkyView to finalize Phase 1.


