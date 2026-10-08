# Step 1: Camera Access & Live Viewfinder

## Objective
Establish the hardware camera capture foundation for Lumina Lens. Integrate `expo-camera` into the React Native mobile client, manage camera permissions, build a dedicated night-sky viewfinder component (`CameraViewfinder.tsx`), and integrate a **`📷 Lens`** view mode into `App.tsx`.

---

## 1. Context & Motivation
In Phase 1, Lumina Lens established the mathematical and sensor foundation:
- Predicts visible stars from GPS coordinates and UTC time.
- Renders an interactive 2D celestial dome radar (`SkyDomeView.tsx`) and star metadata modal (`StarDetailModal.tsx`).
- Tracks device heading (azimuth) and elevation (pitch) via the Sensor Engine.

**Phase 2 begins the physical vision pipeline.** Before we can detect stars, compute background gradients, and calculate sub-pixel centroids, the application must be able to:
1. Access the device's physical camera sensor with low-light configuration.
2. Render a responsive live viewfinder with dark-sky ergonomics.
3. Overlay real-time orientation sensors so the user knows where the camera is pointed relative to the celestial horizon.
4. Provide a graceful developer fallback for web browsers and emulators.

---

## 2. Technical Design & Architecture

### A. Technology Selection: `expo-camera`
- **Library:** `expo-camera` (modern `CameraView` API introduced in Expo SDK 51+ and stabilized in SDK 52/57).
- **Camera Facing:** Rear-facing (`facing="back"`) by default for night-sky observation.
- **Permissions:** Managed dynamically via `useCameraPermissions()`, rendering an informative permission grant prompt when ungranted.

### B. Viewfinder UI Component (`CameraViewfinder.tsx`)
```text
CameraViewfinder
├── Permission Guard (Requests permission if not granted)
├── Live CameraView (Full-bleed rear camera preview)
│   ├── Target Reticle & Crosshair (Aids alignment and star tracking)
│   ├── Floating Sensor HUD Badge (Live Azimuth, Elevation, Aim status)
│   ├── Viewfinder Status Pill (FPS, resolution hint, active camera)
│   └── Lens Controls (Facing flip, capture trigger placeholder)
└── Web / Emulator Fallback (Renders WebRTC camera or synthetic starfield simulator)
```

### C. View Switcher Integration (`App.tsx`)
Update the top-level segmented control in `App.tsx` to include three view modes:
- **`📷 Lens`**: Real-time camera viewfinder (Phase 2 entry point).
- **`🌌 Dome`**: 2D celestial radar / planisphere (Phase 1 Step 10).
- **`📋 List`**: Ranked visible stars list (Phase 1 Step 7).

---

## 3. Implementation Tasks

1. **Install Camera Dependency:**
   - Install `expo-camera` via Expo CLI:
     ```bash
     npx expo install expo-camera
     ```
2. **Build `CameraViewfinder.tsx`:**
   - Create `app/src/components/CameraViewfinder.tsx`.
   - Handle permission requests gracefully.
   - Display full-screen camera preview with astronomical crosshair guidelines.
   - Overlay live orientation HUD values (`azimuth`, `altitude`).
   - Implement web fallback.
3. **Integrate into `App.tsx`:**
   - Update `viewMode` state to `"lens" | "dome" | "list"`.
   - Add the `📷 Lens` tab to the segmented control.
4. **Verification & Testing:**
   - Verify TypeScript compilation (`npx tsc --noEmit`).
   - Verify bundle export for web (`npx expo export --platform web`).
   - Verify bundle export for Android (`npx expo export --platform android`).
