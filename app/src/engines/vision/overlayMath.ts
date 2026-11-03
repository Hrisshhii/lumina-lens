/**
 * Sub-pixel projection and display math for Star Candidate Overlay.
 */

export interface ScreenMapping {
  x: number;
  y: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Maps coordinate from frame pixel space (W_frame x H_frame)
 * to screen viewport space (W_view x H_view) using uniform aspect-ratio contain/fit.
 */
export function mapFrameToScreen(
  fx: number,
  fy: number,
  frameWidth: number,
  frameHeight: number,
  viewWidth: number,
  viewHeight: number
): ScreenMapping {
  if (frameWidth <= 0 || frameHeight <= 0 || viewWidth <= 0 || viewHeight <= 0) {
    return { x: fx, y: fy, scale: 1, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(viewWidth / frameWidth, viewHeight / frameHeight);
  const offsetX = (viewWidth - frameWidth * scale) / 2;
  const offsetY = (viewHeight - frameHeight * scale) / 2;

  return {
    x: fx * scale + offsetX,
    y: fy * scale + offsetY,
    scale,
    offsetX,
    offsetY,
  };
}

/**
 * Calculates responsive outer reticle radius clamped by integrated flux.
 */
export function getReticleRadius(flux: number): number {
  const minR = 10;
  const maxR = 24;
  const baseR = 12;
  const extra = Math.max(0, Math.log10(Math.max(10, flux) / 100) * 4.5);
  return Math.max(minR, Math.min(maxR, Math.round(baseR + extra)));
}

