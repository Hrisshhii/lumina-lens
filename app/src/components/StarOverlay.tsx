import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { StarCentroid } from "../engines/vision/types";

export interface StarOverlayProps {
  stars: StarCentroid[];
  frameWidth: number;
  frameHeight: number;
  viewWidth: number;
  viewHeight: number;
  selectedStarId?: number | null;
  onSelectStar?: (star: StarCentroid) => void;
  nightMode?: boolean;
  showLabels?: boolean;
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
): { x: number; y: number; scale: number } {
  if (frameWidth <= 0 || frameHeight <= 0 || viewWidth <= 0 || viewHeight <= 0) {
    return { x: fx, y: fy, scale: 1 };
  }

  const scale = Math.min(viewWidth / frameWidth, viewHeight / frameHeight);
  const offsetX = (viewWidth - frameWidth * scale) / 2;
  const offsetY = (viewHeight - frameHeight * scale) / 2;

  return {
    x: fx * scale + offsetX,
    y: fy * scale + offsetY,
    scale,
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

export default function StarOverlay({
  stars,
  frameWidth,
  frameHeight,
  viewWidth,
  viewHeight,
  selectedStarId,
  onSelectStar,
  nightMode = false,
  showLabels = true,
}: StarOverlayProps) {
  if (!stars || stars.length === 0 || viewWidth <= 0 || viewHeight <= 0) {
    return null;
  }

  // Theme colors based on nightMode
  const reticleBorderColor = nightMode ? "#ef4444" : "#38bdf8";
  const reticleBgColor = nightMode ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.12)";
  const brightBorderColor = nightMode ? "#f87171" : "#f59e0b";
  const crosshairColor = nightMode ? "#fca5a5" : "#ffffff";
  const labelTextColor = nightMode ? "#fca5a5" : "#bae6fd";
  const badgeBg = nightMode ? "rgba(69, 10, 10, 0.85)" : "rgba(15, 23, 42, 0.85)";
  const badgeBorder = nightMode ? "#b91c1c" : "#0284c7";

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {stars.map((star) => {
        const { x, y } = mapFrameToScreen(
          star.x,
          star.y,
          frameWidth,
          frameHeight,
          viewWidth,
          viewHeight
        );

        const isSelected = selectedStarId === star.id;
        const isBright = star.flux > 4000;
        const radius = getReticleRadius(star.flux) + (isSelected ? 4 : 0);
        const diameter = radius * 2;
        const touchSize = Math.max(34, diameter + 10);

        const currentBorderColor = isSelected
          ? "#22c55e"
          : isBright
          ? brightBorderColor
          : reticleBorderColor;

        return (
          <React.Fragment key={star.id}>
            {/* Interactive Touch Target */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSelectStar?.(star)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.touchTarget,
                {
                  left: x - touchSize / 2,
                  top: y - touchSize / 2,
                  width: touchSize,
                  height: touchSize,
                },
              ]}
            >
              {/* Outer Reticle Ring */}
              <View
                style={[
                  styles.reticleRing,
                  {
                    width: diameter,
                    height: diameter,
                    borderRadius: radius,
                    borderColor: currentBorderColor,
                    backgroundColor: isSelected
                      ? "rgba(34, 197, 94, 0.20)"
                      : reticleBgColor,
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
              >
                {/* Horizontal Centroid Crosshair */}
                <View
                  style={[
                    styles.crosshairH,
                    {
                      backgroundColor: crosshairColor,
                      width: Math.max(6, Math.round(radius * 0.7)),
                    },
                  ]}
                />
                {/* Vertical Centroid Crosshair */}
                <View
                  style={[
                    styles.crosshairV,
                    {
                      backgroundColor: crosshairColor,
                      height: Math.max(6, Math.round(radius * 0.7)),
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>

            {/* Label / ID Pill */}
            {showLabels && (
              <View
                pointerEvents="none"
                style={[
                  styles.labelPill,
                  {
                    left: x + radius + 4,
                    top: y - 8,
                    backgroundColor: badgeBg,
                    borderColor: isSelected ? "#22c55e" : badgeBorder,
                  },
                ]}
              >
                <Text style={[styles.labelText, { color: labelTextColor }]}>
                  #{star.id} {star.fwhm ? `${star.fwhm}px` : ""}
                </Text>
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  reticleRing: {
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    position: "absolute",
    height: 1,
  },
  crosshairV: {
    position: "absolute",
    width: 1,
  },
  labelPill: {
    position: "absolute",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 25,
  },
  labelText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
