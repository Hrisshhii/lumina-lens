import { useState, useEffect } from "react";
import { Magnetometer, Accelerometer } from "expo-sensors";

export interface DeviceOrientation {
  azimuth: number;   // Compass heading in degrees: 0° to 360° (0=N, 90=E, 180=S, 270=W)
  altitude: number;  // Elevation angle above horizon: 0° to 90° (0=Horizon, 90=Zenith)
  available: boolean;
}

// Shortest-arc angular smoothing for 0°-360° compass values
function smoothAngle(prev: number, curr: number, factor: number = 0.25): number {
  let diff = curr - prev;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return (prev + diff * factor + 360) % 360;
}

/**
 * Custom React hook for live device orientation (heading & sky pitch).
 * Combines Magnetometer (compass heading) and Accelerometer (sky elevation angle).
 */
export function useDeviceOrientation(updateIntervalMs: number = 100): DeviceOrientation {
  const [orientation, setOrientation] = useState<DeviceOrientation>({
    azimuth: 0,
    altitude: 0,
    available: false,
  });

  useEffect(() => {
    let isMounted = true;
    let currentAzimuth = 0;
    let currentAltitude = 0;

    Magnetometer.setUpdateInterval(updateIntervalMs);
    Accelerometer.setUpdateInterval(updateIntervalMs);

    let magSub: { remove: () => void } | null = null;
    let accelSub: { remove: () => void } | null = null;

    async function startSensors() {
      try {
        const [hasMag, hasAccel] = await Promise.all([
          Magnetometer.isAvailableAsync(),
          Accelerometer.isAvailableAsync(),
        ]);

        if (!isMounted) return;

        if (!hasMag && !hasAccel) {
          setOrientation((prev) => ({ ...prev, available: false }));
          return;
        }

        setOrientation((prev) => ({ ...prev, available: true }));

        // Magnetometer -> Azimuth / Compass Heading (0° - 360°)
        if (hasMag) {
          magSub = Magnetometer.addListener((data) => {
            if (!isMounted) return;
            // In portrait orientation:
            let angle = Math.atan2(-data.x, data.y) * (180 / Math.PI);
            if (angle < 0) angle += 360;

            currentAzimuth = smoothAngle(currentAzimuth, angle, 0.2);

            setOrientation((prev) => ({
              ...prev,
              azimuth: Math.round(currentAzimuth * 10) / 10,
            }));
          });
        }

        // Accelerometer -> Altitude / Sky Elevation Angle (0° - 90°)
        if (hasAccel) {
          accelSub = Accelerometer.addListener((data) => {
            if (!isMounted) return;
            // In portrait orientation:
            // Standing upright facing horizon: y ≈ -1, z ≈ 0 -> 0°
            // Tilting camera up to zenith: z > 0, y -> 0 -> 90°
            const rawPitch = Math.atan2(data.z, -data.y) * (180 / Math.PI);
            const clamped = Math.max(0, Math.min(90, rawPitch));

            currentAltitude = currentAltitude * 0.8 + clamped * 0.2;

            setOrientation((prev) => ({
              ...prev,
              altitude: Math.round(currentAltitude * 10) / 10,
            }));
          });
        }
      } catch (err) {
        console.warn("Could not start device orientation sensors:", err);
      }
    }

    startSensors();

    return () => {
      isMounted = false;
      magSub?.remove();
      accelSub?.remove();
    };
  }, [updateIntervalMs]);

  return orientation;
}

