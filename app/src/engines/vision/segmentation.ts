/**
 * Lumina Lens — Segmentation & Adaptive Thresholding (Phase 2 Step 4)
 * Generates gradient-flattened net luminance and binary star candidate masks
 * using Constant False Alarm Rate (CFAR) statistical thresholding.
 */

import type {
  LuminanceBuffer,
  BackgroundMesh,
  SegmentationOptions,
  SegmentationResult,
} from "./types";
import { estimateBackgroundMesh, evaluateBackgroundAt } from "./background";

/**
 * Segment a preprocessed luminance buffer into net star luminance and a binary candidate mask.
 * 
 * @param buffer Monochromatic preprocessed luminance buffer (e.g. from Step 3).
 * @param options Segmentation parameters (tile size, sigma multiplier, intensity floor).
 * @returns SegmentationResult containing background mesh, net luminance buffer, and binary star mask.
 */
export function segmentLuminanceFrame(
  buffer: LuminanceBuffer,
  options?: SegmentationOptions
): SegmentationResult {
  const startTime = performance.now();

  const tileSize = options?.tileSize ?? 32;
  const k = options?.sigmaMultiplier ?? 3.0;
  const minNetIntensity = options?.minNetIntensity ?? 5;

  // 1. Part 1: Estimate local background mesh
  const mesh = estimateBackgroundMesh(buffer, tileSize);

  const { width, height, data } = buffer;
  const totalPixels = width * height;

  // 2. Part 2: Allocate net luminance buffer and binary star candidate mask
  const netData = new Uint8ClampedArray(totalPixels);
  const starMask = new Uint8Array(totalPixels);

  let candidateCount = 0;
  let minNet = 255;
  let maxNet = 0;
  let sumNet = 0;
  let sumSqNet = 0;

  // Fast single-pass scanline thresholding and net subtraction
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const rawVal = data[idx];

      // Continuous local background and noise floor
      const { bg, sigma } = evaluateBackgroundAt(mesh, x, y);

      // Local statistical detection threshold (CFAR)
      const threshold = bg + k * sigma;

      // Net luminance with sky background subtracted
      const netVal = Math.max(0, Math.min(255, Math.round(rawVal - bg)));
      netData[idx] = netVal;

      // Track net buffer statistics
      if (netVal < minNet) minNet = netVal;
      if (netVal > maxNet) maxNet = netVal;
      sumNet += netVal;
      sumSqNet += netVal * netVal;

      // Mark candidate star pixel if above local statistical threshold and absolute floor
      if (rawVal > threshold && netVal >= minNetIntensity) {
        starMask[idx] = 1;
        candidateCount++;
      }
    }
  }

  const meanNet = totalPixels > 0 ? sumNet / totalPixels : 0;
  const varianceNet = totalPixels > 0 ? Math.max(0, sumSqNet / totalPixels - meanNet * meanNet) : 0;
  const stdDevNet = Math.sqrt(varianceNet);

  const netLuminance: LuminanceBuffer = {
    width,
    height,
    stride: width,
    data: netData,
    min: totalPixels > 0 ? minNet : 0,
    max: maxNet,
    mean: meanNet,
    stdDev: stdDevNet,
  };

  const executionTimeMs = performance.now() - startTime;

  return {
    backgroundMesh: mesh,
    netLuminance,
    starMask,
    candidatePixelCount: candidateCount,
    executionTimeMs,
  };
}
