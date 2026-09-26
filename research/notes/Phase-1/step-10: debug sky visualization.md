# Step 10: Debug Sky Visualization

## Objective
Build a 2D celestial radar / dome view to visualize stars above the observer's horizon, mapping local topocentric coordinates ($\text{Alt/Az}$) onto an interactive polar projection, with orientation HUD integration and direct link to the star profile metadata modal.

---

## 1. Mathematical Projection (Celestial Sphere to 2D Polar Canvas)

Local observer coordinates returned by the Astronomy Engine are:
- **Altitude ($\text{Alt}$)**: Elevation angle from horizon ($0^\circ$) to zenith ($90^\circ$).
- **Azimuth ($\text{Az}$)**: Compass bearing where $0^\circ = \text{North}$, $90^\circ = \text{East}$, $180^\circ = \text{South}$, and $270^\circ = \text{West}$.

### Coordinate Transformation:
Given a dome center $(c_x, c_y)$ and usable radius $R_{\text{usable}}$:

1. **Radial distance from Zenith**:
   $$r = R_{\text{usable}} \times \left(1 - \frac{\text{Alt}}{90^\circ}\right)$$
   - $\text{Alt} = 90^\circ$ (Zenith) $\implies r = 0$ (exact center).
   - $\text{Alt} = 0^\circ$ (Horizon) $\implies r = R_{\text{usable}}$ (outer boundary circle).

2. **Cartesian Projection**:
   In standard navigation compass bearings:
   $$\theta = (\text{Az} - 90^\circ) \times \frac{\pi}{180}$$
   $$x = c_x + r \cdot \cos(\theta)$$
   $$y = c_y + r \cdot \sin(\theta)$$

   - $\text{Az} = 0^\circ$ (North): $\theta = -90^\circ \implies x = c_x, y = c_y - r$ (top).
   - $\text{Az} = 90^\circ$ (East): $\theta = 0^\circ \implies x = c_x + r, y = c_y$ (right).
   - $\text{Az} = 180^\circ$ (South): $\theta = 90^\circ \implies x = c_x, y = c_y + r$ (bottom).
   - $\text{Az} = 270^\circ$ (West): $\theta = 180^\circ \implies x = c_x - r, y = c_y$ (left).

---

## 2. Component Architecture (`SkyDomeView.tsx`)

Implemented in `app/src/components/SkyDomeView.tsx`:

```text
SkyDomeView
├── Filter Chips Bar (All, Named Stars, Mag ≤ 2.5, Mag ≤ 4.0)
├── 2D Radar Canvas (Circular dome with responsive diameter)
│   ├── Outer Horizon Ring (Alt = 0°)
│   ├── 30° & 60° Altitude Dashed Reference Rings
│   ├── Cardinal Crosshair Axes (N-S, E-W)
│   ├── Cardinal Direction Badges (N 0°, E 90°, S 180°, W 270°)
│   ├── Zenith Center Marker (Alt = 90°)
│   ├── Plotted Star Nodes
│   │   ├── Touch Target (28×28 with hitSlop)
│   │   ├── Magnitude-based dot sizing (2.5px to 8px)
│   │   ├── Glow halo for brightest stars (V < 1.5)
│   │   ├── Active Selection indicator ring
│   │   └── Prominent star name tags (Sirius, Vega, Rigel, etc.)
│   └── Live Device Aim Reticle (orientation tracking phone pointing vector)
└── Legend & Guidelines Card
```

---

## 3. Sensor Engine & Orientation Reticle Integration

When live orientation sensors are available (`orientation.available === true`), the component projects the phone's physical pointing angle into the celestial dome:
- **Heading**: Maps to azimuth angle $\text{Az}$.
- **Elevation**: Maps to altitude $\text{Alt}$.
- If $\text{Alt} > 0^\circ$ (phone tilted toward sky), a dashed cyan crosshair reticle labeled `AIM` renders at the projected coordinate, showing the user what stars are directly in front of the phone.

---

## 4. View Mode Switcher in `App.tsx`

`App.tsx` was enhanced with a top-level segmented toggle bar:
- **🌌 Celestial Dome**: Interactive 2D radar view.
- **📋 Star List**: Traditional flat list sorted by brightness.
- Both modes share live GPS coordinates, orientation HUD, pull-to-refresh, and trigger `StarDetailModal` on star click/tap.

---

## 5. Verification Results

1. **Static Analysis & Types**:
   - `npx tsc --noEmit` $\implies$ 0 errors (clean strict compilation).
2. **Web Bundle**:
   - `npx expo export --platform web` $\implies$ 391 modules bundled in 944ms.
3. **Android Hermes Bundle**:
   - `npx expo export --platform android` $\implies$ 1127 modules bundled in 10564ms (2.8MB Hermes bytecode).

---

# Step 10 Status: ✅ IMPLEMENTED (build + integration verified)

<b>Date:</b> September 25, 2026

The Debug Sky Visualization is fully implemented and wired into the app.
The complete flow now works end-to-end:

```text
GET /sky/visible (stars with Altitude + Azimuth)
        ↓
SkyDomeView (2D polar projection dome)
        ↓
Tap any plotted star → onSelectStar(hip)
        ↓
StarDetailModal (Step 8 identity & metadata)
```

## Changes Made (3 app commits + 3 docs commits)

### 1. `app/src/components/SkyDomeView.tsx` — New component (534 lines, commit df30356)
- Props: `stars`, `orientation`, `onSelectStar`, `selectedHipId`.
- Responsive dome: adapts to screen width (280-400px) with 22px inset.
- Polar projection: r = usableRadius x (1 - alt/90); angle = (az - 90) deg;
  x = cx + r*cos(angle); y = cy + r*sin(angle) — N top, E right, S bottom, W left.
- Filter chips bar: All (with count), Named Stars, Mag ≤ 2.5, Mag ≤ 4.0
  (accent colors: blue / amber / sky / indigo).
- Dome canvas layers: radar background glow, outer horizon ring (Alt = 0),
  dashed 30° and 60° altitude rings, N-S / E-W crosshair axes, cardinal
  direction badges, zenith center marker.
- Star nodes: magnitude-tiered dot size and color (bright < 1.5 → 8px white
  + glow halo, mid < 3.5 → 4px, faint → 2.5px), 28×28 touch targets with
  hitSlop, cyan selection ring for the active star, name tags for named /
  selected / very bright stars, zIndex layering.
- Live device aim reticle: dashed cyan ring + crosshair + AIM label rendered
  at the projected (heading, elevation) position whenever orientation sensors
  are available and the phone is tilted above the horizon; pointerEvents none
  so it never blocks star taps.
- Legend card: Celestial Radar Guide with brightness legend and usage hints,
  plus live filtered / total star counts.

### 2. `app/App.tsx` — View mode integration (commits 79b9b8a, ea160bd)
- Added `viewMode` state: "dome" | "list" (defaults to dome).
- Imported `SkyDomeView` and wired it into the main content switch.
- Segmented toggle bar: 🌌 Celestial Dome / 📋 Star List, plus a Refresh button.
- Both modes share live GPS, the orientation HUD, loading / error states and
  `StarDetailModal`; the dome receives `onSelectStar={handleStarPress}` and
  `selectedHipId` so a tap opens the Step 8 profile modal and the selection
  ring tracks the currently open star.

### 3. Docs commits (66b8458, c841de8, 033c7c5)
- This step note, Phase-1 README checklist (Step 10 marked [x]) and
  docs/roadmap.md (Step 10 marked complete with implementation details).

## Verification Performed
- `npx tsc --noEmit` → passes (strict mode, 0 errors).
- `npx expo export --platform web` → 391 modules bundled in 944ms.
- `npx expo export --platform android` → 1127 modules in 10564ms (2.8MB Hermes bytecode).
- Git working tree clean; all changes committed and pushed to origin/main
  (HEAD 033c7c5).

## What This Achieves (Step 10 goal met)
- The visible sky is no longer only a text list — it is now an interactive
  2D radar map of the whole dome.
- Mathematically correct polar projection with verified cardinal directions.
- The live phone-pointing reticle overlays the dome (Step 9 sensor engine
  integration inside the visualization).
- Fully interactive: tap any plotted star to open its profile (Step 8).
- Magnitude / named-star filters declutter the dome on demand.

## Next After This Step
- **Step 11: Astronomical Prediction Verification** — cross-check backend
  predictions against Stellarium / SkyView for known observers; completing
  this step finalizes Phase 1.
