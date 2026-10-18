import { CapturedFrame, DeviceOrientationData, ObserverCoordinates, SyntheticFieldConfig } from "./types";

/**
 * Pre-calibrated astronomical benchmark asterisms for offline vision pipeline testing.
 */
export const BENCHMARK_ASTERISMS: Record<string, SyntheticFieldConfig> = {
  orion: {
    name: "Orion (The Hunter)",
    description: "Equatorial winter constellation with bright Betelgeuse, Rigel, and Belt trio.",
    width: 1920,
    height: 1080,
    stars: [
      { name: "Betelgeuse (α Ori)", x: 0.38, y: 0.28, magnitude: 0.45, color: "#fca5a5" },
      { name: "Rigel (β Ori)", x: 0.64, y: 0.74, magnitude: 0.18, color: "#93c5fd" },
      { name: "Bellatrix (γ Ori)", x: 0.62, y: 0.30, magnitude: 1.64, color: "#bfdbfe" },
      { name: "Saiph (κ Ori)", x: 0.40, y: 0.76, magnitude: 2.07, color: "#dbeafe" },
      { name: "Alnitak (ζ Ori)", x: 0.46, y: 0.53, magnitude: 1.74, color: "#e2e8f0" },
      { name: "Alnilam (ε Ori)", x: 0.50, y: 0.52, magnitude: 1.69, color: "#f8fafc" },
      { name: "Mintaka (δ Ori)", x: 0.54, y: 0.51, magnitude: 2.25, color: "#e2e8f0" },
      { name: "Meissa (λ Ori)", x: 0.50, y: 0.18, magnitude: 3.39, color: "#94a3b8" },
      // Faint field stars
      { x: 0.22, y: 0.15, magnitude: 4.8 },
      { x: 0.75, y: 0.82, magnitude: 4.2 },
      { x: 0.30, y: 0.60, magnitude: 5.1 },
      { x: 0.70, y: 0.40, magnitude: 4.6 },
    ],
  },
  summer_triangle: {
    name: "Summer Triangle",
    description: "Prominent northern summer asterism formed by Vega, Altair, and Deneb.",
    width: 1920,
    height: 1080,
    stars: [
      { name: "Vega (α Lyr)", x: 0.35, y: 0.25, magnitude: 0.03, color: "#93c5fd" },
      { name: "Altair (α Aql)", x: 0.50, y: 0.78, magnitude: 0.76, color: "#ffffff" },
      { name: "Deneb (α Cyg)", x: 0.72, y: 0.32, magnitude: 1.25, color: "#ffffff" },
      { name: "Albireo (β Cyg)", x: 0.56, y: 0.48, magnitude: 3.05, color: "#fde047" },
      { name: "Sadr (γ Cyg)", x: 0.66, y: 0.38, magnitude: 2.23, color: "#e2e8f0" },
      { name: "Tarazed (γ Aql)", x: 0.48, y: 0.74, magnitude: 2.72, color: "#fed7aa" },
      // Field stars
      { x: 0.20, y: 0.45, magnitude: 4.5 },
      { x: 0.82, y: 0.65, magnitude: 4.1 },
      { x: 0.38, y: 0.90, magnitude: 5.2 },
    ],
  },
  cassiopeia: {
    name: "Cassiopeia (The 'W')",
    description: "Circumpolar northern constellation with iconic five-star zig-zag.",
    width: 1920,
    height: 1080,
    stars: [
      { name: "Schedar (α Cas)", x: 0.38, y: 0.58, magnitude: 2.24, color: "#fef08a" },
      { name: "Caph (β Cas)", x: 0.25, y: 0.42, magnitude: 2.28, color: "#f8fafc" },
      { name: "Navi (γ Cas)", x: 0.52, y: 0.46, magnitude: 2.15, color: "#93c5fd" },
      { name: "Ruchbah (δ Cas)", x: 0.68, y: 0.56, magnitude: 2.68, color: "#ffffff" },
      { name: "Segin (ε Cas)", x: 0.80, y: 0.40, magnitude: 3.35, color: "#bfdbfe" },
      // Field stars
      { x: 0.45, y: 0.30, magnitude: 4.7 },
      { x: 0.60, y: 0.72, magnitude: 4.3 },
      { x: 0.15, y: 0.65, magnitude: 5.0 },
    ],
  },
};

/**
 * Generate a valid SVG data URI of a synthetic night-sky starfield.
 * Each star is rendered with Gaussian point spread function (PSF) halos.
 */
export function generateSyntheticStarfieldSvg(config: SyntheticFieldConfig): string {
  const { width, height, stars } = config;

  const starElements = stars.map((s, idx) => {
    const px = Math.round(s.x * width);
    const py = Math.round(s.y * height);

    // Calculate Airy disk radius based on visual magnitude (lower mag = brighter = larger blur)
    const normalizedBrightness = Math.max(0.1, 5.5 - s.magnitude);
    const coreRadius = Math.max(1.5, normalizedBrightness * 1.4);
    const haloRadius = coreRadius * 3.0;
    const color = s.color || "#ffffff";

    return `
      <!-- Star ${s.name || idx} (Mag ${s.magnitude}) -->
      <circle cx="${px}" cy="${py}" r="${haloRadius.toFixed(1)}" fill="${color}" opacity="0.25" filter="url(#glow)" />
      <circle cx="${px}" cy="${py}" r="${coreRadius.toFixed(1)}" fill="${color}" opacity="0.95" />
      <circle cx="${px}" cy="${py}" r="${Math.max(1, coreRadius * 0.4).toFixed(1)}" fill="#ffffff" opacity="1" />
    `;
  }).join("\n");

  const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#020409" />
        <stop offset="60%" stop-color="#050814" />
        <stop offset="100%" stop-color="#090f24" />
      </linearGradient>
      <radialGradient id="airglow" cx="50%" cy="100%" r="70%">
        <stop offset="0%" stop-color="#0e1b38" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#020409" stop-opacity="0" />
      </radialGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
      </filter>
    </defs>
    <!-- Dark Sky Background -->
    <rect width="${width}" height="${height}" fill="url(#nightSky)" />
    <rect width="${width}" height="${height}" fill="url(#airglow)" />
    <!-- Calibrated Star Field -->
    ${starElements}
  </svg>`;

  // Encode as browser & React Native compatible data URI
  const encoded = encodeURIComponent(svgXml)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/**
 * Creates a synthetic CapturedFrame conforming to the Vision Engine contract.
 */
export function createSyntheticFrame(
  asterismKey: keyof typeof BENCHMARK_ASTERISMS = "orion",
  observer: ObserverCoordinates = { latitude: 18.5204, longitude: 73.8567 },
  orientation: DeviceOrientationData = { azimuth: 180, altitude: 45 }
): CapturedFrame {
  const config = BENCHMARK_ASTERISMS[asterismKey] || BENCHMARK_ASTERISMS.orion;
  const svgUri = generateSyntheticStarfieldSvg(config);

  return {
    id: `synthetic_${asterismKey}_${Date.now()}`,
    uri: svgUri,
    width: config.width,
    height: config.height,
    aspectRatio: config.width / config.height,
    timestamp: Date.now(),
    orientation,
    observer,
    source: "synthetic",
    metadata: {
      preset: "standard_1080p",
      targetConstellation: config.name,
      simulatedStarCount: config.stars.length,
      notes: config.description,
    },
  };
}

/**
 * Generates a raw RGBA pixel buffer [R, G, B, A, ...] for a synthetic starfield asterism.
 * Useful for headless testing, pixel-level computer vision algorithms, and benchmarks.
 */
export function generateSyntheticRgba(
  config: SyntheticFieldConfig,
  targetWidth?: number,
  targetHeight?: number
): Uint8ClampedArray {
  const width = targetWidth || config.width;
  const height = targetHeight || config.height;
  const total = width * height;
  const rgba = new Uint8ClampedArray(total * 4);

  // 1. Dark sky background gradient with mild Poisson-like noise
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    const gradient = Math.round(8 + (y / height) * 8); // 8 at top, 16 at bottom
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const noise = ((Math.random() * 6 - 3) | 0);
      const val = Math.max(0, Math.min(255, gradient + noise));
      rgba[idx] = val;         // R
      rgba[idx + 1] = val;     // G
      rgba[idx + 2] = val + 3; // B (faint cosmic blue)
      rgba[idx + 3] = 255;     // A
    }
  }

  // 2. Synthesize Gaussian Point Spread Functions for each star
  for (const star of config.stars) {
    const cx = star.x * width;
    const cy = star.y * height;
    const peakIntensity = Math.min(255, Math.max(40, Math.round(255 - star.magnitude * 40)));
    const sigma = Math.max(1.0, (5.5 - star.magnitude) * 0.5);
    const radius = Math.ceil(sigma * 3);

    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));

    for (let py = minY; py <= maxY; py++) {
      const dy = py - cy;
      const rowOffset = py * width * 4;
      for (let px = minX; px <= maxX; px++) {
        const dx = px - cx;
        const distSq = dx * dx + dy * dy;
        const flux = Math.round(peakIntensity * Math.exp(-distSq / (2 * sigma * sigma)));
        if (flux > 0) {
          const idx = rowOffset + px * 4;
          rgba[idx] = Math.min(255, rgba[idx] + flux);
          rgba[idx + 1] = Math.min(255, rgba[idx + 1] + flux);
          rgba[idx + 2] = Math.min(255, rgba[idx + 2] + flux);
        }
      }
    }
  }

  return rgba;
}


