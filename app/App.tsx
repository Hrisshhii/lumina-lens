import React, {useEffect,useState,useCallback} from "react";
import { StyleSheet,Text,View,FlatList,ActivityIndicator,TouchableOpacity,RefreshControl,SafeAreaView,} from "react-native";
import { StatusBar } from "expo-status-bar";

import { getVisibleStars, getStarByHip, Star, StarProfile, VisibleStarsResponse } from "./src/services/api";
import StarDetailModal from "./src/components/StarDetailModal";

// Default coordinates (Pune, India - Phase 1 test observer)
// Temporarily hardcoded for testing; in a real app, you would get this from device GPS or user input.
const DEFAULT_LATITUDE=18.5204;
const DEFAULT_LONGITUDE=73.8567;

function getCompassDirection(azimuth: number): string {
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round((azimuth % 360) / 22.5) % 16;
  return directions[index];
}

export default function App() {
  const [data,setData]=useState<VisibleStarsResponse | null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState<string | null>(null);

  // Star detail modal state (Step 8: Star Identity & Metadata)
  const [selectedHip,setSelectedHip]=useState<number | null>(null);
  const [selectedStar,setSelectedStar]=useState<StarProfile | null>(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const [detailError,setDetailError]=useState<string | null>(null);
  const [modalVisible,setModalVisible]=useState(false);

  const fetchStars = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response=await getVisibleStars(DEFAULT_LATITUDE, DEFAULT_LONGITUDE, 50);
      setData(response);
    } catch (err: any) {
      setError(err.message || "Failed to load visible stars");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(()=>{
    fetchStars();
  }, [fetchStars]);

  // Fetch the full profile for a tapped star and open the detail modal.
  const handleStarPress=useCallback(async (hipId:number)=>{
    setSelectedHip(hipId);
    setSelectedStar(null);
    setDetailError(null);
    setModalVisible(true);
    setDetailLoading(true);
    try {
      const profile=await getStarByHip(hipId);
      setSelectedStar(profile);
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load star profile");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const retryDetail=useCallback(()=>{
    if (selectedHip!=null) {
      handleStarPress(selectedHip);
    }
  }, [selectedHip, handleStarPress]);

  const closeDetail=useCallback(()=>{
    setModalVisible(false);
    setSelectedStar(null);
    setDetailError(null);
    setSelectedHip(null);
  }, []);

  const renderStarItem=({ item, index }: { item: Star; index: number }) => {
    const isProminent=!item.name.startsWith("HIP ");
    const cardinal=getCompassDirection(item.azimuth);

    return (
      <View style={styles.starCard}>
        <View style={styles.starHeader}>
          <View style={styles.nameContainer}>
            <Text style={[styles.starName, isProminent && styles.prominentStarName]}>
              {item.name}
            </Text>
            <Text style={styles.hipBadge}>HIP {item.hip}</Text>
          </View>
          <View style={styles.magBadge}>
            <Text style={styles.magText}>Mag {item.magnitude.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.coordsRow}>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Altitude</Text>
            <Text style={styles.coordValue}>{item.altitude.toFixed(1)}°</Text>
          </View>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Azimuth</Text>
            <Text style={styles.coordValue}>
              {item.azimuth.toFixed(1)}° ({cardinal})
            </Text>
          </View>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Rank</Text>
            <Text style={styles.coordValue}>#{index + 1}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* App Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>✦ Lumina Lens</Text>
        <Text style={styles.subtitle}>Sky Prediction Engine</Text>
        <Text style={styles.locationText}>
          📍 {DEFAULT_LATITUDE}° N, {DEFAULT_LONGITUDE}° E
        </Text>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.statusText}>Calculating visible stars...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchStars()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.stars || []}
          keyExtractor={(item) => item.hip.toString()}
          renderItem={renderStarItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchStars(true)}
              tintColor="#60a5fa"
            />
          }
          ListHeaderComponent={
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>
                {data?.count || 0} stars currently above horizon (sorted by brightness)
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.statusText}>No stars currently above horizon.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b14",
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0d1527",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#60a5fa",
    marginTop: 6,
    fontWeight: "500",
  },
  summaryBar: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  starCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  starHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  prominentStarName: {
    color: "#facc15",
    fontWeight: "700",
  },
  hipBadge: {
    fontSize: 11,
    color: "#64748b",
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  magBadge: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  magText: {
    fontSize: 12,
    color: "#38bdf8",
    fontWeight: "600",
  },
  coordsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#090d16",
    borderRadius: 8,
    padding: 8,
  },
  coordBox: {
    alignItems: "center",
    flex: 1,
  },
  coordLabel: {
    fontSize: 10,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 13,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94a3b8",
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f87171",
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
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
});