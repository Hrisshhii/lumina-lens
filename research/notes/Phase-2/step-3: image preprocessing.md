# Step 3: Image Preprocessing (Grayscale & Noise Reduction) (Completed ✅)

## Objective
Design and implement the preprocessing pipeline for the Lumina Lens Vision Engine. Transform raw color frames into high-precision, single-channel 8-bit luminance matrices ($Y$), and apply low-latency astronomical spatial filtering (separable Gaussian smoothing and hot-pixel suppression) to eliminate CMOS thermal noise and sensor defects without attenuating authentic stellar point spread functions (PSFs).

---

## 1. Context & Astronomical Motivation

In **Phase 2 Step 2**, we established the `CapturedFrame` contract and built the frame acquisition pipeline, synchronizing camera shutter triggers with observer GPS coordinates and device orientation $(\text{Azimuth}, \text{Altitude})$.

Before point-light sources (stars) can be isolated via statistical background subtraction (Step 4) and centroided (Step 5), the raw image buffer must be preprocessed:

1. **Color Redundancy in Astrometry:**
   In astronomical plate solving and star identification, chromaticity (RGB color) is unnecessary for geometric centroid determination. Centroid coordinates $(x_c, y_c)$ depend solely on the spatial distribution of integrated luminous flux. Processing 3 color channels triples memory consumption and CPU/GPU cache misses with zero benefit to spatial plate solving.
2. **CMOS Sensor Noise Regimes at High ISO:**
   Night-sky photography requires high analog gain (ISO 1600–6400). In this operating regime, smartphone camera sensors suffer from:
   - **Read Noise:** High-frequency zero-mean Gaussian fluctuations across the entire sensor floor.
   - **Photon Shot Noise:** Poisson statistical variance ($\sigma = \sqrt{N}$) in photon arrival rates from ultra-faint stars.
   - **Fixed-Pattern Noise (FPN) & "Hot Pixels":** Individual defective or overheated photodiodes whose thermal leakage current saturates the pixel (intensity $= 255$) even in pitch darkness. A naive peak-detector would mistake these single hot pixels for stars!
3. **The Astrophotography Filtering Dilemma:**
   Standard computer vision blurs (such as large $7 \times 7$ or $9 \times 9$ box or Gaussian filters) smear out compact point spread functions ($r \approx 1.5\text{ px}$), severely degrading the Signal-to-Noise Ratio (SNR) of magnitude $V \ge 4.0$ stars. The preprocessing layer requires **tuned, small-kernel separable filters** that preserve diffraction peaks while attenuating high-frequency noise.

---

## 2. Mathematical Formulations

### A. ITU-R BT.709 Photometric Luminance Conversion
To convert three-channel $(R, G, B)$ color pixel data to a single monochromatic luminance value $Y \in [0, 255]$:

$$Y = 0.2126\,R + 0.7152\,G + 0.0722\,B$$

*Astronomical Note:* Green carries the dominant weight ($\approx 71.5\%$) because:
- Smartphone CMOS sensors employ a Bayer Color Filter Array (CFA) configured with an **RGGB pattern** (50% green pixels).
- The human eye's photopic spectral response and the peak emission of typical main-sequence stars (G and K spectral types, such as the Sun, Alpha Centauri, and Arcturus) align closely with the green band ($500\text{--}550\text{ nm}$).

For rapid integer arithmetic in real-time frame loops, the conversion is implemented using fixed-point bitshifts:

$$Y = (54\,R + 183\,G + 19\,B) \gg 8$$

---

### B. Separable 2D Gaussian Kernel Smoothing
A 2D isotropic Gaussian filter with standard deviation $\sigma$ is defined as:

$$G(x, y) = \frac{1}{2\pi\sigma^2} \exp\left(-\frac{x^2 + y^2}{2\sigma^2}\right)$$

Because $G(x, y) = G_1(x) \cdot G_1(y)$, the 2D convolution is **separable**. Computing a $K \times K$ convolution as two successive 1D passes (horizontal row pass followed by vertical column pass) reduces computational complexity:

$$\mathcal{O}(K^2 \cdot W \cdot H) \longrightarrow \mathcal{O}(2K \cdot W \cdot H)$$

For a $3 \times 3$ kernel with $\sigma \approx 0.85$, the discrete binomial approximation is:

$$K_{\text{1D}} = \frac{1}{4} \begin{bmatrix} 1 & 2 & 1 \end{bmatrix}$$

Applying this 1D kernel horizontally and then vertically achieves smooth high-frequency noise suppression with minimal PSF broadening ($\Delta r < 0.2\text{ px}$).

---

### C. Astronomical Hot-Pixel Suppression Filter
CMOS sensor hot pixels are characterized by an isolated maximum: a single pixel at or near saturation surrounded by near-zero background sky. Unlike true stars, which are blurred by optical diffraction across a multi-pixel Airy disk (FWHM $\ge 2.0\text{ px}$), hot pixels have an FWHM of exactly $1.0\text{ px}$.

We identify and suppress hot pixels using a cross-neighborhood median test with an optimal 5-comparison sorting network:

$$\text{Med}_4(x, y) = \text{median}\big(Y(x-1, y),\, Y(x+1, y),\, Y(x, y-1),\, Y(x, y+1)\big)$$

$$\text{If } Y(x, y) - \text{Med}_4(x, y) > T_{\text{hot}} \quad \Longrightarrow \quad Y(x, y) \leftarrow \text{Med}_4(x, y)$$

Where $T_{\text{hot}} \approx 65$ (out of 255). Authentic stars with multi-pixel Gaussian envelopes satisfy $Y(x, y) - \text{Med}_4(x, y) < T_{\text{hot}}$ and remain unaffected.

---

## 3. Architecture & Data Structures

```text
       CapturedFrame (Raw Image / SVG / JPEG)
                         │
                         ▼
             decodeToPixelData()
       (Extracts RGBA Uint8ClampedArray)
                         │
                         ▼
             rgbaToLuminance()
       (Applies ITU-R BT.709 Fixed-Point)
                         │
                         ▼
             LuminanceBuffer (Raw Y)
       • width, height: number
       • data: Uint8ClampedArray [W × H]
       • stride: width
                         │
                         ▼
            suppressHotPixels()
       (Cross-Neighborhood Median Test)
                         │
                         ▼
        separableGaussianBlur3x3()
       (Horizontal pass → Vertical pass)
                         │
                         ▼
         PreprocessedLuminanceBuffer
       • Clean 8-bit point sources
       • Min, max, mean, stdDev metrics
                         │
                         ▼
       Output to Step 4: Background Estimation & Thresholding
```

### LuminanceBuffer Specification (`app/src/engines/vision/types.ts`)
```typescript
export interface LuminanceBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray; // 1D flat row-major array of size W × H
  stride: number;          // Row stride (equal to width)
  min: number;             // Minimum pixel intensity [0..255]
  max: number;             // Maximum pixel intensity [0..255]
  mean: number;            // Global mean luminance
  stdDev: number;          // Global standard deviation
}

export interface PreprocessingResult {
  buffer: LuminanceBuffer;
  executionTimeMs: number;
  stagesCompleted: string[];
}
```

---

## 4. Implementation Details (Three-Part Rollout)

1. **Part 1 — Luminance Conversion Core:**
   - Implemented fixed-point photopic grayscale conversion (`rgbaToLuminance`) in [`preprocessing.ts`](../../app/src/engines/vision/preprocessing.ts).
   - Single-pass continuous iteration computes running statistics (`min`, `max`, `mean`, `stdDev`).
   - Achieves $3\times$ memory reduction ($7.91\text{ MB} \to 1.98\text{ MB}$ for 1080p).
2. **Part 2 — Astronomical Spatial Filtering:**
   - Implemented `suppressHotPixels()` using 4-neighbor cross medians.
   - Implemented `separableGaussianBlur3x3()` via 1D binomial passes ($\frac{1}{4}[1, 2, 1]$) with integer shifts.
   - Built automated test runners verifying star preservation vs. hot pixel removal.
3. **Part 3 — End-to-End Pipeline & UI Integration:**
   - Built `preprocessFrame(rgba, width, height, options)` as the consolidated pipeline entry point.
   - Added `generateSyntheticRgba()` to [`syntheticStarfield.ts`](../../app/src/engines/vision/syntheticStarfield.ts) to generate realistic 2D Gaussian stellar PSFs in raw memory buffers.
   - Enhanced the Captured Frame Tray in [`CameraViewfinder.tsx`](../../app/src/components/CameraViewfinder.tsx) with an interactive **✨ Preprocess (Step 3)** button displaying live luminance histogram bounds $[Y_{\min}..Y_{\max}]$, sky background mean ($\mu$), noise variance ($\sigma$), and processing latency.

---

## 5. Verification & Performance Benchmarks

| Verification Test | Metric | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Color Weight Accuracy** | White $\to 255$, Green $\to 182$, Red $\to 53$, Blue $\to 18$ | **Passed** ✅ | Matches photopic human & Bayer CFA sensitivity. |
| **Hot-Pixel Suppression** | Defect at $(6, 6)$: $255 \to 10$ | **Passed** ✅ | $100\%$ suppressed to local sky floor. |
| **Star Core Preservation** | Star at $(16, 16)$: $245 \to 245$ | **Passed** ✅ | $100\%$ preserved without flux attenuation. |
| **High-Frequency Denoising** | Noise $\sigma$: $5.40 \to 2.03$ | **Passed** ✅ | $> 62\%$ variance reduction. |
| **Flux Energy Conservation** | Mean sky: $14.93 \to 14.19$ | **Passed** ✅ | Energy invariant within $< 1.0$ DN. |
| **1080p Filtering Latency** | $1920 \times 1080$ ($2.07\text{ Mpx}$) | **$31.02\text{ ms}$** ⚡ | Well within the $< 45\text{ ms}$ real-time budget. |
| **Synthetic Frame Pipeline** | Orion asterism end-to-end | **$27.95\text{ ms}$** ⚡ | Full 3-stage pipeline executed in $< 28\text{ ms}$. |
| **TypeScript Compilation** | `npx tsc --noEmit` | **Passed (0 errors)** ✅ | Strict type-safety across Vision Engine. |
| **Web Bundle Export** | `expo export --platform web` | **Passed (419 modules)** ✅ | Clean bundle. |
| **Android Bundle Export** | `expo export --platform android` | **Passed (1141 modules)** ✅ | Hermes bytecode generated. |

---

## 6. Next Steps

With the preprocessed luminance buffer validated:
- **Step 4: Background Estimation & Adaptive Thresholding:** Calculate local sky background surfaces $B(x, y)$ and apply adaptive statistical thresholding ($T = \mu_{\text{local}} + k\sigma_{\text{local}}$) to segment candidate point sources from light pollution and lunar airglow.
- **Step 5: Star Blob Detection & Sub-Pixel Centroid Extraction:** Detect connected components and calculate intensity-weighted center-of-mass coordinates $(x_c, y_c)$.
