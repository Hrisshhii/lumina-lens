/**
 * Lumina Lens — Background Estimation & Surface Modeling (Phase 2 Step 4)
 * Robust mesh-based astronomical background and noise floor estimation.
 */

import type { LuminanceBuffer, BackgroundMesh } from "./types";

/**
 * Fast histogram-based statistics for 8-bit pixel values in [0, 255].
 * Calculates outlier-resistant median and dispersion (equivalent sigma).
 */
export function computeTileStats(
  data: Uint8ClampedArray,
  imageWidth: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { median: number; sigma: number } {
  // Reusable 256-bin histogram for O(N) median and percentile calculation
  const hist = new Uint16Array(256);
  let count = 0;

  for (let y = startY; y < endY; y++) {
    const rowOffset = y * imageWidth;
    for (let x = startX; x < endX; x++) {
      const val = data[rowOffset + x];
      hist[val]++;
      count++;
    }
  }

  if (count === 0) {
    return { median: 0, sigma: 1 };
  }

  // 1. Median calculation: cumulative sum reaching count / 2
  const halfCount = count >>> 1;
  let accumulated = 0;
  let median = 0;

  for (let i = 0; i < 256; i++) {
    accumulated += hist[i];
    if (accumulated >= halfCount) {
      median = i;
      break;
    }
  }

  // 2. Dispersion calculation: 16th and 84th percentiles (robust 1-sigma spread)
  // For a normal distribution, P_84 - P_16 spans 2 * sigma.
  // This is completely immune to star contamination occupying top percentile bins (> 95%).
  const count16 = Math.floor(count * 0.1587);
  const count84 = Math.floor(count * 0.8413);

  let p16 = median;
  let p84 = median;
  accumulated = 0;

  for (let i = 0; i < 256; i++) {
    accumulated += hist[i];
    if (p16 === median && accumulated >= count16) {
      p16 = i;
    }
    if (accumulated >= count84) {
      p84 = i;
      break;
    }
  }

  // Dispersion sigma (minimum floor of 0.75 to prevent divide-by-zero or zero threshold)
  const sigma = Math.max(0.75, (p84 - p16) / 2.0);

  return { median, sigma };
}

/**
 * Part 1: Partition image into an M x N mesh and estimate local sky background and noise floor.
 * 
 * @param buffer Monochromatic preprocessed luminance buffer.
 * @param tileSize Dimension of each square mesh cell in pixels (default 32).
 * @returns BackgroundMesh structure containing coarse 2D background and noise floor arrays.
 */
export function estimateBackgroundMesh(
  buffer: LuminanceBuffer,
  tileSize = 32
): BackgroundMesh {
  const { width, height, data } = buffer;
  const gridCols = Math.ceil(width / tileSize);
  const gridRows = Math.ceil(height / tileSize);
  const totalCells = gridCols * gridRows;

  const bgArray = new Float32Array(totalCells);
  const noiseArray = new Float32Array(totalCells);

  let sumMedian = 0;
  let sumNoise = 0;

  for (let r = 0; r < gridRows; r++) {
    const startY = r * tileSize;
    const endY = Math.min(startY + tileSize, height);

    for (let c = 0; c < gridCols; c++) {
      const startX = c * tileSize;
      const endX = Math.min(startX + tileSize, width);

      const cellIndex = r * gridCols + c;
      const { median, sigma } = computeTileStats(data, width, startX, startY, endX, endY);

      bgArray[cellIndex] = median;
      noiseArray[cellIndex] = sigma;

      sumMedian += median;
      sumNoise += sigma;
    }
  }

  return {
    width,
    height,
    tileSize,
    gridCols,
    gridRows,
    background: bgArray,
    noise: noiseArray,
    globalMedian: sumMedian / totalCells,
    globalStdDev: sumNoise / totalCells,
  };
}

/**
 * Evaluates the continuous background B(x, y) and noise sigma(x, y) at pixel coordinates (x, y)
 * via bilinear interpolation of the mesh grid.
 */
export function evaluateBackgroundAt(
  mesh: BackgroundMesh,
  x: number,
  y: number
): { bg: number; sigma: number } {
  const { tileSize, gridCols, gridRows, background, noise } = mesh;

  // Continuous grid coordinates normalized to tile centers: center of tile (c, r) is (c + 0.5) * tileSize
  const gx = (x / tileSize) - 0.5;
  const gy = (y / tileSize) - 0.5;

  let c0 = Math.floor(gx);
  let r0 = Math.floor(gy);

  // Clamping to mesh bounds
  if (c0 < 0) c0 = 0;
  if (r0 < 0) r0 = 0;
  let c1 = c0 + 1;
  let r1 = r0 + 1;

  if (c1 >= gridCols) {
    c1 = gridCols - 1;
    if (c0 >= gridCols - 1) c0 = Math.max(0, gridCols - 2);
  }
  if (r1 >= gridRows) {
    r1 = gridRows - 1;
    if (r0 >= gridRows - 1) r0 = Math.max(0, gridRows - 2);
  }

  const u = Math.max(0, Math.min(1, gx - c0));
  const v = Math.max(0, Math.min(1, gy - r0));

  const idx00 = r0 * gridCols + c0;
  const idx10 = r0 * gridCols + c1;
  const idx01 = r1 * gridCols + c0;
  const idx11 = r1 * gridCols + c1;

  // Bilinear interpolation
  const w00 = (1 - u) * (1 - v);
  const w10 = u * (1 - v);
  const w01 = (1 - u) * v;
  const w11 = u * v;

  const bg = (w00 * background[idx00]) + (w10 * background[idx10]) +
             (w01 * background[idx01]) + (w11 * background[idx11]);

  const sigma = (w00 * noise[idx00]) + (w10 * noise[idx10]) +
                (w01 * noise[idx01]) + (w11 * noise[idx11]);

  return { bg, sigma };
}

/**
 * Rapidly rasterizes full-frame continuous 2D background and noise surfaces
 * for an entire image using optimized scanline interpolation.
 */
export function generateContinuousSurfaces(
  mesh: BackgroundMesh
): { backgroundMap: Float32Array; noiseMap: Float32Array } {
  const { width, height } = mesh;
  const totalPixels = width * height;
  const bgMap = new Float32Array(totalPixels);
  const noiseMap = new Float32Array(totalPixels);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const { bg, sigma } = evaluateBackgroundAt(mesh, x, y);
      const idx = rowOffset + x;
      bgMap[idx] = bg;
      noiseMap[idx] = sigma;
    }
  }

  return { backgroundMap: bgMap, noiseMap };
}
