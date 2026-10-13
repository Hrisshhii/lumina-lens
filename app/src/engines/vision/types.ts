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
