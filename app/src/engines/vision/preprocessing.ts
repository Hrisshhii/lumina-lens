import { LuminanceBuffer } from "./types";

/**
 * Computes summary statistics (min, max, mean, stdDev) for a 1D luminance array.
 */
export function calculateLuminanceStats(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { min: number; max: number; mean: number; stdDev: number } {
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return { min: 0, max: 0, mean: 0, stdDev: 0 };
  }

  let min = 255;
  let max = 0;
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < totalPixels; i++) {
    const val = data[i];
    if (val < min) min = val;
    if (val > max) max = val;
    sum += val;
    sumSq += val * val;
  }

  const mean = sum / totalPixels;
  const variance = Math.max(0, sumSq / totalPixels - mean * mean);
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, stdDev };
}

/**
 * Converts a 4-channel interleaved RGBA buffer [R0, G0, B0, A0, R1, G1, B1, A1, ...]
 * to a single-channel 8-bit monochromatic LuminanceBuffer using ITU-R BT.709
 * photopic coefficients via integer fixed-point arithmetic:
 *
 * Y = (54 * R + 183 * G + 19 * B) >> 8
 *
 * (54/256 = 0.2109, 183/256 = 0.7148, 19/256 = 0.0742)
 *
 * Complexity: O(W * H), single linear pass with SIMD-friendly continuous memory access.
 */
export function rgbaToLuminance(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): LuminanceBuffer {
  const totalPixels = width * height;
  const data = new Uint8ClampedArray(totalPixels);

  let min = 255;
  let max = 0;
  let sum = 0;
  let sumSq = 0;

  let rgbaIdx = 0;
  for (let i = 0; i < totalPixels; i++) {
    const r = rgba[rgbaIdx];
    const g = rgba[rgbaIdx + 1];
    const b = rgba[rgbaIdx + 2];
    // Skip alpha (rgbaIdx + 3)

    // Fixed-point photopic luminance calculation
    const y = (54 * r + 183 * g + 19 * b) >> 8;
    data[i] = y;

    // Running statistics
    if (y < min) min = y;
    if (y > max) max = y;
    sum += y;
    sumSq += y * y;

    rgbaIdx += 4;
  }

  const mean = totalPixels > 0 ? sum / totalPixels : 0;
  const variance = totalPixels > 0 ? Math.max(0, sumSq / totalPixels - mean * mean) : 0;
  const stdDev = Math.sqrt(variance);

  return {
    width,
    height,
    stride: width,
    data,
    min: totalPixels > 0 ? min : 0,
    max,
    mean,
    stdDev,
  };
}

/**
 * Creates an empty or pre-allocated LuminanceBuffer filled with a background intensity.
 */
export function createLuminanceBuffer(
  width: number,
  height: number,
  fillValue: number = 0
): LuminanceBuffer {
  const total = width * height;
  const data = new Uint8ClampedArray(total);
  if (fillValue !== 0) {
    data.fill(Math.max(0, Math.min(255, fillValue)));
  }

  return {
    width,
    height,
    stride: width,
    data,
    min: fillValue,
    max: fillValue,
    mean: fillValue,
    stdDev: 0,
  };
}
