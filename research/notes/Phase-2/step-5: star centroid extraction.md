# Step 5: Star Blob Detection & Sub-Pixel Centroid Extraction (In Progress 🔄)

## Objective
Design and implement the astronomical point-source extraction and sub-pixel localization pipeline for the Lumina Lens Vision Engine. Transform the binary candidate star mask and gradient-flattened net luminance buffer ($\Delta Y$) from Step 4 into an astrometrically calibrated catalog of detected star candidates, calculating sub-pixel centroid coordinates $(x_c, y_c)$, integrated luminous flux ($F$), Full Width at Half Maximum ($\text{FWHM}$), and Point Spread Function (PSF) morphological parameters to reject non-stellar artifacts.

---

## 1. Context & Astronomical Motivation

In **Phase 2 Step 4**, we implemented local mesh background modeling and adaptive CFAR thresholding. This eliminated urban light pollution domes and sensor vignetting, yielding:
1. A **net luminance buffer** $\Delta Y(x, y) = \max(0, Y - B)$ with skyglow subtracted to near-zero ($\mu_{\text{net}} < 0.5$).
2. A **binary star candidate mask** $\text{Mask}(x, y) \in \{0, 1\}$ flagging pixels exceeding the local statistical noise threshold ($Y > B + k\sigma$).

However, a raw binary mask only identifies isolated "hot" pixels. Before celestial plate solving (Phase 3) can match observed stars with the Hipparcos catalog, we must extract **precise sub-pixel coordinates** and **photometric properties**:

### 1. The Astrometric Need for Sub-Pixel Precision
In wide-field smartphone astrophotography, typical camera lenses provide an angular Field of View (FOV) of $60^\circ\text{--}75^\circ$. Across a $1080\text{p}$ ($1920 \times 1080$) sensor:

$$\text{Pixel Scale} \approx \frac{60^\circ}{1920\text{ px}} \approx 0.03125^\circ/\text{px} \approx 112.5\text{ arcseconds/pixel}$$

- If star positions were restricted to integer pixel coordinates $(x, y) \in \mathbb{Z}^2$, a quantization error of just $\pm 0.5\text{ px}$ would introduce an angular uncertainty of $\approx 56\text{ arcseconds}$ ($\approx 1\text{ arcminute}$).
- When generating triangle asterism invariants in Phase 3, this large angular error causes geometric hash collisions and false identification.
- By computing the **intensity-weighted center of mass**, we achieve sub-pixel centroid precision of $\pm 0.05\text{--}0.15\text{ px}$, reducing positional uncertainty to $\le 15\text{ arcseconds}$ and enabling robust, unambiguous plate solving.

### 2. Point Spread Function (PSF) Physics
Stars are effectively point sources at infinite distance (subtending micro-arcseconds). When light passes through the camera optics and atmospheric turbulence, diffraction and optical aberrations blur the point into a circular **Airy disk**, accurately approximated by a 2D Gaussian Point Spread Function (PSF):

$$I(x, y) = I_0 \cdot \exp\left(-\frac{(x - x_0)^2 + (y - y_0)^2}{2\sigma_{\text{PSF}}^2}\right)$$

A typical smartphone camera lens focuses visible starlight across a footprint of $3\text{--}25\text{ pixels}$ (diameter $\approx 2\text{--}5\text{ px}$). The spatial distribution of luminance across these neighboring pixels contains the exact sub-pixel position of the stellar core.

### 3. Non-Stellar Artifact Rejection
Night-sky camera frames capture numerous non-stellar phenomena that must be filtered out before pattern matching:
- **Cosmic Ray Hits & Thermal Spikes:** Typically occupy only 1 or 2 isolated pixels with steep, non-Gaussian gradients.
- **Satellite & Airplane Streaks:** Fast-moving objects leave elongated linear tracks across long exposures, exhibiting extreme eccentricity.
- **Optical Lens Flare & Ghosting:** Large, diffuse, irregularly shaped light halos near bright streetlamps or the Moon.

By computing **second-order central moments** (ellipticity $\varepsilon$ and radius of gyration $R_{\text{gyr}}$), authentic circular stellar PSFs can be distinguished from streaks and optical artifacts.

---

## 2. Mathematical Formulations

```text
Binary Star Mask (Mask)  +  Net Luminance (ΔY)
                 │
                 ▼
 ┌──────────────────────────────────────────────────┐
 │ 1. 8-Connected Component Labeling (CCL)          │
 │    • Scanline Run-Length Encoding / Disjoint-Set │
 │    • Cluster contiguous candidate pixels         │
 └───────────────────────┬──────────────────────────┘
                         │ Discrete Blobs { P_k }
                         ▼
 ┌──────────────────────────────────────────────────┐
 │ 2. Intensity-Weighted Spatial Moments            │
 │    • Zeroth moment (Flux):   M_00 = Σ ΔY         │
 │    • First moments (Center): x_c = M_10 / M_00   │
 │                              y_c = M_01 / M_00   │
 └───────────────────────┬──────────────────────────┘
                         │ Sub-pixel Centroids (x_c, y_c)
                         ▼
 ┌──────────────────────────────────────────────────┐
 │ 3. Second-Order Central Moments & Morphology     │
 │    • Variances: μ_20, μ_02, Covariance: μ_11     │
 │    • Semi-axes (a, b) & Ellipticity: ε = 1 - b/a │
 │    • FWHM ≈ 2.355 · sqrt((μ_20 + μ_02) / 2)      │
 └───────────────────────┬──────────────────────────┘
                         │ Morphology Metrics
                         ▼
 ┌──────────────────────────────────────────────────┐
 │ 4. Astrometric Candidate Filtering               │
 │    • Minimum Flux: F ≥ F_min                     │
 │    • Area bounds:  A_min ≤ N_pixels ≤ A_max      │
 │    • Roundness:    ε ≤ ε_max (reject streaks)    │
 └───────────────────────┬──────────────────────────┘
                         │
                         ▼
          Final Star Candidates Array
    [ { x: 342.38, y: 812.14, flux: 1420, fwhm: 2.1 }, ... ]
```

---

### A. 8-Connected Component Labeling (CCL)
Pixels in the binary mask $\text{Mask}(x, y) = 1$ are grouped into disjoint connected regions (blobs) $\mathcal{B}_k$ using **8-connectivity** (horizontal, vertical, and diagonal neighbors):

$$\mathcal{N}_8(x, y) = \{ (x \pm 1, y), (x, y \pm 1), (x \pm 1, y \pm 1) \}$$

For high performance in memory-constrained mobile environments, labeling is implemented using single-pass scanline Run-Length Encoding (RLE) with a disjoint-set (Union-Find with path compression) tree:
- Contiguous horizontal runs of active pixels on row $y$ form line segments.
- Overlapping segments on adjacent rows $y$ and $y-1$ are merged into equivalent equivalence classes.
- Blobs smaller than a minimum area ($A < A_{\text{min}}$, typically 2 pixels) are immediately discarded as transient noise.

---

### B. Intensity-Weighted Centroiding (First-Order Moments)
Given a connected component blob $\mathcal{B}_k$ comprising pixel coordinates $(x_i, y_i)$ with net photometric intensities $\Delta Y(x_i, y_i)$:

1. **Zeroth-Order Spatial Moment ($M_{00}$ — Total Net Flux):**
   $$M_{00} = \sum_{(x, y) \in \mathcal{B}_k} \Delta Y(x, y)$$

2. **First-Order Spatial Moments ($M_{10}$ and $M_{01}$):**
   $$M_{10} = \sum_{(x, y) \in \mathcal{B}_k} x \cdot \Delta Y(x, y)$$
   $$M_{01} = \sum_{(x, y) \in \mathcal{B}_k} y \cdot \Delta Y(x, y)$$

3. **Sub-Pixel Centroid Coordinates $(x_c, y_c)$:**
   $$x_c = \frac{M_{10}}{M_{00}} = \frac{\sum x \cdot \Delta Y(x, y)}{\sum \Delta Y(x, y)}$$
   $$y_c = \frac{M_{01}}{M_{00}} = \frac{\sum y \cdot \Delta Y(x, y)}{\sum \Delta Y(x, y)}$$

This intensity-weighted formulation naturally places the centroid at the optical summit of the Gaussian Airy profile, providing sub-pixel accuracy far exceeding binary geometric center-of-bounding-box methods.

---

### C. Second-Order Central Moments & Morphological Shape
To evaluate whether a detected blob is a legitimate circular star Point Spread Function or an artifact, we compute second-order central moments normalized by total flux:

$$\mu_{20} = \frac{1}{M_{00}} \sum_{(x, y) \in \mathcal{B}_k} (x - x_c)^2 \cdot \Delta Y(x, y)$$

$$\mu_{02} = \frac{1}{M_{00}} \sum_{(x, y) \in \mathcal{B}_k} (y - y_c)^2 \cdot \Delta Y(x, y)$$

$$\mu_{11} = \frac{1}{M_{00}} \sum_{(x, y) \in \mathcal{B}_k} (x - x_c)(y - y_c) \cdot \Delta Y(x, y)$$

1. **Semi-Major Axis ($a$) and Semi-Minor Axis ($b$):**
   The eigenvalues of the moment matrix define the equivalent ellipse semi-axes:
   
   $$a^2 = \frac{\mu_{20} + \mu_{02}}{2} + \sqrt{\left(\frac{\mu_{20} - \mu_{02}}{2}\right)^2 + \mu_{11}^2}$$
   
   $$b^2 = \frac{\mu_{20} + \mu_{02}}{2} - \sqrt{\left(\frac{\mu_{20} - \mu_{02}}{2}\right)^2 + \mu_{11}^2}$$

2. **Ellipticity ($\varepsilon$):**
   $$\varepsilon = 1 - \frac{b}{a}$$
   - For an authentic, circular stellar PSF: $\varepsilon \le 0.35$.
   - For a satellite trail or optical smear: $\varepsilon \ge 0.60$.

3. **Full Width at Half Maximum ($\text{FWHM}$):**
   Assuming a 2D Gaussian profile where $\sigma^2 \approx \frac{\mu_{20} + \mu_{02}}{2}$:
   
   $$\text{FWHM} = 2\sqrt{2\ln 2} \cdot \sigma \approx 2.3548 \sqrt{\frac{\mu_{20} + \mu_{02}}{2}}$$

---

### D. Instrumental Visual Magnitude Approximation
Astronomical apparent visual magnitude $V$ scales logarithmically with luminous flux according to Pogson's relation:

$$m_{\text{inst}} = -2.5 \log_{10}(M_{00}) + C_0$$

where $C_0$ is an instrumental zero-point calibration constant (typically calibrated such that the brightest visible star matches $m \approx 0$).

---

## 3. Data Contracts & TypeScript Specifications

The extracted centroids and blobs are structured under the following contracts in `app/src/engines/vision/types.ts`:

```typescript
/**
 * Individual detected star candidate extracted from sensor frame.
 */
export interface StarCentroid {
  id: number;                // 1-based unique detection index
  x: number;                 // Sub-pixel horizontal coordinate [0..width)
  y: number;                 // Sub-pixel vertical coordinate [0..height)
  flux: number;              // Total integrated net luminous flux (M_00)
  peakIntensity: number;     // Highest net intensity pixel within blob
  pixelCount: number;        // Number of connected pixels forming the blob
  fwhm: number;              // Full Width at Half Maximum (pixels)
  ellipticity: number;       // PSF eccentricity [0.0 = perfectly circular, 1.0 = linear streak]
  instrumentalMagnitude: number; // Pogson instrumental magnitude
  snr: number;               // Approximate Signal-to-Noise Ratio (Peak / local sigma)
}

/**
 * Configuration options for blob detection and centroid extraction.
 */
export interface CentroidExtractionOptions {
  minPixelCount?: number;    // Default: 2 (reject isolated single-pixel hot spots)
  maxPixelCount?: number;    // Default: 250 (reject massive light pollution blobs)
  minFlux?: number;          // Default: 15.0 (minimum integrated energy)
  maxEllipticity?: number;   // Default: 0.50 (reject satellite & aircraft streaks)
  minFwhm?: number;          // Default: 0.8 px (reject cosmic ray spikes)
  maxFwhm?: number;          // Default: 8.0 px (reject out-of-focus halos)
  magnitudeZeroPoint?: number; // Calibration offset C_0 (default: 20.0)
}

/**
 * Result bundle produced by Step 5 centroid extraction.
 */
export interface CentroidExtractionResult {
  stars: StarCentroid[];     // Array of validated star candidates sorted by brightness
  rawBlobCount: number;      // Total blobs identified before morphological filtering
  rejectedCount: number;     // Blobs rejected due to size, flux, or ellipticity
  executionTimeMs: number;   // Time spent in connected component analysis & centroiding
}
```

---

## 4. Subsystem Architecture & Phased Rollout Plan

To ensure modularity and systematic verification, Step 5 is structured into three progressive parts:

```text
  ┌─────────────────────────────────────────────────────────┐
  │ PART 1: Connected Component Labeling & Blob Extraction   │
  │ • Fast 8-connected two-pass / union-find segmentation   │
  │ • Pixel bounding box, area, and peak identification    │
  │ • Initial noise rejection (< minPixelCount)             │
  └──────────────────────────┬──────────────────────────────┘
                             │ Raw Blobs Array
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │ PART 2: Sub-Pixel Centroiding & Morphological Filter    │
  │ • Intensity-weighted center of mass (M_10, M_01)        │
  │ • Second-order central moments (μ_20, μ_02, μ_11)       │
  │ • Ellipticity (ε) & FWHM calculation                    │
  │ • Streak rejection & Pogson instrumental magnitude      │
  └──────────────────────────┬──────────────────────────────┘
                             │ Validated StarCentroid[]
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │ PART 3: Pipeline Integration & Benchmarking             │
  │ • End-to-end integration: Raw RGBA -> Step 3 -> 4 -> 5  │
  │ • Multi-asterism verification (Orion, Summer Triangle)   │
  │ • Real-time viewfinder HUD metrics & action button      │
  └─────────────────────────────────────────────────────────┘
```

- **Part 1:** Connected-Component Labeling (CCL) & Raw Blob Clustering (`blobDetection.ts`).
- **Part 2:** Intensity-Weighted Sub-Pixel Centroiding & Morphological Filtering (`centroidExtraction.ts`).
- **Part 3:** VisionEngine Integration, Multi-Asterism Verification, and Viewfinder HUD Update (`CameraViewfinder.tsx`).

---

## 5. Verification & Validation Metrics

| Test Criterion | Baseline Requirement | Target Metric |
| :--- | :--- | :--- |
| **Sub-Pixel Accuracy** | Distance between recovered centroid and synthetic ground truth $(x_0, y_0)$ | $\Delta r \le 0.15\text{ px}$ |
| **Streak Rejection** | Rejection of synthetic elongated satellite streak ($\text{aspect} > 4:1$) | $100\%$ streak rejection ($\varepsilon > 0.50$) |
| **Hot Pixel Rejection** | Rejection of isolated 1-pixel thermal spikes | $100\%$ rejected ($A < 2$) |
| **Execution Latency** | Full-frame $1080\text{p}$ CCL & centroiding | $\le 15\text{ ms}$ on mobile JS thread |
| **Asterism Recovery** | Recovery of all prominent stars in Orion benchmark | $100\%$ recovery ($12/12$ stars detected) |
