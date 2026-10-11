# Step 1: Camera Access & Live Viewfinder (Completed ✅)

## Objective
Establish the hardware camera capture foundation for Lumina Lens. Integrate `expo-camera` into the React Native mobile client, manage camera permissions, build a dedicated night-sky viewfinder component (`CameraViewfinder.tsx`), and integrate a **`📷 Lens`** view mode into `App.tsx` alongside `🌌 Dome` and `📋 List`.

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
5. Provide an astronomical "Red Night Mode" to protect the observer's dark adaptation during night-sky stargazing sessions.

---

## 2. Technical Design & Architecture

### A. Technology Selection: `expo-camera`
- **Library:** `expo-camera` (`CameraView`, `useCameraPermissions`, `CameraType`) configured in `package.json`.
- **Camera Facing:** Rear-facing (`facing="back"`) by default for astronomical observation, with toggleable front-facing flip.
- **Permissions:** Managed dynamically via `useCameraPermissions()`, rendering an informative dark-sky permission grant prompt when ungranted.

### B. Viewfinder UI Component (`CameraViewfinder.tsx`)
```text
CameraViewfinder
├── Permission Guard
│   ├── Checking indicator (when permission is null)
│   └── Astronomical Permission Prompt Card (informative rationale + Grant button)
├── Live CameraView (Full-bleed camera preview)
│   ├── Dark-Sky Contrast Vignette (Normal & Astro Red Mode)
│   ├── Astronomical Reticle & Crosshair
│   │   ├── Outer Altitude Reference Circle (dashed)
│   │   ├── Inner Centroid Alignment Circle
│   │   ├── Horizontal & Vertical Crosshair Axes
│   │   └── Center Target Dot
│   ├── Floating Top Sensor HUD Badge
│   │   ├── HEADING (Azimuth degrees)
│   │   ├── ELEVATION (Altitude degrees)
│   │   └── AIM Status (🌌 Sky vs. 🔭 Horizon)
│   └── Bottom Floating Controls Bar
│       ├── Active Status Pill (Stars tracked above horizon)
│       ├── Camera Facing Flip (Rear / Front)
│       ├── Reticle Toggle (Show / Hide crosshair)
│       └── Astro Red Night Vision Toggle (🌙 Dark Vision / 🔴 Red Mode)
└── Cross-Platform Web Support
    └── In-browser feed with Web status indicator
```

### C. View Switcher Integration (`App.tsx`)
The top-level segmented control in `App.tsx` now supports three modes:
- **`📷 Lens`**: Real-time camera viewfinder (Phase 2 entry point).
- **`🌌 Dome`**: 2D celestial radar / planisphere (Phase 1 Step 10).
- **`📋 List`**: Ranked visible stars list (Phase 1 Step 7).

---

## 3. Web Layout & Styling Optimization

During testing of the web client, layout sprawl and overlapping components were diagnosed:
1. **Modal DOM Inlining:** React Native's `<Modal>` in web environments can render inline rather than as a floating viewport overlay.
   - **Fix:** Refactored `StarDetailModal.tsx` to an absolute-positioned overlay with `zIndex: 9999`, backdrop dismissal via `Pressable`, and bottom sheet ergonomics.
2. **Missing `flexDirection` on Web:** Some Tailwind utility classes like `flex-row` were not consistently applied on web when compiling stylesheets.
   - **Fix:** Added explicit React Native inline flex styles (`flexDirection: "row"`, etc.) in `App.tsx`, `SkyDomeView.tsx`, and `StarDetailModal.tsx`.
3. **Responsive Width Constraints:** Added desktop container containment (`maxWidth: 540`, `alignSelf: "center"`) in `App.tsx` to prevent wide-screen sprawl on desktop browsers.

---

## 4. Verification & Testing

| Test Check | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript Compilation** | `npx tsc --noEmit` | **Passed (0 errors)** ✅ | Strict type-safety across all components. |
| **Web Bundle Export** | `EXPO_NO_TELEMETRY=1 npx expo export --platform web` | **Passed** ✅ | 413 modules bundled into `dist/`. |
| **Android Bundle Export** | `EXPO_NO_TELEMETRY=1 npx expo export --platform android` | **Passed** ✅ | 1136 modules bundled (Hermes bytecode generated). |

---

## 5. Next Steps

With the camera capture foundation and live viewfinder operational:
- **Step 2:** Night-Sky Frame Acquisition & Resolution Configuration — manage aspect ratios, capture triggers, and raw image buffers for computer vision processing.
- **Step 3:** Image Preprocessing — RGB to monochromatic luminance conversion and noise reduction filters.
