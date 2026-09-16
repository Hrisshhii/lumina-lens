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

### 4. `app/src/components/StarDetailModal.tsx` — Star Profile Presentation
- **Responsibility:** Slide-up bottom sheet presenting rich astrophysical metadata for a tapped star.
- **States Handled:**
  - Loading: Activity indicator and "Fetching star profile..." message.
  - Error: Clean error display with Retry and Close actions (handles network errors or backend 404s).
  - Profile Content: Renders only when data exists (graceful degradation for sparse catalog entries).
- **Sections:**
  - Header: Primary star name (falls back to `HIP <id>`), constellation tag, and dismiss button.
  - Badges: Catalog ID (`HIP <id>`), visual apparent magnitude.
  - Identification: Alternate names, Bayer designation, Flamsteed number, constellation.
  - Catalog Astrometry: Right Ascension (RA), Declination (Dec), trigonometric parallax (mas), proper motion (mas/yr).
  - Physical Properties: Apparent magnitude, spectral class, distance in light-years.
  - Narrative: In-depth scientific and cultural overview for prominent stars.

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
- **Base URL:** Platform-adaptive (`http://10.0.2.2:8000` for Android emulator, `http://localhost:8000` for iOS/web).
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
| **Directory Structure** | Only `src/services/` existed | ✅ **Organized.** Added `src/components/` and `src/engines/sensor/`. |
| **Type Checking** | Unchecked | ✅ **Clean.** Passing `npx tsc --noEmit` with 0 type errors. |

---

## Remaining Frontend Improvements for Future Phases

1. **Environment Configuration:**
   - Migrate hardcoded `BASE_URL` to Expo environment variables (`process.env.EXPO_PUBLIC_API_URL`) to seamlessly support physical mobile testing over LAN or production backends.
2. **Custom Hooks Extraction:**
   - Extract `useVisibleStars(lat, lon)` into `src/hooks/` to further separate data-fetching lifecycle from `App.tsx` presentation.
3. **Debug Celestial Dome (Step 10):**
   - Implement a 2D polar/radar canvas rendering stars positioned by Altitude (radius from zenith) and Azimuth (angle from North).