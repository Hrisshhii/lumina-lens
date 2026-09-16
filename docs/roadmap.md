# Lumina Lens Project Roadmap

This document outlines the multi-phase journey of **Lumina Lens**, from initial astronomical research to an autonomous, real-time AI celestial identification system.

---

## 🧭 Milestone Overview

| Phase | Focus Area | Status | Key Deliverable |
|:---|:---|:---|:---|
| **Phase 0** | Research & Architecture | ✅ **Completed** | Mathematical foundations, catalog research, system blueprint |
| **Phase 1** | Foundation & Sky Prediction | 🔄 **In Progress** | Working mobile app, live GPS, orientation HUD, Skyfield ephemeris, star profiles |
| **Phase 2** | Computer Vision & Star Detection | ⏳ **Planned** | Camera frame capture, noise filtering, blob detection, centroid extraction |
| **Phase 3** | Plate Solving & Pattern Matching | ⏳ **Planned** | Triangle asterism matching, lost-in-space solver, camera pose determination |
| **Phase 4** | Augmented Reality & Constellations | ⏳ **Planned** | Real-time AR overlay, constellation lines, interactive celestial dome |
| **Phase 5** | Deep Sky Objects & AI Assistant | ⏳ **Planned** | Messier/NGC catalogs, LLM-powered astronomical conversational companion |
| **Phase 6** | Offline Mode & Astrophotography | ⏳ **Planned** | Fully on-device catalog database, long-exposure image stacking |

---

## Phase 0: Research & Architecture (Completed ✅)

- [x] Research celestial coordinate systems (Right Ascension, Declination vs. local Altitude, Azimuth).
- [x] Compare astronomical star catalogs (Hipparcos vs. Gaia vs. Tycho-2).
- [x] Evaluate Python astronomy libraries (Skyfield vs. Astropy).
- [x] Research smartphone hardware sensors (GPS, Magnetometer, Accelerometer, Gyroscope).
- [x] Research camera coordinate geometry and field of view (FOV) projections.
- [x] Survey computer vision star extraction techniques (grayscale, thresholding, blob centroids).
- [x] Study plate solving algorithms (triangle invariants, geometric hashing).
- [x] Design core system architecture and engine boundaries.

---

## Phase 1: Foundation & Sky Prediction (Current Phase 🔄)

**Objective:** Predict which stars are visible in the night sky given user GPS coordinates and current time, display them in an interactive mobile application, and track device orientation.

- [x] **Step 1: Verify Git Repository:** Verified GitHub remote repository and clean working tree.
- [x] **Step 2: Create Mobile Application:** Initialized Expo React Native project with TypeScript.
- [x] **Step 3: Start Expo Development Server:** Configured Metro bundler and mobile runtime environment.
- [x] **Step 4: Add Web Support:** Configured `react-native-web` and `react-dom` for browser execution.
- [x] **Step 5: Astronomy Engine v1:** Implemented Skyfield ephemeris calculations with JPL `de421.bsp`.
- [x] **Step 6: Hipparcos Catalog Integration:** Integrated ~5,000 naked-eye stars ($V \le 6.0$) with vectorized altitude/azimuth computation.
- [x] **Step 7: Connect Mobile App to Visible Stars API:** Built dark night-sky theme UI, connecting `App.tsx` to `GET /sky/visible`.
- [x] **Step 8: Star Identity & Metadata Layer:** Implemented `GET /stars/{hip_id}`, `StarService` metadata enrichment, and the interactive `StarDetailModal` component.
- [x] **Step 9: Sensor Engine:** Built `location.ts` (live GPS permissions & coordinates via `expo-location`) and `orientation.ts` (real-time heading & elevation HUD via `expo-sensors`).
- [ ] **Step 10: Debug Sky Visualization:** Build a 2D celestial dome / radar plot showing star positions relative to the horizon and cardinal directions.
- [ ] **Step 11: Astronomical Prediction Verification:** Cross-reference calculations against Stellarium / SkyView for accuracy validation.

---

## Phase 2: Computer Vision & Star Detection (Planned ⏳)

**Objective:** Capture live camera frames, eliminate background noise, and accurately extract sub-pixel $(x, y)$ coordinates of visible stars.

- [ ] Mobile camera integration with high-frame-rate streaming.
- [ ] Grayscale conversion and dynamic contrast normalization.
- [ ] Background noise reduction (Gaussian blur / median filtering).
- [ ] Adaptive luminance thresholding to isolate point-light sources.
- [ ] Connected-component labeling / blob detection.
- [ ] Sub-pixel centroid calculation using intensity-weighted centers of mass.
- [ ] Cloud, satellite, and aircraft filtering.

---

## Phase 3: Plate Solving & Pattern Recognition (Planned ⏳)

**Objective:** Match observed star centroids with catalog star positions without prior knowledge of camera direction.

- [ ] Generate scale-invariant triangle asterisms from star centroids.
- [ ] Pre-calculate and index catalog triangle fingerprints into a spatial Kd-tree.
- [ ] Implement fast geometric hash lookups to match observed triangles against catalog asterisms.
- [ ] Solve camera orientation quaternion, precise center coordinates $(\text{RA}, \text{Dec})$, and Field of View (FOV).
- [ ] Align celestial coordinate grid with camera pixel plane.

---

## Phase 4: Augmented Reality & Constellations (Planned ⏳)

**Objective:** Project real-time celestial graphics, constellation lines, and tappable object pins directly onto the live camera viewfinder.

- [ ] High-performance rendering pipeline using React Native Skia / WebGL.
- [ ] Constellation stick-figure connections and boundaries (IAU 88 constellations).
- [ ] Dynamic star reticles sized by apparent brightness ($V$ magnitude).
- [ ] Smooth sensor-fused motion tracking (gyroscope + accelerometer + camera optical flow).
- [ ] Interactive tapping on camera screen to inspect any star in view.

---

## Phase 5: Deep Sky Objects & AI Assistant (Planned ⏳)

**Objective:** Expand database to deep-space objects and introduce an intelligent conversational astronomy companion.

- [ ] Ingestion of the Messier catalog (110 galaxies, nebulae, and star clusters).
- [ ] Ingestion of the New General Catalogue (NGC).
- [ ] Conversational AI assistant interface (natural language explanations).
- [ ] Context-aware prompting (injects currently observed stars into the LLM context).
- [ ] Comparative astronomy ("How does Betelgeuse compare to our Sun?").

---

## Phase 6: Offline Engine & Astrophotography (Planned ⏳)

**Objective:** Enable fully disconnected wilderness use and advanced low-light photography.

- [ ] SQLite / WatermelonDB on-device star catalog storage.
- [ ] On-device C++/Rust compiled ephemeris and plate-solving engine.
- [ ] Night-vision red UI mode to preserve dark adaptation.
- [ ] Multi-frame image stacking to reveal faint stars and nebulae.
