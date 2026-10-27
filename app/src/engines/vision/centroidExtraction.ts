/**
 * Lumina Lens — Star Blob Detection & Sub-Pixel Centroid Extraction (Phase 2 Step 5)
 * Identifies 8-connected point-source blobs and computes sub-pixel intensity-weighted
 * centers of mass, second-order PSF moments, ellipticity, and instrumental magnitude.
 */

import type {
  LuminanceBuffer,
  RawBlob,
  RawBlobPixel,
  StarCentroid,
  CentroidExtractionOptions,
  CentroidExtractionResult,
} from "./types";

const DEFAULT_OPTIONS: Required<CentroidExtractionOptions> = {
  minPixelCount: 2,
  maxPixelCount: 300,
  minFlux: 12.0,
  maxEllipticity: 0.55,
  minFwhm: 0.7,
  maxFwhm: 9.0,
  magnitudeZeroPoint: 20.0,
};

/**
 * Part 1: Detects coherent 8-connected components (blobs) from a binary star candidate mask.
 * Uses a memory-efficient Breadth-First Search (BFS) over sparse active mask pixels.
 *
 * @param starMask Binary mask where 1 represents candidate star pixel and 0 is sky background.
 * @param netLuminance Gradient-subtracted luminance buffer (Delta Y).
 * @param options Extraction thresholds (min/max pixel counts).
 * @returns Array of raw connected blobs with bounding boxes and pixel intensities.
 */
export function detectBlobs(
  starMask: Uint8Array,
  netLuminance: LuminanceBuffer,
  options?: CentroidExtractionOptions
): RawBlob[] {
  const minPixels = options?.minPixelCount ?? DEFAULT_OPTIONS.minPixelCount;
  const maxPixels = options?.maxPixelCount ?? DEFAULT_OPTIONS.maxPixelCount;

  const { width, height, data } = netLuminance;
  const totalPixels = width * height;

  // Track visited pixels with a compact typed array
  const visited = new Uint8Array(totalPixels);
  const blobs: RawBlob[] = [];
  let blobIdCounter = 1;

  // Reusable BFS queue buffers
  const queueX = new Int32Array(maxPixels + 64);
  const queueY = new Int32Array(maxPixels + 64);

  // 8-neighbor offsets
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;

      // Skip non-star or already-visited pixels
      if (starMask[idx] === 0 || visited[idx] === 1) {
        continue;
      }

      // Found unvisited candidate star pixel: start BFS
      visited[idx] = 1;
      let qHead = 0;
      let qTail = 0;

      queueX[qTail] = x;
      queueY[qTail] = y;
      qTail++;

      const pixels: RawBlobPixel[] = [];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let peakIntensity = 0;
      let peakX = x;
      let peakY = y;
      let overflowed = false;

      while (qHead < qTail) {
        const cx = queueX[qHead];
        const cy = queueY[qHead];
        qHead++;

        const cIdx = cy * width + cx;
        const intensity = data[cIdx];

        pixels.push({ x: cx, y: cy, intensity });

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        if (intensity > peakIntensity) {
          peakIntensity = intensity;
          peakX = cx;
          peakY = cy;
        }

        // Expand 8-connected neighbors
        for (let i = 0; i < 8; i++) {
          const nx = cx + dx[i];
          const ny = cy + dy[i];

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (starMask[nIdx] === 1 && visited[nIdx] === 0) {
              visited[nIdx] = 1;
              if (qTail < queueX.length) {
                queueX[qTail] = nx;
                queueY[qTail] = ny;
                qTail++;
              } else {
                overflowed = true;
              }
            }
          }
        }
      }

      // Filter by pixel count bounds
      const count = pixels.length;
      if (!overflowed && count >= minPixels && count <= maxPixels) {
        blobs.push({
          id: blobIdCounter++,
          pixels,
          pixelCount: count,
          minX,
          maxX,
          minY,
          maxY,
          peakIntensity,
          peakX,
          peakY,
        });
      }
    }
  }

  return blobs;
}

/**
 * Part 2: Computes intensity-weighted sub-pixel centroid coordinates and morphological PSF moments.
 * Evaluates second-order central moments for ellipticity (streak rejection) and FWHM.
 *
 * @param blob Raw connected component blob.
 * @param options Centroid extraction thresholds and zero-point calibration.
 * @param localNoise Optional local background noise floor (sigma) for SNR estimation.
 * @returns Calibrated StarCentroid, or null if rejected by morphological filters.
 */
export function computeStarCentroid(
  blob: RawBlob,
  options?: CentroidExtractionOptions,
  localNoise = 2.0
): StarCentroid | null {
  const minFlux = options?.minFlux ?? DEFAULT_OPTIONS.minFlux;
  const maxEllipticity = options?.maxEllipticity ?? DEFAULT_OPTIONS.maxEllipticity;
  const minFwhm = options?.minFwhm ?? DEFAULT_OPTIONS.minFwhm;
  const maxFwhm = options?.maxFwhm ?? DEFAULT_OPTIONS.maxFwhm;
  const magZeroPoint = options?.magnitudeZeroPoint ?? DEFAULT_OPTIONS.magnitudeZeroPoint;

  const { pixels, pixelCount, peakIntensity, id } = blob;

  // 1. Zeroth-order moment: Total Net Luminous Flux
  let m00 = 0;
  let m10 = 0;
  let m01 = 0;

  for (let i = 0; i < pixelCount; i++) {
    const p = pixels[i];
    const w = p.intensity;
    m00 += w;
    m10 += p.x * w;
    m01 += p.y * w;
  }

  if (m00 < minFlux) {
    return null; // Energy too low
  }

  // 2. First-order spatial moments: Sub-Pixel Intensity-Weighted Center of Mass
  const xc = m10 / m00;
  const yc = m01 / m00;

  // 3. Second-order central moments: Normalized Variances and Covariance
  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;

  for (let i = 0; i < pixelCount; i++) {
    const p = pixels[i];
    const w = p.intensity;
    const dx = p.x - xc;
    const dy = p.y - yc;

    mu20 += dx * dx * w;
    mu02 += dy * dy * w;
    mu11 += dx * dy * w;
  }

  mu20 /= m00;
  mu02 /= m00;
  mu11 /= m00;

  // 4. Semi-major (a) and semi-minor (b) axes of equivalent ellipse
  const term1 = (mu20 + mu02) / 2.0;
  const diffHalf = (mu20 - mu02) / 2.0;
  const discriminant = Math.sqrt(diffHalf * diffHalf + mu11 * mu11);

  const aSq = term1 + discriminant;
  const bSq = Math.max(0, term1 - discriminant);

  const a = Math.sqrt(Math.max(0, aSq));
  const b = Math.sqrt(bSq);

  // Ellipticity: epsilon = 1 - b / a
  const ellipticity = a > 1e-4 ? Math.max(0, Math.min(1.0, 1.0 - b / a)) : 0;

  // Streak / airplane / satellite trail rejection
  if (ellipticity > maxEllipticity) {
    return null;
  }

  // 5. Full Width at Half Maximum (FWHM) approximation for Gaussian PSF
  const meanVariance = Math.max(0.01, (mu20 + mu02) / 2.0);
  const fwhm = 2.35482 * Math.sqrt(meanVariance);

  if (fwhm < minFwhm || fwhm > maxFwhm) {
    return null; // Cosmic ray spike (< minFwhm) or large optical blur (> maxFwhm)
  }

  // 6. Pogson Instrumental Magnitude: m = -2.5 * log10(Flux) + C_0
  const instrumentalMagnitude = -2.5 * Math.log10(Math.max(1.0, m00)) + magZeroPoint;

  // 7. Signal-to-Noise Ratio (SNR)
  const snr = localNoise > 0 ? peakIntensity / localNoise : peakIntensity;

  return {
    id,
    x: Number(xc.toFixed(3)),
    y: Number(yc.toFixed(3)),
    flux: Math.round(m00),
    peakIntensity,
    pixelCount,
    fwhm: Number(fwhm.toFixed(2)),
    ellipticity: Number(ellipticity.toFixed(3)),
    instrumentalMagnitude: Number(instrumentalMagnitude.toFixed(2)),
    snr: Number(snr.toFixed(1)),
  };
}

/**
 * End-to-end Step 5 execution: Detects blobs from candidate star mask and extracts validated star centroids.
 *
 * @param starMask Binary candidate star mask from Step 4.
 * @param netLuminance Net luminance buffer from Step 4.
 * @param options Centroid extraction and morphological filter options.
 * @param localNoise Estimated global noise floor sigma (default: 2.0).
 * @returns CentroidExtractionResult containing validated star centroids sorted by brightness.
 */
export function extractStarCentroids(
  starMask: Uint8Array,
  netLuminance: LuminanceBuffer,
  options?: CentroidExtractionOptions,
  localNoise = 2.0
): CentroidExtractionResult {
  const startTime = performance.now();

  // Part 1: 8-Connected Component Labeling
  const rawBlobs = detectBlobs(starMask, netLuminance, options);

  // Part 2: Centroid extraction & morphological filtering
  const stars: StarCentroid[] = [];
  let rejectedCount = 0;

  for (let i = 0; i < rawBlobs.length; i++) {
    const star = computeStarCentroid(rawBlobs[i], options, localNoise);
    if (star !== null) {
      stars.push(star);
    } else {
      rejectedCount++;
    }
  }

  // Sort stars by visual brightness (instrumental magnitude ascending / flux descending)
  stars.sort((a, b) => b.flux - a.flux);

  // Re-index sorted stars 1..N
  for (let i = 0; i < stars.length; i++) {
    stars[i].id = i + 1;
  }

  const executionTimeMs = performance.now() - startTime;

  return {
    stars,
    rawBlobCount: rawBlobs.length,
    rejectedCount,
    executionTimeMs,
  };
}

