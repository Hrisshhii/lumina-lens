# Phase 2 — Computer Vision & Star Detection

## Objective
Transform the smartphone camera into an astronomical point-source detector.
The primary goal of Phase 2 is:
> **Capture live night-sky camera frames, eliminate sensor noise and atmospheric glow, and extract high-precision sub-pixel $(x, y)$ coordinates and brightness metrics for all visible star centroids.**

In Phase 1, we calculated where stars *should* be theoretically based on GPS coordinates, time, and the Hipparcos catalog. In Phase 2, we build the computer vision pipeline that detects where stars *actually* appear on the physical camera sensor in real time, delivering the $(x, y)$ coordinate points required for **Phase 3 (Plate Solving & Asterism Pattern Matching)**.

---

## Phase 2 Plan

1. [ ] **Step 1: Camera Access & Live Viewfinder:** Integrate `expo-camera`, configure camera hardware permissions, and build a full-screen live viewfinder with low-light/night-sky camera settings.
2. [ ] **Step 2: Night-Sky Frame Acquisition & Resolution Configuration:** Capture high-resolution frames, manage aspect ratios, and format raw pixel buffers for real-time analysis.
3. [ ] **Step 3: Image Preprocessing (Grayscale & Noise Reduction):** Convert color frames to single-channel luminance and apply spatial filters (Gaussian / median blur) to suppress sensor thermal noise and dead pixels.
4. [ ] **Step 4: Background Estimation & Adaptive Luminance Thresholding:** Dynamically estimate local sky background gradients (light pollution, moon glow) and apply adaptive thresholding ($T = \mu + k\sigma$) to isolate point-light sources.
5. [ ] **Step 5: Star Blob Detection & Sub-Pixel Centroid Extraction:** Detect connected components / light blobs and compute intensity-weighted centers of mass (sub-pixel centroid extraction $(x_c, y_c)$ and flux $I$).
6. [ ] **Step 6: Star Candidate Debug Overlay & Verification:** Render real-time reticle circles and intensity badges over detected stars on top of the live viewfinder to visually verify extraction accuracy.

---

## Phase 2 Step Documentation

- [Step 1: Camera Access & Live Viewfinder](./step-1:%20camera%20integration.md)
- [Step 2: Night-Sky Frame Acquisition](./step-2:%20night-sky%20frame%20acquisition.md) *(Upcoming)*
- [Step 3: Image Preprocessing](./step-3:%20image%20preprocessing.md) *(Upcoming)*
- [Step 4: Background Estimation & Adaptive Thresholding](./step-4:%20background%20estimation%20&%20thresholding.md) *(Upcoming)*
- [Step 5: Star Blob Detection & Centroid Extraction](./step-5:%20star%20centroid%20extraction.md) *(Upcoming)*
- [Step 6: Star Candidate Debug Overlay](./step-6:%20star%20candidate%20debug%20overlay.md) *(Upcoming)*

---

## Computer Vision Pipeline Architecture

```text
               Live Camera Sensor (Physical Night Sky)
                                 │
                                 ▼
                     Step 1 & 2: Frame Acquisition
                     (CameraViewfinder / Pixel Buffer)
                                 │
                                 ▼
                    Step 3: Preprocessing Layer
                  • RGB → Monochromatic Luminance (Y)
                  • Gaussian / Median Spatial Filter
                                 │
                                 ▼
                    Step 4: Segmentation Layer
                  • Local Background Surface Estimation (B)
                  • Net Intensity Calculation: ΔI = I - B
                  • Adaptive Statistical Threshold: T = μ_bg + k·σ_bg
                                 │
                                 ▼
                   Step 5: Centroid Extraction Layer
                  • Connected-Component Labeling (Blobs)
                  • Intensity-Weighted Center of Mass:
                        x_c = Σ(x · I) / Σ(I)
                        y_c = Σ(y · I) / Σ(I)
                  • Total Integrated Flux: F = Σ(I)
                                 │
                                 ▼
                    Step 6: Star Candidate Array
                  [ { x: 342.4, y: 812.1, flux: 1250 }, ... ]
                                 │
                                 ▼
             Input to Phase 3 (Plate Solving & Asterism Matching)
```

---

## Phase 2 Success Condition

At the end of Phase 2, Lumina Lens should be capable of:
1. Opening the camera viewfinder with night-sky low-light exposure parameters.
2. Capturing a night-sky frame (or synthetic starfield benchmark).
3. Extracting point-light sources from the image within milliseconds.
4. Outputting sub-pixel centroid coordinates $(x, y)$ accurate to $\pm 0.2\text{ px}$ with visual verification overlay circles.