# Step 2: Night-Sky Frame Acquisition & Resolution Configuration

## Objective
Establish the frame acquisition architecture and data contracts for Lumina Lens. Bridge the live camera hardware (`expo-camera`) to the downstream computer vision pipeline by implementing high-resolution frame capture, aspect-ratio preservation, metadata synchronization (timestamp, GPS, orientation), and a calibrated synthetic starfield generator for deterministic offline benchmarking.

---

## 1. Context & Astronomical Motivation

In **Phase 2 Step 1**, we built the interactive viewfinder (`CameraViewfinder.tsx`) with real-time sensor HUD overlays and night-vision dark adaptation.

However, star detection and plate solving cannot operate on compressed video stream approximations alone. Astronomical star identification requires:
1. **Geometric Aspect Ratio Invariance:** Sensor frames must not suffer non-uniform stretching or anamorphic scaling. An elliptical distortion would alter inter-star angular distances and invalidate triangle-hash matching in Phase 3.
2. **Metadata Synchronization at Capture Time:** The exact UTC timestamp, observer GPS coordinates, and device orientation $(\text{Azimuth}, \text{Altitude})$ must be captured synchronously with the frame shutter to match celestial ephemerides.
3. **Resolution Optimization:** Star centroids are sub-pixel diffraction disks (Point Spread Functions, Airy disks). Too low a resolution merges close double stars; too high a resolution slows down connected-component labeling on mobile GPUs/CPUs.
4. **Synthetic Starfield Benchmarking:** Clear night skies with zero cloud cover and zero light pollution are rare during daytime development. The system requires an in-engine synthetic starfield generator that models point spread functions (Gaussian PSFs), Poisson noise, and atmospheric background gradients to benchmark Steps 3–6 deterministically.

---

## 2. Technical Design & Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │                  Capture Trigger Event                 │
               │         (User Shutter Tap OR Benchmark Inject)         │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
      [Live Camera Sensor]                            [Synthetic Generator]
      • CameraViewRef                                 • Known Astrometric Field
      • takePictureAsync()                            • Gaussian Airy Disks (PSF)
      • Low-compression JPEG/PNG                      • Poisson Sky Gradient
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │             CapturedFrame             │
                      │  • uri: string                        │
                      │  • width, height: number              │
                      │  • aspectRatio: number                │
                      │  • timestamp: number (UTC epoch ms)   │
                      │  • observer: { lat, lon }             │
                      │  • orientation: { azimuth, altitude } │
                      │  • source: 'camera' | 'synthetic'     │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      Forwarded to Step 3 (Preprocessing Layer)
```

### A. Frame Data Contract (`app/src/engines/vision/types.ts`)
```typescript
export interface CapturedFrame {
  id: string;
  uri: string;
  width: number;
  height: number;
  aspectRatio: number;
  timestamp: number; // UTC milliseconds
  orientation: {
    azimuth: number;
    altitude: number;
    roll?: number;
  };
  observer: {
    latitude: number;
    longitude: number;
  };
  source: "camera" | "synthetic";
  metadata?: {
    shutterSpeed?: string;
    iso?: number;
    fieldOfViewDegrees?: number;
    targetConstellation?: string;
  };
}
```

### B. Resolution Presets
- **Preview Resolution (`1280x720` - 720p):** Fast frame streaming and interactive viewfinder HUD.
- **Analysis Resolution (`1920x1080` - 1080p Standard):** Optimal balance between processing latency (< 80ms) and sub-pixel star centroid accuracy ($\pm 0.15\text{ px}$).
- **High-Res Archive (`4K / Native Sensor`):** Maximum photometric dynamic range for faint magnitude stars ($V > 4.5$).

### C. Synthetic Starfield Generator (`syntheticStarfield.ts`)
To allow automated verification of the downstream computer vision pipeline without waiting for clear outdoor night skies:
- Generates SVG/Canvas-compatible pixel maps of benchmark asterisms (e.g. **Orion**, **Cassiopeia**, **Summer Triangle**).
- Models star intensity via 2D Gaussian point spread function:
  $$I(x, y) = I_0 \exp\left(-\frac{(x - x_0)^2 + (y - y_0)^2}{2\sigma^2}\right) + B(x, y) + \mathcal{N}(0, \sigma_n)$$
  where $\sigma \approx 1.2\text{ px}$ represents the optical blur circle, $B(x, y)$ simulates background sky glow, and $\mathcal{N}$ represents sensor thermal noise.

---

## 3. Implementation Plan

1. **Create Vision Engine Directory Structure:**
   - `app/src/engines/vision/types.ts`
   - `app/src/engines/vision/frameAcquisition.ts`
   - `app/src/engines/vision/syntheticStarfield.ts`
   - `app/src/engines/vision/index.ts`
2. **Wire Camera Shutter in `CameraViewfinder.tsx`:**
   - Attach `CameraViewRef` to `<CameraView>`.
   - Add a circular astronomical Shutter Button with visual pulse animation.
   - Add a "Test Starfield" (⚡ Benchmark) button to instantly acquire synthetic asterisms.
   - Display a floating Captured Frame Tray showing the latest frame thumbnail, resolution, and synced orientation.
3. **Verify Bundle and Types:**
   - Execute `npx tsc --noEmit`.
   - Verify bundle export for web (`npx expo export --platform web`).
   - Verify bundle export for Android (`npx expo export --platform android`).
4. **Documentation Updates:**
   - Update `research/notes/Phase-2/README.md`, `docs/roadmap.md`, and project `README.md`.
