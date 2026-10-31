# Step 6: Star Candidate Debug Overlay & Real-Time Visual Verification (In Progress 🔄)

## Objective
Design and implement the real-time visual inspection and debug overlay system for the Lumina Lens Vision Engine. Project detected star candidates directly onto the live camera viewfinder and captured frame previews, rendering sub-pixel targeting reticles, intensity badges, Point Spread Function (PSF) bounding circles, and astrometric summary diagnostics to verify star extraction accuracy and calibrate detection sensitivity in real time.

---

## 1. Context & Astronomical Motivation

Through **Phase 2 Steps 1 to 5**, we constructed the core computational stages of the computer vision pipeline:
1. **Step 1 & 2:** High-frame-rate camera streaming, resolution presets, and GPS/orientation synchronization.
2. **Step 3:** ITU-R BT.709 photopic luminance conversion ($Y$), CMOS hot-pixel removal, and separable $3 \times 3$ binomial Gaussian smoothing.
3. **Step 4:** Tiled mesh background estimation ($B$), continuous bilinear surface interpolation, and CFAR adaptive thresholding ($T = B + k\sigma$).
4. **Step 5:** 8-connected component clustering, sub-pixel center-of-mass centroiding $(x_c, y_c)$, and second-order moment morphological filtering (FWHM, ellipticity $\varepsilon \le 0.55$).

### The Need for Visual Ground-Truth Verification
Before moving to **Phase 3 (Plate Solving & Asterism Pattern Matching)**, the computer vision engine must be visually verified against real and synthetic skies. In astrophotography and plate solving:
- **Under-detection:** If the detection threshold $k$ is too strict or minimum flux is too high, faint navigation stars are missed, leaving insufficient centroids ($\le 4$) to form distinctive asterism triangles for plate solving.
- **Over-detection & False Positives:** If noise suppression is too lenient, high-gain CMOS thermal noise or streetlamp glare creates spurious centroids, causing geometric hash collisions in triangle databases.
- **Centroid Misalignment:** Subtle sub-pixel offsets caused by uncompensated sensor aspect ratio scaling or coordinate projection errors will silently distort angular distances between stars.

An interactive, responsive **Debug Overlay Layer** bridges algorithmic extraction and human visual inspection, allowing developers and stargazers to immediately verify:
1. Are reticle centers accurately aligned with the optical peak of every visible star?
2. Are faint stars being picked up without admitting skyglow noise?
3. Are non-stellar artifacts (airplane streaks, satellites, lens flares) successfully rejected?

---

## 2. Mathematical Formulations & Coordinate Transformations

### A. Coordinate Space Mapping (Sensor Pixel Buffer $\to$ Viewport Screen)
The Vision Engine processes frames in a discrete sensor coordinate space of dimensions $(W_{\text{frame}}, H_{\text{frame}})$ (e.g. $1920 \times 1080$ or $800 \times 600$). The mobile UI renders on a device viewport screen of dimensions $(W_{\text{view}}, H_{\text{view}})$ with pixel density $d$.

To render overlay reticles exactly over target stars, sub-pixel coordinates $(x_c, y_c)$ must be mapped to display coordinates $(X_{\text{screen}}, Y_{\text{screen}})$:

```text
  Sensor Coordinate Space (W_frame x H_frame)
  ┌──────────────────────────────────────────────┐
  │  ★ (x_c, y_c)                                │
  │                                              │
  │                   AspectRatio = W_f / H_f    │
  └──────────────────────────────────────────────┘
                         │
                         ▼  Aspect Ratio Transform
  ┌──────────────────────────────────────────────┐
  │  Display Viewport (W_view x H_view)          │
  │     (X_screen, Y_screen)                     │
  │                                              │
  └──────────────────────────────────────────────┘
```

For a `resizeMode="cover"` or `resizeMode="contain"` presentation:

1. **Uniform Scale Factor:**
   $$s = \begin{cases} 
   \max\left(\frac{W_{\text{view}}}{W_{\text{frame}}}, \frac{H_{\text{view}}}{H_{\text{frame}}}\right) & \text{for "cover"} \\
   \min\left(\frac{W_{\text{view}}}{W_{\text{frame}}}, \frac{H_{\text{view}}}{H_{\text{frame}}}\right) & \text{for "contain"}
   \end{cases}$$

2. **Centering Offsets:**
   $$\Delta x = \frac{W_{\text{view}} - (W_{\text{frame}} \cdot s)}{2}, \quad \Delta y = \frac{H_{\text{view}} - (H_{\text{frame}} \cdot s)}{2}$$

3. **Screen Projection:**
   $$X_{\text{screen}} = x_c \cdot s + \Delta x$$
   $$Y_{\text{screen}} = y_c \cdot s + \Delta y$$

---

### B. Dynamic Reticle Scaling by Apparent Brightness
To reflect stellar brightness intuitively:
- Bright stars ($V < 1.0$, high flux $F$) produce larger Airy disk footprints and dominate visual attention.
- Faint stars ($V > 4.0$, low flux $F$) have compact PSFs.

The reticle outer radius $R_{\text{reticle}}$ scales dynamically with logarithmic integrated flux $F$:

$$R_{\text{reticle}} = \operatorname{clamp}\left(R_{\text{min}}, R_{\text{max}}, R_0 + \gamma \log_{10}\left(\frac{F}{F_{\text{threshold}}}\right)\right)$$

where default constants are $R_{\text{min}} = 10\text{ px}$, $R_{\text{max}} = 28\text{ px}$, $R_0 = 12\text{ px}$, and $\gamma = 6.0$.

---

### C. Astronomical Color Coding (Night-Vision Compliant)
To protect human dark adaptation while maintaining diagnostic clarity:
- **Standard Mode:**
  - Validated Star Reticle: `#38bdf8` (Cyan/Sky-Blue, high contrast against dark night sky)
  - Bright Stars ($F > 5000$): `#f59e0b` (Amber Gold)
  - Centroid Crosshair: `#ffffff` (Pure White, sub-pixel center)
  - Diagnostic Badges: Semi-transparent slate pill (`rgba(15, 23, 42, 0.75)`)
- **Astro Red Night Vision Mode:**
  - Validated Star Reticle: `#ef4444` (Deep Crimson Red, $> 620\text{ nm}$, zero rod rhodopsin bleaching)
  - Centroid Crosshair: `#fca5a5` (Soft Light Red)
  - Diagnostic Badges: Dark ruby background (`rgba(45, 10, 10, 0.85)`) with crimson border

---

## 3. UI/UX Component Architecture

```text
CameraViewfinder / Preview Screen
 ├── Camera Feed / Captured Image Frame
 └── StarOverlayCanvas (Absolute Fill Overlay)
      ├── SVG / Canvas Layer (Precision Graphics)
      │    ├── Reticle Rings (Radius ∝ log(Flux))
      │    ├── Crosshairs (Sub-pixel center [x_c, y_c])
      │    └── Ellipticity Orientation Axes
      ├── Interactive Touch Targets
      │    └── Tap on Star Reticle -> Highlights profile card
      └── HUD Diagnostics Summary Badge
           ├── Star Count (e.g., "⭐ 12 Stars Detected")
           ├── Average FWHM (e.g., "FWHM: 3.8px")
           ├── Sky Noise Floor (e.g., "σ: 1.25")
           └── Processing Latency (e.g., "⚡ 30ms")
```

---

## 4. Subsystem Architecture & Phased Rollout Plan

To ensure modularity and high rendering performance on mobile devices, Step 6 is divided into three distinct parts:

```text
  ┌─────────────────────────────────────────────────────────┐
  │ PART 1: Overlay Projection & Reticle Component          │
  │ • Coordinate projection transform (Frame -> Screen)     │
  │ • SVG StarOverlay component with sub-pixel crosshairs   │
  │ • Dynamic radius scaling based on integrated flux       │
  └──────────────────────────┬──────────────────────────────┘
                             │ StarOverlay Component
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │ PART 2: Interactive Diagnostics & Filter Controls       │
  │ • Tappable star reticle inspection (shows flux, FWHM)   │
  │ • Live display toggles (Show Reticles, Flux, Mag)       │
  │ • Astro Red Night-Vision mode styling                   │
  └──────────────────────────┬──────────────────────────────┘
                             │ Interactive Canvas
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │ PART 3: Full Viewfinder Integration & Phase 2 Sign-off  │
  │ • Wire overlay into CameraViewfinder.tsx                │
  │ • Verify across Orion, Summer Triangle, and Cassiopeia  │
  │ • Performance profiling (maintain 60 FPS UI thread)     │
  │ • Phase 2 complete verification & documentation update  │
  └─────────────────────────────────────────────────────────┘
```

- **Part 1:** Screen-Space Coordinate Projection & SVG Star Overlay (`StarOverlay.tsx` / `types.ts`).
- **Part 2:** Interactive Star Inspector, Diagnostic HUD Badges, and Red Night Vision Support.
- **Part 3:** Viewfinder Integration, End-to-End Multi-Asterism Verification, and Phase 2 Final Sign-Off.

---

## 5. Verification & Validation Metrics

| Test Criterion | Baseline Requirement | Target Metric |
| :--- | :--- | :--- |
| **Projection Alignment** | Alignment between visual star center and rendered reticle | $\Delta \le 0.5\text{ px}$ display offset |
| **Touch Target Precision** | Tapping a star reticle opens its candidate diagnostic card | $100\%$ responsive across touch targets |
| **Rendering Latency** | SVG overlay render time for $\le 50$ star reticles | $\le 4\text{ ms}$ on mobile JS thread |
| **Dark Adaptation** | Full compliance with Red Night Vision mode in dark mode | All overlay elements shift to $> 620\text{ nm}$ red spectrum |
| **Asterism Validation** | Ground-truth visual alignment on Orion, Summer Triangle, Cassiopeia | Correct identification and reticle placement on all major stars |
