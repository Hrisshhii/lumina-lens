import React, { useState, useRef } from "react";
import { ActivityIndicator,Image,Platform,StyleSheet,Text,TouchableOpacity,View,} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { DeviceOrientation } from "../engines/sensor";
import { Star } from "../services/api";
import {
  CapturedFrame,
  FrameResolutionPreset,
  PreprocessingResult,
  SegmentationResult,
  StarCentroid,
  CentroidExtractionResult,
  acquireCameraFrame,
  createSyntheticFrame,
  preprocessFrame,
  segmentLuminanceFrame,
  extractStarCentroids,
  generateSyntheticRgba,
  BENCHMARK_ASTERISMS,
} from "../engines/vision";

interface CameraViewfinderProps {
  orientation: DeviceOrientation;
  observer?: {
    latitude: number;
    longitude: number;
  };
  stars?: Star[];
  onSelectStar?: (hipId: number) => void;
  onFrameAcquired?: (frame: CapturedFrame) => void;
}

const BENCHMARK_KEYS = Object.keys(BENCHMARK_ASTERISMS) as Array<keyof typeof BENCHMARK_ASTERISMS>;

export default function CameraViewfinder({
  orientation,
  observer = { latitude: 18.5204, longitude: 73.8567 },
  stars = [],
  onSelectStar,
  onFrameAcquired,
}: CameraViewfinderProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [showReticle, setShowReticle] = useState(true);
  const [nightMode, setNightMode] = useState(false); // Astro Red Night Vision Mode

  // Phase 2 Step 2: Frame Acquisition state
  const [capturing, setCapturing] = useState(false);
  const [latestFrame, setLatestFrame] = useState<CapturedFrame | null>(null);
  const [resolutionPreset, setResolutionPreset] = useState<FrameResolutionPreset>("standard_1080p");
  const [benchmarkIndex, setBenchmarkIndex] = useState(0);

  // Phase 2 Step 3: Preprocessing state
  const [preprocessing, setPreprocessing] = useState(false);
  const [preprocessedResult, setPreprocessedResult] = useState<PreprocessingResult | null>(null);

  // Phase 2 Step 4: Background Estimation & Adaptive Segmentation state
  const [segmenting, setSegmenting] = useState(false);
  const [segmentationResult, setSegmentationResult] = useState<SegmentationResult | null>(null);

  // Phase 2 Step 5: Blob Detection & Sub-Pixel Centroid Extraction state
  const [extractingCentroids, setExtractingCentroids] = useState(false);
  const [centroidResult, setCentroidResult] = useState<CentroidExtractionResult | null>(null);

  const toggleFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const isSkyFacing = orientation.available && orientation.altitude > 20;

  // Handle live camera shutter tap
  const handleShutterCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    setPreprocessedResult(null);
    setSegmentationResult(null);
    setCentroidResult(null);
    try {
      const frame = await acquireCameraFrame(
        cameraRef,
        observer,
        { azimuth: orientation.azimuth, altitude: orientation.altitude },
        { preset: resolutionPreset }
      );
      setLatestFrame(frame);
      onFrameAcquired?.(frame);
    } catch (err) {
      console.warn("[CameraViewfinder] Capture error:", err);
    } finally {
      setCapturing(false);
    }
  };

  // Handle synthetic benchmark asterism injection
  const handleInjectBenchmark = () => {
    const nextIndex = (benchmarkIndex + 1) % BENCHMARK_KEYS.length;
    setBenchmarkIndex(nextIndex);
    setPreprocessedResult(null);
    setSegmentationResult(null);
    setCentroidResult(null);
    const key = BENCHMARK_KEYS[benchmarkIndex];
    const frame = createSyntheticFrame(
      key,
      observer,
      { azimuth: orientation.azimuth, altitude: orientation.altitude }
    );
    setLatestFrame(frame);
    onFrameAcquired?.(frame);
  };

  // Run Phase 2 Step 3 Preprocessing pipeline on the current frame
  const handlePreprocess = () => {
    if (!latestFrame || preprocessing) return;
    setPreprocessing(true);
    setSegmentationResult(null);
    setCentroidResult(null);
    setTimeout(() => {
      try {
        let rgba: Uint8ClampedArray;
        const width = Math.min(latestFrame.width, 960);
        const height = Math.round(width / latestFrame.aspectRatio);

        if (latestFrame.source === "synthetic") {
          const targetName = latestFrame.metadata?.targetConstellation?.toLowerCase() || "";
          const constellationKey = targetName.includes("summer")
            ? "summer_triangle"
            : targetName.includes("cassiopeia")
            ? "cassiopeia"
            : "orion";

          const config = BENCHMARK_ASTERISMS[constellationKey] || BENCHMARK_ASTERISMS.orion;
          rgba = generateSyntheticRgba(config, width, height);
        } else {
          rgba = new Uint8ClampedArray(width * height * 4);
          rgba.fill(14);
        }

        const result = preprocessFrame(rgba, width, height, {
          enableHotPixelRemoval: true,
          enableGaussianBlur: true,
        });
        setPreprocessedResult(result);
      } catch (err) {
        console.warn("[CameraViewfinder] Preprocessing error:", err);
      } finally {
        setPreprocessing(false);
      }
    }, 10);
  };

  // Run Phase 2 Step 4 Background Estimation & Adaptive Segmentation
  const handleSegment = () => {
    if (!preprocessedResult || segmenting) return;
    setSegmenting(true);
    setCentroidResult(null);
    setTimeout(() => {
      try {
        const result = segmentLuminanceFrame(preprocessedResult.buffer, {
          tileSize: 32,
          sigmaMultiplier: 3.2,
          minNetIntensity: 5,
        });
        setSegmentationResult(result);
      } catch (err) {
        console.warn("[CameraViewfinder] Segmentation error:", err);
      } finally {
        setSegmenting(false);
      }
    }, 10);
  };

  // Run Phase 2 Step 5 Blob Detection & Sub-Pixel Centroid Extraction
  const handleExtractCentroids = () => {
    if (!segmentationResult || extractingCentroids) return;
    setExtractingCentroids(true);
    setTimeout(() => {
      try {
        const result = extractStarCentroids(
          segmentationResult.starMask,
          segmentationResult.netLuminance,
          {
            minPixelCount: 2,
            maxEllipticity: 0.55,
            minFlux: 12.0,
          },
          segmentationResult.backgroundMesh.globalStdDev
        );
        setCentroidResult(result);
      } catch (err) {
        console.warn("[CameraViewfinder] Centroid extraction error:", err);
      } finally {
        setExtractingCentroids(false);
      }
    }, 10);
  };



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

          {/* Quick fallback: Test synthetic field without permissions */}
          <TouchableOpacity
            style={styles.benchmarkFallbackButton}
            onPress={handleInjectBenchmark}
            activeOpacity={0.8}
          >
            <Text style={styles.benchmarkFallbackText}>⚡ Test Synthetic Starfield</Text>
          </TouchableOpacity>

          <Text style={styles.permissionFootnote}>
            No photos or videos are stored without your permission. Processing runs locally on device.
          </Text>
        </View>
      </View>
    );
  }

  const isWeb = Platform.OS === "web";
  const currentBenchmarkName = BENCHMARK_ASTERISMS[BENCHMARK_KEYS[benchmarkIndex]]?.name || "Orion";

  return (
    <View style={[styles.container, nightMode && styles.nightModeContainer]}>
      {/* Live Camera Feed */}
      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing}>
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
          <View
            style={[
              styles.reticleOuterCircle,
              nightMode && styles.redBorder,
            ]}
          />
          <View
            style={[
              styles.reticleInnerCircle,
              nightMode && styles.redBorder,
            ]}
          />
          <View
            style={[
              styles.reticleAxisV,
              nightMode && styles.redBackground,
            ]}
          />
          <View
            style={[
              styles.reticleAxisH,
              nightMode && styles.redBackground,
            ]}
          />
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

        <View style={styles.topBadgesRow}>
          {isWeb && (
            <View style={styles.webPill}>
              <Text style={styles.webPillText}>🌐 Web Live Feed</Text>
            </View>
          )}

          {/* Resolution Badge */}
          <TouchableOpacity style={[styles.resPill, nightMode && styles.nightModeBadge]}
            onPress={() =>
              setResolutionPreset((prev) =>
                prev === "standard_1080p" ? "preview_720p" : "standard_1080p"
              )
            }
          >
            <Text style={[styles.resPillText, nightMode && styles.redText]}>
              {resolutionPreset === "standard_1080p" ? "1080p FHD" : "720p HD"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Captured Frame Preview Card (Phase 2 Steps 2 & 3) */}
      {latestFrame && (
        <View style={[styles.frameCard, nightMode && styles.nightModeBadge]}>
          <Image
            source={{ uri: latestFrame.uri }}
            style={styles.frameThumbnail}
            resizeMode="cover"
          />
          <View style={styles.frameInfoCol}>
            <View style={styles.frameHeaderRow}>
              <Text style={[styles.frameTitle, nightMode && styles.redText]}>
                {latestFrame.source === "synthetic"
                  ? `⚡ ${latestFrame.metadata?.targetConstellation || "Synthetic Field"}`
                  : "📷 Live Sky Frame"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setLatestFrame(null);
                  setPreprocessedResult(null);
                  setSegmentationResult(null);
                  setCentroidResult(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.frameCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.frameSubText}>
              {latestFrame.width}×{latestFrame.height} • {latestFrame.aspectRatio.toFixed(2)}:1
            </Text>

            {/* Preprocessing Actions & Results (Step 3) */}
            {preprocessedResult ? (
              <View style={styles.preprocessMetricsBox}>
                <View style={styles.metricsRow}>
                  <View style={styles.preprocessBadge}>
                    <Text style={styles.preprocessBadgeText}>
                      ✨ Y ({preprocessedResult.executionTimeMs.toFixed(0)}ms)
                    </Text>
                  </View>
                  {!segmentationResult && (
                    <TouchableOpacity
                      style={[styles.segmentBtn, nightMode && styles.nightModeButton]}
                      onPress={handleSegment} disabled={segmenting} activeOpacity={0.7}
                    >
                      {segmenting ? (
                        <ActivityIndicator size="small" color="#a78bfa" />
                      ) : (
                        <Text style={styles.segmentBtnText}>🌓 Segment (Step 4)</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.preprocessStatsText}>
                  Y: [{preprocessedResult.buffer.min}..{preprocessedResult.buffer.max}] • μ: {preprocessedResult.buffer.mean.toFixed(1)} • σ: {preprocessedResult.buffer.stdDev.toFixed(1)}
                </Text>

                {/* Segmentation Actions & Results (Step 4 & 5) */}
                {segmentationResult && (
                  <View style={styles.segmentMetricsBox}>
                    <View style={styles.metricsRow}>
                      <View style={styles.segmentBadge}>
                        <Text style={styles.segmentBadgeText}>
                          🌓 CFAR ({segmentationResult.executionTimeMs.toFixed(0)}ms)
                        </Text>
                      </View>
                      {!centroidResult && (
                        <TouchableOpacity
                          style={[styles.centroidBtn, nightMode && styles.nightModeButton]}
                          onPress={handleExtractCentroids}
                          disabled={extractingCentroids}
                          activeOpacity={0.7}
                        >
                          {extractingCentroids ? (
                            <ActivityIndicator size="small" color="#f59e0b" />
                          ) : (
                            <Text style={styles.centroidBtnText}>⭐ Centroids (Step 5)</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.segmentStatsText}>
                      Bg: {segmentationResult.backgroundMesh.globalMedian.toFixed(1)} • Stars: {segmentationResult.candidatePixelCount} px
                    </Text>

                    {/* Centroid Extraction Results (Step 5) */}
                    {centroidResult && (
                      <View style={styles.centroidMetricsBox}>
                        <View style={styles.centroidBadge}>
                          <Text style={styles.centroidBadgeText}>
                            ⭐ Centroids ({centroidResult.executionTimeMs.toFixed(0)}ms)
                          </Text>
                        </View>
                        <Text style={styles.centroidStatsText}>
                          {centroidResult.stars.length} stars resolved • Top Flux: {centroidResult.stars[0]?.flux ?? 0}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.preprocessActionRow}>
                <Text style={[styles.frameOrientationText, nightMode && styles.redTextFaint]}>
                  Az {Math.round(latestFrame.orientation.azimuth)}° • Alt {Math.round(latestFrame.orientation.altitude)}°
                </Text>
                <TouchableOpacity
                  style={[styles.preprocessBtn, nightMode && styles.nightModeButton]}
                  onPress={handlePreprocess} disabled={preprocessing} activeOpacity={0.7}
                >
                  {preprocessing ? (
                    <ActivityIndicator size="small" color="#38bdf8" />
                  ) : (
                    <Text style={styles.preprocessBtnText}>✨ Preprocess (Step 3)</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Bottom Floating Control Bar */}
      <View style={styles.bottomBarContainer}>
        {/* Shutter Action Row */}
        <View style={styles.shutterRow}>
          {/* Synthetic Benchmark Injection Button */}
          <TouchableOpacity
            style={[styles.benchmarkButton, nightMode && styles.nightModeButton]}
            onPress={handleInjectBenchmark} activeOpacity={0.7}
          >
            <Text style={styles.benchmarkIcon}>⚡</Text>
            <Text style={[styles.benchmarkText, nightMode && styles.redText]}>
              {currentBenchmarkName.split(" ")[0]}
            </Text>
          </TouchableOpacity>

          {/* Stargazer Camera Shutter Button */}
          <TouchableOpacity
            style={[
              styles.shutterOuterRing,
              capturing && styles.shutterCapturingRing,
              nightMode && styles.redShutterRing,
            ]}
            onPress={handleShutterCapture} disabled={capturing} activeOpacity={0.75}
          >
            <View
              style={[
                styles.shutterInnerCircle,
                capturing && styles.shutterCapturingCircle,
                nightMode && styles.redShutterCircle,
              ]}
            >
              {capturing && <ActivityIndicator size="small" color="#ffffff" />}
            </View>
          </TouchableOpacity>

          {/* Flip Camera Facing */}
          <TouchableOpacity
            style={[styles.smallSideButton, nightMode && styles.nightModeButton]}
            onPress={toggleFacing} activeOpacity={0.7}
          >
            <Text style={styles.smallSideIcon}>🔄</Text>
            <Text style={[styles.smallSideText, nightMode && styles.redText]}>
              {facing === "back" ? "Rear" : "Front"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Toggles Row */}
        <View style={styles.controlsRow}>
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
    marginBottom: 10,
  },
  permissionButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  benchmarkFallbackButton: {
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 14,
  },
  benchmarkFallbackText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
  permissionFootnote: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 16,
  },
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
  topBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  resPill: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  resPillText: {
    fontSize: 11,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  // Frame Preview Card (Phase 2 Step 2)
  frameCard: {
    position: "absolute",
    top: 96,
    left: 14,
    right: 14,
    backgroundColor: "rgba(13, 21, 39, 0.94)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 50,
  },
  frameThumbnail: {
    width: 58,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#02040a",
    borderWidth: 1,
    borderColor: "#334155",
  },
  frameInfoCol: {
    flex: 1,
  },
  frameHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  frameTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f8fafc",
  },
  frameCloseText: {
    fontSize: 13,
    color: "#94a3b8",
    paddingHorizontal: 4,
  },
  frameSubText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 1,
  },
  frameOrientationText: {
    fontSize: 10,
    color: "#38bdf8",
    fontWeight: "600",
    marginTop: 2,
  },
  preprocessActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  preprocessBtn: {
    backgroundColor: "rgba(37, 99, 235, 0.35)",
    borderWidth: 1,
    borderColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  preprocessBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#60a5fa",
  },
  preprocessMetricsBox: {
    marginTop: 3,
  },
  preprocessBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "#10b981",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  preprocessBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#34d399",
  },
  preprocessStatsText: {
    fontSize: 9,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  segmentBtn: {
    backgroundColor: "rgba(139, 92, 246, 0.35)",
    borderWidth: 1,
    borderColor: "#8b5cf6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  segmentBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#c4b5fd",
  },
  segmentMetricsBox: {
    marginTop: 3,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  segmentBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderColor: "#8b5cf6",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  segmentBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#c4b5fd",
  },
  segmentStatsText: {
    fontSize: 9,
    color: "#e2e8f0",
    fontWeight: "500",
  },
  // Bottom Controls
  bottomBarContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 14,
  },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    width: "100%",
  },
  shutterOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  shutterCapturingRing: {
    borderColor: "#60a5fa",
  },
  shutterInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterCapturingCircle: {
    backgroundColor: "#1e3a8a",
  },
  redShutterRing: {
    borderColor: "#ef4444",
  },
  redShutterCircle: {
    backgroundColor: "#dc2626",
  },
  benchmarkButton: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    minWidth: 64,
  },
  benchmarkIcon: {
    fontSize: 16,
  },
  benchmarkText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#38bdf8",
    marginTop: 2,
  },
  smallSideButton: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    minWidth: 64,
  },
  smallSideIcon: {
    fontSize: 16,
  },
  smallSideText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#e2e8f0",
    marginTop: 2,
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
