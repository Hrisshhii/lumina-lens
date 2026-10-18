import { CameraView } from "expo-camera";
import type {
  CapturedFrame,
  DeviceOrientationData,
  FrameResolutionPreset,
  ObserverCoordinates,
} from "./types";
import { createSyntheticFrame } from "./syntheticStarfield";

export interface FrameAcquisitionOptions {
  preset?: FrameResolutionPreset;
  quality?: number; // 0.0 to 1.0 (defaults to 0.92 for high photometric fidelity)
}

/**
 * Acquires a high-resolution frame from the physical camera device,
 * synchronizing sensor orientation and GPS observer metadata.
 */
export async function acquireCameraFrame(
  cameraRef: { current: CameraView | null },
  observer: ObserverCoordinates,
  orientation: DeviceOrientationData,
  options: FrameAcquisitionOptions = {}
): Promise<CapturedFrame> {
  const quality = options.quality ?? 0.92;
  const timestamp = Date.now();

  if (!cameraRef.current) {
    // Graceful fallback for simulator / web without active camera ref
    console.warn("[VisionEngine] Camera ref not available, generating reference starfield");
    return createSyntheticFrame("orion", observer, orientation);
  }

  try {
    const photo = await cameraRef.current.takePictureAsync({
      quality,
      skipProcessing: false,
    });

    if (!photo || !photo.uri) {
      throw new Error("Camera picture acquisition returned null or empty URI");
    }

    const width = photo.width || 1920;
    const height = photo.height || 1080;

    return {
      id: `frame_${timestamp}`,
      uri: photo.uri,
      width,
      height,
      aspectRatio: width / height,
      timestamp,
      orientation: {
        azimuth: orientation.azimuth,
        altitude: orientation.altitude,
      },
      observer: {
        latitude: observer.latitude,
        longitude: observer.longitude,
      },
      source: "camera",
      metadata: {
        preset: options.preset || "standard_1080p",
        notes: `Physical camera capture @ ${width}x${height}`,
      },
    };
  } catch (err: any) {
    console.warn("[VisionEngine] Frame capture error:", err?.message || err);
    // Fall back to synthetic benchmark if hardware capture fails on unsupported platform
    return createSyntheticFrame("orion", observer, orientation);
  }
}

