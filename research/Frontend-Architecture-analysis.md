# Frontend Architecture Inspection — `lumina-lens/app`

---

## Module-by-Module Breakdown

### 1. `app/package.json` — Dependencies & Scripts
- **Core Runtime:** Expo SDK `~57.0.9`, React Native `0.86.2`, React `19.2.3`, `react-dom` (web support), `react-native-web ^0.21.2`, `expo-status-bar ~57.0.1`.
- **Sensors & Hardware:** `expo-location ~19.0.8`, `expo-sensors ~15.0.8`.
- **Developer Tooling:** TypeScript `~6.0.3`, `@types/react ~19.2.2`.
- **Scripts:** standard Expo `start / android / ios / web`.

### 2. `app/index.ts` — Entry Point
- Standard Expo registration: `registerRootComponent(App)` from `./App`.

### 3. `app/App.tsx` — Main Application Screen
- **Responsibility:** Main screen UI, sensor coordination, state management, orientation HUD, and star list rendering.
- **State Managed:**
  - `location: DeviceLocation | null` — live GPS coordinates from `expo-location`.
  - `isLiveLocation: boolean` — tracks whether live GPS or default coordinates are currently active.
  - `orientation: DeviceOrientation` — real-time heading (azimuth) and elevation (pitch) via `useDeviceOrientation()`.
  - `data: VisibleStarsResponse | null` — visible stars fetched from `/sky/visible`.
  - `loading / refreshing / error` — asynchronous request lifecycle.
  - `selectedStar / selectedHip / detailLoading / detailError / modalVisible` — Star Detail Modal state.
- **UI Components & Sections:**
  - `renderHeader`: Location status with coordinates and dynamic badges (`[Live GPS]` in emerald green or `[Default]` in amber).
  - `hudBar`: Real-time Orientation HUD displaying heading (azimuth in degrees with compass cardinal), elevation (altitude in degrees), and aim indicator (`🌌 Sky` when elevation > 20°, else `🔭 Horizon`).
  - `renderStarItem`: Pressable cards (`TouchableOpacity`) displaying star name, catalog ID, visual magnitude badge, altitude, azimuth with 16-point cardinal direction, and rank box. Prominent stars highlighted in gold.
  - `StarDetailModal`: Mounted at root, receiving visible, loading, error, and profile props.
  - Pull-to-refresh (`RefreshControl`) via `handleRefresh`: re-queries device GPS and recalculates the dynamic sky.

### 4. `app/src/components/` — UI Components
- **`SkyDomeView.tsx` — 2D Celestial Radar / Dome:**
  - **Responsibility:** Polar projection canvas rendering stars according to local topocentric angles ($\text{Alt, Az}$).
  - **Coordinate Mapping:** Center is Zenith ($90^\circ$ Alt, $r = 0$), perimeter is Horizon ($0^\circ$ Alt, $r = R$).
  - **Features:** Concentric $30^\circ$ and $60^\circ$ altitude dashed guide rings, cardinal markers ($\text{N, E, S, W}$), magnitude-scaled star dots ($2.5\text{px}$–$8\text{px}$) with glowing halos for navigation stars ($V < 1.5$), real-time phone `AIM` reticle overlay, category filter chips (*All*, *Named Stars*, *Mag $\le 2.5$*, *Mag $\le 4.0$*), and touch targets opening the star profile modal.
- **`StarDetailModal.tsx` — Star Profile Presentation:**
  - **Responsibility:** Slide-up bottom sheet presenting rich astrophysical metadata for a tapped star.
  - **States Handled:** Loading, error with retry/close, and populated profile content.
  - **Sections:** Header with star name and dismiss button; catalog ID & visual magnitude badges; identification details (Bayer/Flamsteed/constellation); astrometric coordinates (RA, Dec, parallax, proper motion); physical properties (distance in ly, spectral class); and scientific/cultural descriptions.

### 5. `app/src/engines/sensor/` — Sensor Engine
- **`location.ts` (`getDeviceLocation`)**:
  - Interacts with `expo-location`.
  - Requests foreground permissions.
  - Retrieves `latitude`, `longitude`, and `altitude`.
  - Provides fallback on rejection.
- **`orientation.ts` (`useDeviceOrientation`)**:
  - Interacts with `expo-sensors` (`Magnetometer` and `Accelerometer`).
  - Computes magnetic heading (`0°–360°`) using $\operatorname{atan2}(y, x)$.
  - Applies a shortest-arc angular smoothing filter across the North boundary ($0^\circ \leftrightarrow 360^\circ$).
  - Computes elevation angle (`0°–90°`) using $\operatorname{atan2}(z, \sqrt{x^2 + y^2})$.
  - Applies a low-pass filter ($\alpha = 0.2$) to eliminate sensor noise.
  - Returns `{ azimuth, altitude, available }`.
- **`index.ts`**: Barrel export for sensor utilities.

### 6. `app/src/services/api.ts` — API Client
- **Responsibility:** Strongly typed communication with the FastAPI backend.
- **Base URL:** Environment-driven with platform fallbacks:
  - `process.env.EXPO_PUBLIC_API_URL` (for physical device testing over LAN / staging)
  - Android Emulator: `http://10.0.2.2:8000`
  - iOS Simulator / Web: `http://localhost:8000`
- **Exports:**
  - Interfaces: `Star`, `VisibleStarsResponse`, `StarProfile`.
  - Functions: `healthCheck()`, `getVisibleStars(lat, lon, limit)`, `getStarByHip(hipId)`.

---

## Architecture Evolution & Status

| Architectural Area | Previous State | Current Status |
|:---|:---|:---|
| **Star Detail Modal** | Module-scope hooks crash (`useState` outside component) | ✅ **Resolved.** State and handlers moved inside `App()`, rendering the dedicated `StarDetailModal.tsx` component. |
| **Observer Coordinates** | Hardcoded Pune coordinates (`18.5204, 73.8567`) | ✅ **Resolved.** Live device GPS via `expo-location` with graceful default fallback and status badges. |
| **Device Orientation** | None | ✅ **Resolved.** Real-time heading and elevation HUD via `expo-sensors` with shortest-arc and low-pass filtering. |
| **Debug Celestial Dome** | Text-only star list | ✅ **Resolved.** Interactive 2D celestial radar (`SkyDomeView.tsx`) with Alt/Az polar projection, magnitude scaling, filter chips, and live aim reticle. |
| **View Navigation** | Single list view | ✅ **Resolved.** Top-level segmented switcher in `App.tsx` between `🌌 Celestial Dome` and `📋 Star List`. |
| **Base URL Config** | Hardcoded dev URLs | ✅ **Resolved.** Inlined `process.env.EXPO_PUBLIC_API_URL` for physical LAN testing with emulator fallbacks. |
| **Styling Architecture** | StyleSheet.create blocks | ✅ **Resolved.** Migrated to Tailwind CSS via NativeWind v5 + Tailwind CSS v4. |
| **Type Checking** | Unchecked | ✅ **Clean.** Passing `npx tsc --noEmit` with 0 type errors. |

---

## Frontend Roadmap for Phase 2: Computer Vision & Star Detection

1. **Camera Stream Integration (Phase 2):**
   - Integrate high-frame-rate camera stream (`expo-camera` or VisionCamera) for night-sky frame acquisition.
2. **Camera Frame Overlay Canvas:**
   - Layer canvas / graphics primitives over live camera frames for star candidate highlighting.
3. **Custom Hooks Extraction:**
   - Extract `useVisibleStars(lat, lon)` into `src/hooks/` to further decouple data-fetching lifecycle from `App.tsx` presentation.