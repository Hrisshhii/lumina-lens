import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { DeviceOrientation } from "../engines/sensor";
import { Star } from "../services/api";

interface CameraViewfinderProps {
  orientation: DeviceOrientation;
  stars?: Star[];
  onSelectStar?: (hipId: number) => void;
}

export default function CameraViewfinder({
  orientation,
  stars = [],
  onSelectStar,
}: CameraViewfinderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [showReticle, setShowReticle] = useState(true);
  const [nightMode, setNightMode] = useState(false); // Astro Red Night Vision Mode

  const toggleFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const isSkyFacing = orientation.available && orientation.altitude > 20;

  // 1. Permission Loading State
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Initializing camera subsystem…</Text>
      </View>
    );
  }

  // 2. Permission Denied / Not Granted State
  if (!permission.granted) {
    return (
      <View style={styles.permissionCardContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionBody}>
            Lumina Lens uses the rear camera to align astronomical coordinate grids
            with the live night sky and detect celestial bodies in real time.
          </Text>

          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>

          <Text style={styles.permissionFootnote}>
            No photos or videos are stored without your permission. Processing runs locally on device.
          </Text>
        </View>
      </View>
    );
  }

  // 3. Web or Native Camera View
  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.container, nightMode && styles.nightModeContainer]}>
      {/* Live Camera Feed */}
      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
        >
          {/* Subtle dark-sky contrast vignette */}
          <View
            style={[
              styles.vignetteOverlay,
              nightMode && styles.nightModeVignette,
            ]}
          />
        </CameraView>
      </View>

      {/* Astro Crosshair & Reticle Overlay */}
      {showReticle && (
        <View pointerEvents="none" style={styles.reticleContainer}>
          {/* Outer Altitude Reference Circle */}
          <View
            style={[
              styles.reticleOuterCircle,
              nightMode && styles.redBorder,
            ]}
          />
          {/* Inner Centroid Target Circle */}
          <View
            style={[
              styles.reticleInnerCircle,
              nightMode && styles.redBorder,
            ]}
          />
          {/* Vertical Crosshair Axis */}
          <View
            style={[
              styles.reticleAxisV,
              nightMode && styles.redBackground,
            ]}
          />
          {/* Horizontal Crosshair Axis */}
          <View
            style={[
              styles.reticleAxisH,
              nightMode && styles.redBackground,
            ]}
          />
          {/* Center Target Dot */}
          <View
            style={[
              styles.reticleCenterDot,
              nightMode && styles.redBackground,
            ]}
          />
        </View>
      )}

      {/* Top Floating Sensor HUD */}
      <View style={styles.topHudContainer}>
        <View style={[styles.hudBadge, nightMode && styles.nightModeBadge]}>
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, nightMode && styles.redTextFaint]}>HEADING</Text>
            <Text style={[styles.hudValue, nightMode && styles.redText]}>
              {orientation.available ? `${Math.round(orientation.azimuth)}°` : "—"}
            </Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, nightMode && styles.redTextFaint]}>ELEVATION</Text>
            <Text style={[styles.hudValue, nightMode && styles.redText]}>
              {orientation.available ? `${Math.round(orientation.altitude)}°` : "—"}
            </Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, nightMode && styles.redTextFaint]}>AIM</Text>
            <Text
              style={[
                styles.hudValue,
                isSkyFacing ? styles.skyAim : styles.horizonAim,
                nightMode && styles.redText,
              ]}
            >
              {isSkyFacing ? "🌌 Sky" : "🔭 Horizon"}
            </Text>
          </View>
        </View>

        {isWeb && (
          <View style={styles.webPill}>
            <Text style={styles.webPillText}>🌐 Web Live Feed</Text>
          </View>
        )}
      </View>

      {/* Bottom Floating Control Bar */}
      <View style={styles.bottomBarContainer}>
        {/* Status Hint */}
        <View style={[styles.statusPill, nightMode && styles.nightModeBadge]}>
          <View
            style={[
              styles.statusDot,
              nightMode ? styles.redBackground : styles.greenBackground,
            ]}
          />
          <Text style={[styles.statusText, nightMode && styles.redText]}>
            Lens Active • {stars.length} stars tracked above horizon
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          {/* Flip Camera Facing */}
          <TouchableOpacity
            style={[styles.controlButton, nightMode && styles.nightModeButton]}
            onPress={toggleFacing}
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>🔄</Text>
            <Text style={[styles.controlLabel, nightMode && styles.redText]}>
              {facing === "back" ? "Rear" : "Front"}
            </Text>
          </TouchableOpacity>

          {/* Toggle Reticle Grid */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              showReticle && styles.controlButtonActive,
              nightMode && styles.nightModeButton,
            ]}
            onPress={() => setShowReticle((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>🎯</Text>
            <Text style={[styles.controlLabel, nightMode && styles.redText]}>
              Reticle
            </Text>
          </TouchableOpacity>

          {/* Toggle Astro Red Night Vision */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              nightMode && styles.nightModeButtonActive,
            ]}
            onPress={() => setNightMode((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.controlIcon}>{nightMode ? "🔴" : "🌙"}</Text>
            <Text style={[styles.controlLabel, nightMode && styles.redText]}>
              {nightMode ? "Red Mode" : "Dark Vision"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050811",
    position: "relative",
    overflow: "hidden",
  },
  nightModeContainer: {
    backgroundColor: "#160303",
  },
  cameraWrapper: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5, 8, 17, 0.20)",
  },
  nightModeVignette: {
    backgroundColor: "rgba(180, 20, 20, 0.15)",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#070b14",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 12,
  },
  permissionCardContainer: {
    flex: 1,
    backgroundColor: "#070b14",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  permissionCard: {
    backgroundColor: "#0d1527",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 8,
    textAlign: "center",
  },
  permissionBody: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  permissionButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  permissionFootnote: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 16,
  },
  // Reticle styles
  reticleContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  reticleOuterCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: "rgba(56, 189, 248, 0.35)",
    borderStyle: "dashed",
    position: "absolute",
  },
  reticleInnerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.6)",
    position: "absolute",
  },
  reticleAxisV: {
    width: 1,
    height: 140,
    backgroundColor: "rgba(56, 189, 248, 0.4)",
    position: "absolute",
  },
  reticleAxisH: {
    width: 140,
    height: 1,
    backgroundColor: "rgba(56, 189, 248, 0.4)",
    position: "absolute",
  },
  reticleCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38bdf8",
    position: "absolute",
  },
  redBorder: {
    borderColor: "rgba(239, 68, 68, 0.7)",
  },
  redBackground: {
    backgroundColor: "#ef4444",
  },
  redText: {
    color: "#f87171",
  },
  redTextFaint: {
    color: "#fca5a5",
  },
  // HUD styles
  topHudContainer: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    alignItems: "center",
    gap: 8,
  },
  hudBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(9, 13, 22, 0.85)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(30, 41, 59, 0.9)",
  },
  nightModeBadge: {
    backgroundColor: "rgba(30, 8, 8, 0.9)",
    borderColor: "rgba(185, 28, 28, 0.6)",
  },
  hudItem: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  hudLabel: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  hudValue: {
    fontSize: 13,
    color: "#f1f5f9",
    fontWeight: "700",
    marginTop: 2,
  },
  hudDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#1e293b",
  },
  skyAim: {
    color: "#38bdf8",
  },
  horizonAim: {
    color: "#94a3b8",
  },
  webPill: {
    backgroundColor: "rgba(37, 99, 235, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  webPillText: {
    fontSize: 11,
    color: "#93c5fd",
    fontWeight: "600",
  },
  // Bottom Controls
  bottomBarContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(9, 13, 22, 0.82)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(30, 41, 59, 0.8)",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  greenBackground: {
    backgroundColor: "#10b981",
  },
  statusText: {
    fontSize: 11,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 6,
  },
  controlButtonActive: {
    backgroundColor: "rgba(30, 58, 138, 0.8)",
    borderColor: "#3b82f6",
  },
  nightModeButton: {
    backgroundColor: "rgba(45, 10, 10, 0.85)",
    borderColor: "#7f1d1d",
  },
  nightModeButtonActive: {
    backgroundColor: "rgba(127, 29, 29, 0.9)",
    borderColor: "#ef4444",
  },
  controlIcon: {
    fontSize: 14,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e2e8f0",
  },
});
