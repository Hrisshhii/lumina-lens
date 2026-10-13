import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import {
  getVisibleStars,
  getStarByHip,
  Star,
  StarProfile,
  VisibleStarsResponse,
} from "./src/services/api";
import StarDetailModal from "./src/components/StarDetailModal";
import SkyDomeView from "./src/components/SkyDomeView";
import CameraViewfinder from "./src/components/CameraViewfinder";
import {
  getDeviceLocation,
  DeviceLocation,
  useDeviceOrientation,
} from "./src/engines/sensor";

// Default coordinates (Pune, India - Phase 1 test observer fallback)
const DEFAULT_LATITUDE = 18.5204;
const DEFAULT_LONGITUDE = 73.8567;

function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

function getCompassDirection(azimuth: number): string {
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round((azimuth % 360) / 22.5) % 16;
  return directions[index];
}

export default function App() {
  const [data, setData] = useState<VisibleStarsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View mode switcher: Phase 2 Step 1 introduces "lens"
  const [viewMode, setViewMode] = useState<"lens" | "dome" | "list">("dome");

  // Live sensor / GPS location state (Step 9: Sensor Engine)
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [isLiveLocation, setIsLiveLocation] = useState(false);

  // Active observer coordinates
  const activeLatitude = location?.latitude ?? DEFAULT_LATITUDE;
  const activeLongitude = location?.longitude ?? DEFAULT_LONGITUDE;

  // Live device orientation (Step 9: Sensor Engine)
  const orientation = useDeviceOrientation();
  const currentCardinal = getCompassDirection(orientation.azimuth);

  // Star detail modal state (Step 8: Star Identity & Metadata)
  const [selectedHip, setSelectedHip] = useState<number | null>(null);
  const [selectedStar, setSelectedStar] = useState<StarProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchStars = useCallback(
    async (isRefresh = false, coords?: { latitude: number; longitude: number }) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const lat = coords?.latitude ?? location?.latitude ?? DEFAULT_LATITUDE;
      const lon = coords?.longitude ?? location?.longitude ?? DEFAULT_LONGITUDE;

      try {
        const response = await getVisibleStars(lat, lon, 50);
        setData(response);
      } catch (err: any) {
        setError(err.message || "Failed to load visible stars");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [location]
  );

  // Initial mount: fetch live device location, then fetch stars
  useEffect(() => {
    let isMounted = true;

    async function initLocationAndStars() {
      try {
        const loc = await getDeviceLocation();
        if (isMounted) {
          setLocation(loc);
          setIsLiveLocation(true);
          await fetchStars(false, { latitude: loc.latitude, longitude: loc.longitude });
        }
      } catch (err) {
        console.warn("Could not get device location, using fallback:", err);
        if (isMounted) {
          setIsLiveLocation(false);
          await fetchStars(false, { latitude: DEFAULT_LATITUDE, longitude: DEFAULT_LONGITUDE });
        }
      }
    }

    initLocationAndStars();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const loc = await getDeviceLocation();
      setLocation(loc);
      setIsLiveLocation(true);
      await fetchStars(true, { latitude: loc.latitude, longitude: loc.longitude });
    } catch {
      await fetchStars(true);
    }
  }, [fetchStars]);

  // Fetch the full profile for a tapped star and open the detail modal.
  const handleStarPress = useCallback(async (hipId: number) => {
    setSelectedHip(hipId);
    setSelectedStar(null);
    setDetailError(null);
    setModalVisible(true);
    setDetailLoading(true);
    try {
      const profile = await getStarByHip(hipId);
      setSelectedStar(profile);
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load star profile");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const retryDetail = useCallback(() => {
    if (selectedHip != null) {
      handleStarPress(selectedHip);
    }
  }, [selectedHip, handleStarPress]);

  const closeDetail = useCallback(() => {
    setModalVisible(false);
    setSelectedStar(null);
    setDetailError(null);
    setSelectedHip(null);
  }, []);

  const renderStarItem = ({ item, index }: { item: Star; index: number }) => {
    const isProminent = !item.name.startsWith("HIP ");
    const cardinal = getCompassDirection(item.azimuth);

    return (
      <TouchableOpacity
        style={styles.starCard}
        activeOpacity={0.7}
        onPress={() => handleStarPress(item.hip)}
      >
        <View style={styles.starCardHeader}>
          <View style={styles.rowAlign}>
            <Text style={[styles.starCardName, isProminent ? styles.starProminent : styles.starNormal]}>
              {item.name}
            </Text>
            <Text style={styles.starHipBadge}>
              HIP {item.hip}
            </Text>
          </View>
          <View style={styles.starMagBadge}>
            <Text style={styles.starMagText}>
              Mag {item.magnitude.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.starMetricsRow}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Altitude</Text>
            <Text style={styles.metricValue}>{item.altitude.toFixed(1)}°</Text>
          </View>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Azimuth</Text>
            <Text style={styles.metricValue}>
              {item.azimuth.toFixed(1)}° ({cardinal})
            </Text>
          </View>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Rank</Text>
            <Text style={styles.metricValue}>#{index + 1}</Text>
          </View>
        </View>

        <Text style={styles.starCardFooter}>
          Tap to view profile →
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Main Responsive Outer Container */}
      <View style={styles.appContainer}>
        {/* App Header */}
        <View style={styles.appHeader}>
          <Text style={styles.headerTitle}>✦ Lumina Lens</Text>
          <Text style={styles.headerSubtitle}>Sky Prediction Engine • Phase 2 Vision</Text>
          <Text style={styles.headerLocation}>
            📍 {formatCoordinates(activeLatitude, activeLongitude)}{" "}
            <Text style={isLiveLocation ? styles.liveGpsText : styles.defaultGpsText}>
              [{isLiveLocation ? "Live GPS" : "Default"}]
            </Text>
          </Text>
        </View>

        {/* Orientation HUD (Step 9: Sensor Engine) */}
        <View style={styles.orientationHud}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>HEADING</Text>
            <Text style={styles.hudValue}>
              {orientation.available ? `${Math.round(orientation.azimuth)}° ${currentCardinal}` : "—"}
            </Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>ELEVATION</Text>
            <Text style={styles.hudValue}>
              {orientation.available ? `${Math.round(orientation.altitude)}°` : "—"}
            </Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>AIM</Text>
            <Text style={[styles.hudValue, orientation.altitude > 20 ? styles.skyAimText : styles.horizonAimText]}>
              {!orientation.available ? "Sensors Off" : orientation.altitude > 20 ? "🌌 Sky" : "🔭 Horizon"}
            </Text>
          </View>
        </View>

        {/* View Mode Switcher (Phase 2 Step 1: Lens / Dome / List) */}
        <View style={styles.switcherContainer}>
          <View style={styles.switcherPillsRow}>
            {/* 1. Lens Mode */}
            <TouchableOpacity
              onPress={() => setViewMode("lens")}
              style={[
                styles.switcherPill,
                viewMode === "lens" && styles.switcherPillActive,
              ]}
            >
              <Text style={styles.pillEmoji}>📷</Text>
              <Text
                style={[
                  styles.switcherPillText,
                  viewMode === "lens" && styles.switcherPillTextActive,
                ]}
              >
                Lens
              </Text>
            </TouchableOpacity>

            {/* 2. Celestial Dome Mode */}
            <TouchableOpacity
              onPress={() => setViewMode("dome")}
              style={[
                styles.switcherPill,
                viewMode === "dome" && styles.switcherPillActive,
              ]}
            >
              <Text style={styles.pillEmoji}>🌌</Text>
              <Text
                style={[
                  styles.switcherPillText,
                  viewMode === "dome" && styles.switcherPillTextActive,
                ]}
              >
                Dome
              </Text>
            </TouchableOpacity>

            {/* 3. Star List Mode */}
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={[
                styles.switcherPill,
                viewMode === "list" && styles.switcherPillActive,
              ]}
            >
              <Text style={styles.pillEmoji}>📋</Text>
              <Text
                style={[
                  styles.switcherPillText,
                  viewMode === "list" && styles.switcherPillTextActive,
                ]}
              >
                List
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshButtonText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#60a5fa" />
              <Text style={styles.loadingMessage}>Calculating visible stars…</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Connection Failed</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : viewMode === "lens" ? (
            <CameraViewfinder
              orientation={orientation}
              observer={{ latitude: activeLatitude, longitude: activeLongitude }}
              stars={data?.stars || []}
              onSelectStar={handleStarPress}
            />
          ) : viewMode === "dome" ? (
            <SkyDomeView
              stars={data?.stars || []}
              orientation={orientation}
              onSelectStar={handleStarPress}
              selectedHipId={selectedHip}
            />
          ) : (
            <FlatList
              data={data?.stars || []}
              keyExtractor={(item) => item.hip.toString()}
              renderItem={renderStarItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#60a5fa"
                />
              }
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>
                    {data?.count || 0} stars currently above horizon (sorted by brightness)
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <Text style={styles.emptyText}>No stars currently above horizon.</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Star Detail Bottom Sheet Overlay (Step 8: Star Identity & Metadata) */}
        <StarDetailModal
          visible={modalVisible}
          loading={detailLoading}
          error={detailError}
          profile={selectedStar}
          onClose={closeDetail}
          onRetry={retryDetail}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070b14",
  },
  appContainer: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 540 : undefined,
    alignSelf: "center",
    backgroundColor: "#070b14",
    position: "relative",
  },
  appHeader: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#0d1527",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  headerLocation: {
    fontSize: 12,
    color: "#60a5fa",
    marginTop: 6,
    fontWeight: "500",
  },
  liveGpsText: {
    color: "#34d399",
    fontWeight: "600",
  },
  defaultGpsText: {
    color: "#f59e0b",
    fontWeight: "500",
  },
  orientationHud: {
    flexDirection: "row",
    backgroundColor: "#090d16",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    alignItems: "center",
    justifyContent: "space-around",
  },
  hudItem: {
    alignItems: "center",
    flex: 1,
  },
  hudLabel: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  hudValue: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: "600",
  },
  hudDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#1e293b",
  },
  skyAimText: {
    color: "#38bdf8",
  },
  horizonAimText: {
    color: "#94a3b8",
  },
  switcherContainer: {
    flexDirection: "row",
    backgroundColor: "#0b101d",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switcherPillsRow: {
    flexDirection: "row",
    backgroundColor: "#060a12",
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 2,
  },
  switcherPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    gap: 4,
  },
  switcherPillActive: {
    backgroundColor: "#2563eb",
  },
  pillEmoji: {
    fontSize: 12,
  },
  switcherPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  switcherPillTextActive: {
    color: "#ffffff",
  },
  refreshButton: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  refreshButtonText: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  contentArea: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingMessage: {
    marginTop: 12,
    fontSize: 13,
    color: "#94a3b8",
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#f87171",
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  listHeaderText: {
    fontSize: 11,
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  starCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  starCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starCardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  starProminent: {
    color: "#facc15",
    fontWeight: "700",
  },
  starNormal: {
    color: "#e2e8f0",
  },
  starHipBadge: {
    fontSize: 11,
    color: "#64748b",
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  starMagBadge: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  starMagText: {
    fontSize: 12,
    color: "#38bdf8",
    fontWeight: "600",
  },
  starMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#090d16",
    borderRadius: 8,
    padding: 8,
  },
  metricCol: {
    alignItems: "center",
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  starCardFooter: {
    marginTop: 8,
    fontSize: 11,
    color: "#60a5fa",
    fontWeight: "600",
    textAlign: "right",
  },
});