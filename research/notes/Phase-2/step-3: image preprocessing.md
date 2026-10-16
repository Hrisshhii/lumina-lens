# Step 3: Image Preprocessing (Grayscale & Noise Reduction)

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

We identify and suppress hot pixels using a cross-neighborhood median test:

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
```

---

## 4. Implementation Tasks

1. **Extend Vision Engine Types (`types.ts`):**
   - Define `LuminanceBuffer` interface and `PreprocessingOptions`.
2. **Build Preprocessing Module (`app/src/engines/vision/preprocessing.ts`):**
   - `rgbaToLuminance(rgba: Uint8ClampedArray, width: number, height: number): LuminanceBuffer`
   - `suppressHotPixels(buffer: LuminanceBuffer, threshold?: number): LuminanceBuffer`
   - `separableGaussianBlur3x3(buffer: LuminanceBuffer): LuminanceBuffer`
   - `preprocessFrame(rgba: Uint8ClampedArray, width: number, height: number, options?: PreprocessingOptions): LuminanceBuffer`
3. **Synthetic Field Rasterizer & Decoder:**
   - Add utility to rasterize synthetic SVG asterisms or parse RGBA test buffers for headless unit testing.
4. **Verification & Performance Benchmarks:**
   - Verify execution time: $< 25\text{ ms}$ for $1280 \times 720$ and $< 50\text{ ms}$ for $1920 \times 1080$.
   - Confirm hot pixel removal without star PSF degradation.
   - Verify TypeScript typecheck (`npx tsc --noEmit`) and Expo exports.

---

## 5. Next Steps

Once the preprocessed luminance buffer is verified:
- **Step 4: Background Estimation & Adaptive Thresholding:** Calculate local sky gradient surfaces $B(x, y)$ and apply adaptive statistical thresholding ($T = \mu_{\text{local}} + k\sigma_{\text{local}}$) to isolate true point-source candidates.
- **Step 5: Star Blob Detection & Sub-Pixel Centroid Extraction:** Detect connected components and extract sub-pixel centroid coordinates $(x_c, y_c)$.

