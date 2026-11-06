# Phase 3 — Plate Solving & Geometric Pattern Recognition

## Objective
Transform extracted sub-pixel star centroids $(x, y)$ from physical camera frames into astronomical celestial coordinates $(\text{RA}, \text{Dec})$ and solve the exact camera pointing attitude, orientation quaternion, and Field of View (FOV).

The primary goal of Phase 3 is:
> **Solve the "Lost-in-Space" problem by matching observed star asterism geometry against the Hipparcos reference catalog in real time, determining the camera's precise celestial coordinates without requiring any initial sensor pointing priors.**

In Phase 1, we calculated topocentric positions from ephemeris tables and sensor headings. In Phase 2, we extracted sub-pixel star centroids $(x_c, y_c)$ from sensor frames. In Phase 3, we build the mathematical and computational plate-solving engine that bridges the two worlds.

---

## Phase 3 Step Breakdown

1. [ ] **Step 1: Asterism Generation & Geometric Invariants (Triangle Descriptors):**  
   Generate scale-invariant, rotation-invariant geometric hashes from star centroid triplets (angles, side ratios, perimeter invariants).
2. [ ] **Step 2: Catalog Asterism Precomputation & Spatial Indexing:**  
   Pre-compute reference asterisms from the Hipparcos catalog and index them into a compact Kd-tree / spatial hash grid for sub-millisecond lookup.
3. [ ] **Step 3: Asterism Matching & Lost-in-Space Hypothesis Verification:**  
   Implement geometric hash querying, nearest-neighbor matching, and voting/RANSAC hypothesis testing to filter out false pairings and identify true matches.
4. [ ] **Step 4: Camera Attitude Determination & WCS Astrometric Calibration:**  
   Calculate the camera attitude matrix / quaternion using the Davenport q-method / Wahba's problem (SVD/Kabsch algorithm) and solve true Field of View (FOV).
5. [ ] **Step 5: Dynamic Celestial Grid & Constellation Projection:**  
   Project World Coordinate System (WCS) celestial coordinate grids and constellation asterism lines onto the live camera sensor plane.
6. [ ] **Step 6: Plate Solving Debug Visualizer & Real-Time Performance Benchmarking:**  
   Render interactive plate-solving match vectors, matched catalog overlays, and runtime diagnostics HUD on top of the live viewfinder.

---

## Plate Solving Pipeline Architecture

```text
    Detected Centroids [(x_0, y_0), (x_1, y_1), ...]  (from Phase 2)
                           │
                           ▼
             Step 1: Triangle Asterism Extraction
        • Delaunay triangulation / k-nearest triplets
        • Side lengths: d_12, d_23, d_31
        • Geometric invariants: L2/L1, L3/L1, interior angles
                           │
                           ▼
             Step 2 & 3: Catalog Hash Matching
        • Query indexed Hipparcos asterism Kd-tree
        • Candidate match filtering & geometric tolerances
        • RANSAC consensus verification (≥ 4 star agreement)
                           │
                           ▼
             Step 4: Camera Pose & WCS Calibration
        • Wahba's problem / Singular Value Decomposition (SVD)
        • Orientation Quaternion & Rotation Matrix R
        • Boresight pointing: (RA_center, Dec_center), Roll, FOV
                           │
                           ▼
             Step 5 & 6: Celestial Overlay & Verification
        • Camera pixel plane ↔ Celestial sphere mapping
        • Constellation stick-figure & catalog star alignment
        • Real-time plate solving HUD & verification tests
```

---

## Phase 3 Success Conditions

1. **Sub-second Identification:** Complete cold-start lost-in-space plate solving in $< 500\text{ ms}$ on mobile hardware.
2. **Robustness to Noise:** Successfully match fields with up to $20\%$ spurious false centroids or missing stars.
3. **High Astrometric Precision:** Pointing solution $(\text{RA}, \text{Dec})$ accurate to within $< 0.1^\circ$ ($6\text{ arcmin}$).
4. **Field of View (FOV) Agnostic:** Automatically converge on optical FOV between $30^\circ$ and $80^\circ$ without manual calibration.

