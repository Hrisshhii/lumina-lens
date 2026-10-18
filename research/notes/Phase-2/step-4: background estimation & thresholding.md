# Step 4: Background Estimation & Adaptive Thresholding (Completed ✅)

## Objective
Design and implement the sky background modeling and adaptive statistical segmentation pipeline for the Lumina Lens Vision Engine. Construct a spatially varying local background surface $B(x, y)$ and noise map $\sigma(x, y)$ to neutralize urban light pollution, lunar airglow, and optical vignetting, and generate a noise-immune binary star candidate mask using a Constant False Alarm Rate (CFAR) statistical threshold $T(x, y) = B(x, y) + k \cdot \sigma(x, y)$.

---

## 1. Context & Astronomical Motivation

In **Phase 2 Step 3**, we developed the preprocessing layer: converting RGB frames into calibrated single-channel photopic luminance ($Y$) and applying high-frequency noise suppression (hot-pixel elimination and $3 \times 3$ binomial Gaussian smoothing).

However, real-world night skies photographed with mobile sensors are never uniformly black:

1. **Urban Light-Pollution Gradients (Bortle Class 4–9):**
   Artificial outdoor lighting (sodium vapor, LED streetlights) scatters into aerosols in the lower atmosphere, producing pronounced skyglow. In wide-field phone cameras, this creates a steep intensity gradient: the lower horizon can be $5\times\text{--}10\times$ brighter than the zenith within the same frame.
2. **Optical Vignetting ($I \propto \cos^4\theta$):**
   Compact smartphone lens assemblies exhibit severe geometric light falloff toward the sensor corners. A star of identical magnitude near the edge of the frame appears significantly dimmer than one at optical center.
3. **Lunar Airglow & Scattered Moonlight:**
   Atmospheric Rayleigh and Mie scattering from the moon introduces localized halo gradients across the field of view.
4. **The Failure of Global Thresholding:**
   - If a single global threshold $T_{\text{global}}$ is chosen high enough to prevent false alarms in the bright light-pollution region, all stars in the darker regions are clipped and lost.
   - If $T_{\text{global}}$ is lowered to detect faint stars in dark regions, the bright corner triggers a massive, connected false-positive blob that overwhelms downstream centroiding.

To reliably detect stars across heterogeneous skies, professional astronomical survey software (such as **SExtractor** and **DAOPHOT**) employs **local mesh background estimation followed by adaptive local sigma-clipping**.

---

## 2. Mathematical Formulations

### A. Tiled Mesh Grid Decomposition
The preprocessed luminance image $Y$ of dimension $W \times H$ is partitioned into an $M \times N$ regular grid of rectangular cells (mesh tiles) of size $S_w \times S_h$ (typically $32 \times 32$ or $64 \times 64$ pixels):

$$M = \lceil W / S_w \rceil, \quad N = \lceil H / S_h \rceil$$

A tile size of $32\text{--}64\text{ pixels}$ is chosen because:
- It is substantially larger than typical stellar Point Spread Functions ($r_{\text{PSF}} \approx 1\text{--}3\text{ px}$), ensuring stars occupy $< 2\%$ of any tile's area.
- It is small enough to track smooth atmospheric skyglow gradients and lens vignetting profiles.

---

### B. Robust Tile Background & Dispersion Estimation
Within each tile $(i, j)$, stars appear as sparse positive outliers. Computing simple arithmetic means and standard deviations would bias the background estimate upward. 

Instead, we use **robust non-parametric statistics**:
1. **Tile Median as Local Background ($B_{i, j}$):**
   Since stars occupy a negligible fraction of pixels in any tile, the median pixel value provides an outlier-resistant estimate of the true sky level:
   
   $$B_{i, j} = \text{Median}\big(\{ Y(x, y) \mid (x, y) \in \text{Tile}_{i, j} \}\big)$$

2. **Median Absolute Deviation (MAD) for Local Noise Floor ($\sigma_{i, j}$):**
   To quantify CMOS read noise and Poisson sky background variance without star contamination:
   
   $$\text{MAD}_{i, j} = \text{Median}\big(\big| Y(x, y) - B_{i, j} \big|\big)$$
   
   For a normal distribution, the standard deviation is directly proportional to MAD:
   
   $$\sigma_{i, j} = 1.4826 \cdot \text{MAD}_{i, j}$$

For high-throughput execution in JavaScript/TypeScript, a fast histogram-based or sample-percentile approximation can also be used.

---

### C. Continuous 2D Surface Bilinear Interpolation
Discrete tile estimates $(B_{i, j}, \sigma_{i, j})$ are centered at grid node coordinates:

$$x_c(i) = (i + 0.5) \cdot S_w, \quad y_c(j) = (j + 0.5) \cdot S_h$$

To avoid sharp boundary artifacts at tile edges, the continuous background surface $B(x, y)$ and noise floor $\sigma(x, y)$ are evaluated at every pixel $(x, y)$ via **bilinear interpolation** among the four surrounding grid nodes:

$$u = \frac{x - x_c(i)}{x_c(i+1) - x_c(i)}, \quad v = \frac{y - y_c(j)}{y_c(j+1) - y_c(j)}$$

$$B(x, y) = (1 - u)(1 - v) B_{i, j} + u(1 - v) B_{i+1, j} + (1 - u)v B_{i, j+1} + uv B_{i+1, j+1}$$

---

### D. Net Star Intensity & Adaptive Thresholding (CFAR)
With the continuous background field $B(x, y)$ established:

1. **Net Luminance Subtraction:**
   $$\Delta Y(x, y) = \max\big(0, Y(x, y) - B(x, y)\big)$$
   This flattens the entire image, removing light pollution gradients and vignetting while preserving stellar peaks.

2. **Statistical Detection Threshold:**
   $$T(x, y) = B(x, y) + k \cdot \sigma(x, y)$$
   Equivalently, on the net luminance image:
   $$\Delta Y(x, y) > k \cdot \sigma(x, y)$$

   where $k$ is the detection significance multiplier (default $k = 3.0$, representing a $3\sigma$ detection threshold above local noise).

3. **Binary Star Candidate Mask:**
   $$\text{Mask}(x, y) = \begin{cases} 1 & \text{if } \Delta Y(x, y) > k \cdot \sigma(x, y) \\ 0 & \text{otherwise} \end{cases}$$

---

## 3. Subsystem Architecture & Phased Rollout Plan

To ensure stability and performance, Step 4 is executed in three distinct parts:

```text
Preprocessed Luminance (Y) [Uint8ClampedArray]
                     │
                     ▼
  ┌─────────────────────────────────────────────────────────┐
  │ PART 1: Mesh Background & Noise Estimation              │
  │ • Tile grid partitioning (e.g. 32x32)                   │
  │ • Outlier-resistant tile statistics (Median, MAD / Std) │
  │ • Fast bilinear continuous surface interpolation        │
  └──────────────────────────┬──────────────────────────────┘
                             │ Local Background B(x, y)
                             │ Local Noise Floor σ(x, y)
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │ PART 2: Net Subtraction & Adaptive Thresholding         │
  │ • Net luminance map: ΔY = max(0, Y - B)                  │
  │ • CFAR statistical thresholding: T = B + k·σ            │
  │ • Compact binary candidate mask (Uint8Array)            │
  └──────────────────────────┬──────────────────────────────┘
                             │ Binary Star Mask + Net Luminance
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │ PART 3: Engine Integration & Viewfinder Verification    │
  │ • Full VisionEngine segmentation pipeline integration   │
  │ • Synthetic urban light-pollution gradient benchmarks   │
  │ • Live viewfinder HUD metrics & visual verification     │
  └─────────────────────────────────────────────────────────┘
```

- **Part 1:** Core Mesh Background & Surface Interpolation (`estimateBackgroundMesh`, `interpolateBackground`).
- **Part 2:** Adaptive Thresholding & Net Luminance Segmentation (`adaptiveThresholding`, `createStarMask`).
- **Part 3:** Pipeline Consolidation & Live Verification (Benchmark suite, CameraViewfinder HUD controls).

---

## 4. Verification & Validation Metrics

| Test Criterion | Baseline Requirement | Target Metric |
| :--- | :--- | :--- |
| **Gradient Flattening** | Suppress simulated 10:1 diagonal light-pollution ramp | Flat residual background ($\mu_{\text{net}} < 1.0$) |
| **Vignetting Correction** | Equalize star detection sensitivity across center vs. corners | $100\%$ star recovery across field |
| **Execution Latency** | $1080\text{p}$ ($1920 \times 1080$) full segmentation | $\le 25\text{ ms}$ on mobile JS thread |
| **False Positive Rate** | Pure noise sky tiles with no stars | Zero false detections at $k = 3.5\sigma$ |
