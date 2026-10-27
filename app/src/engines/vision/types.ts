/**
 * Vision Engine Data Types & Contracts (Phase 2)
 */

export type FrameResolutionPreset = "preview_720p" | "standard_1080p" | "native_max";

export interface ObserverCoordinates {
  latitude: number;
  longitude: number;
}

export interface DeviceOrientationData {
  azimuth: number;
  altitude: number;
  roll?: number;
}

export interface CapturedFrame {
  id: string;
  uri: string;
  width: number;
  height: number;
  aspectRatio: number;
  timestamp: number; // UTC Epoch timestamp in milliseconds
  orientation: DeviceOrientationData;
  observer: ObserverCoordinates;
  source: "camera" | "synthetic";
  metadata?: {
    preset?: FrameResolutionPreset;
    targetConstellation?: string;
    simulatedStarCount?: number;
    notes?: string;
  };
}

export interface SyntheticStar {
  name?: string;
  x: number; // Normalized 0.0 - 1.0 or pixel coordinates
  y: number;
  magnitude: number;
  color?: string;
}

export interface SyntheticFieldConfig {
  name: string;
  description: string;
  width: number;
  height: number;
  stars: SyntheticStar[];
  backgroundNoiseLevel?: number; // 0.0 to 1.0
  gradientGlow?: boolean;
}

/**
 * Single-channel 8-bit monochromatic luminance buffer [0..255]
 * Stored as a 1D flat row-major typed array for high-performance memory cache locality.
 */
export interface LuminanceBuffer {
  width: number;
  height: number;
  stride: number; // Row stride (equal to width)
  data: Uint8ClampedArray; // Total elements: width * height
  min: number; // Minimum pixel intensity [0..255]
  max: number; // Maximum pixel intensity [0..255]
  mean: number; // Average sky luminance
  stdDev: number; // Standard deviation of luminance
}

export interface PreprocessingOptions {
  enableHotPixelRemoval?: boolean;
  hotPixelThreshold?: number; // Default: 65
  enableGaussianBlur?: boolean; // Default: true (3x3 separable)
}

export interface PreprocessingResult {
  buffer: LuminanceBuffer;
  executionTimeMs: number;
  stagesCompleted: string[];
}

/**
 * Step 4: Background Estimation & Adaptive Thresholding Contracts
 */

export interface BackgroundMesh {
  width: number;
  height: number;
  tileSize: number;
  gridCols: number;
  gridRows: number;
  background: Float32Array; // Size: gridCols * gridRows, containing local B_ij
  noise: Float32Array; // Size: gridCols * gridRows, containing local sigma_ij
  globalMedian: number;
  globalStdDev: number;
}

export interface SegmentationOptions {
  tileSize?: number; // Default: 32 (pixels)
  sigmaMultiplier?: number; // Default: 3.0 (detection sensitivity k)
  minNetIntensity?: number; // Default: 5 (absolute threshold floor to reject pure black noise)
}

export interface SegmentationResult {
  backgroundMesh: BackgroundMesh;
  netLuminance: LuminanceBuffer; // Delta Y = max(0, Y - B)
  starMask: Uint8Array; // Binary mask: 1 = star candidate pixel, 0 = sky background
  candidatePixelCount: number;
  executionTimeMs: number;
}

/**
 * Step 5: Star Blob Detection & Sub-Pixel Centroid Extraction Contracts
 */

export interface RawBlobPixel {
  x: number;
  y: number;
  intensity: number; // Net intensity Delta Y at (x, y)
}

export interface RawBlob {
  id: number;
  pixels: RawBlobPixel[];
  pixelCount: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  peakIntensity: number;
  peakX: number;
  peakY: number;
}

export interface StarCentroid {
  id: number; // 1-based unique index
  x: number; // Sub-pixel X coordinate [0..width)
  y: number; // Sub-pixel Y coordinate [0..height)
  flux: number; // Integrated net flux (M_00 = sum Delta Y)
  peakIntensity: number; // Maximum net intensity
  pixelCount: number; // Number of connected pixels
  fwhm: number; // Full Width at Half Maximum in pixels
  ellipticity: number; // Eccentricity (1 - b/a) [0 = circular, 1 = linear streak]
  instrumentalMagnitude: number; // Pogson instrumental magnitude
  snr: number; // Approximate SNR (peak / local noise)
}

export interface CentroidExtractionOptions {
  minPixelCount?: number; // Default: 2 (reject isolated single-pixel hot spots)
  maxPixelCount?: number; // Default: 300 (reject massive light pollution blobs)
  minFlux?: number; // Default: 12.0 (minimum integrated net luminous flux)
  maxEllipticity?: number; // Default: 0.55 (reject satellite & aircraft streaks)
  minFwhm?: number; // Default: 0.7 px (reject single-pixel spikes)
  maxFwhm?: number; // Default: 9.0 px (reject out-of-focus halos)
  magnitudeZeroPoint?: number; // Pogson zero-point offset C_0 (default: 20.0)
}

export interface CentroidExtractionResult {
  stars: StarCentroid[]; // Array of validated star candidates sorted by brightness
  rawBlobCount: number; // Total blobs identified before morphological filtering
  rejectedCount: number; // Blobs rejected due to size, flux, or ellipticity
  executionTimeMs: number; // Execution time in milliseconds
}

