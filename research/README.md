# Lumina Lens Research & Engineering Notes

This directory contains the foundational research, technical feasibility analyses, and step-by-step engineering logs for **Lumina Lens**.

---

## 📁 Directory Organization

```text
research/
├── notes/
│   ├── Phase-0.md                  # Comprehensive astronomy & engineering fundamentals
│   └── Phase-1/                    # Step-by-step implementation logs for Phase 1
│       ├── README.md               # Phase 1 master overview, architecture & checklist
│       ├── step-1: verify git repository.md
│       ├── step-2: create mobile application.md
│       ├── step-3: start expo development server.md
│       ├── step-4: add web support.md
│       ├── step-5: astronomy engine v1.md
│       ├── step-6: hipparcos catalog integration.md
│       ├── step-7: connect mobile app to visible stars api.md
│       ├── step-8: star identity & metadata.md
│       └── step-9: sensor engine.md
├── Backend-Architecture-analysis.md # Detailed backend subsystem analysis
├── Frontend-Architecture-analysis.md # Detailed frontend subsystem analysis
└── Frontend-Bankend-comms-analysis.md # API contracts & integration analysis
```

---

## 🌌 Core Research Modules (Phase 0)

Read [notes/Phase-0.md](notes/Phase-0.md) for in-depth coverage of:

1. **Astronomy Fundamentals:**
   - Celestial Sphere, Right Ascension (RA), Declination (Dec).
   - Topocentric coordinate transformations (Altitude & Azimuth).
   - Stellar magnitudes, spectral classes, and proper motion.

2. **Astronomical Catalogs:**
   - Hipparcos Catalog (~118,000 astrometric stars).
   - Gaia DR3 catalog (~1.8 billion high-precision sources).
   - Messier and NGC deep-sky catalogs.

3. **Phone Sensors & Spatial Geometry:**
   - GPS positioning, Magnetometer compass headings, Accelerometer pitch and tilt.
   - Sensor fusion and low-pass filtering.
   - Camera projection geometry (FOV, focal length, pixel planes).

4. **Computer Vision & Star Extraction:**
   - Grayscale conversion, adaptive noise reduction, thresholding.
   - Blob detection and intensity-weighted centroid calculations.

5. **Plate Solving & Asterism Matching:**
   - Scale-invariant triangle invariants and geometric hashes.
   - Spatial indexing (Kd-trees) for lost-in-space star identification.

6. **AI Layer:**
   - Contextual astrophysical narratives, comparisons, and conversational reasoning.

---

## 🚀 Phase 1 Implementation Logs

Read [notes/Phase-1/README.md](notes/Phase-1/README.md) for the active engineering progression:
- **Steps 1–4:** React Native / Expo foundation and cross-platform setup.
- **Steps 5–6:** Astronomy Engine with Skyfield, JPL `de421.bsp`, and vectorized Hipparcos catalog computation.
- **Step 7:** Mobile client connection to `/sky/visible` with dark-sky theme UI.
- **Step 8:** Star Identity & Metadata layer (`/stars/{hip_id}`, `StarService`, and `StarDetailModal`).
- **Step 9:** Sensor Engine (`expo-location` GPS coordinates and `expo-sensors` real-time Orientation HUD).
- **Steps 10–11 (Next):** Debug sky visualization and ephemeris prediction verification.
