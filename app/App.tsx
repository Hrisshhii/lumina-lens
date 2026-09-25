import React, { useEffect, useState, useCallback } from "react";
import {Text,View,FlatList,ActivityIndicator,TouchableOpacity,RefreshControl,SafeAreaView,} from "react-native";
import { StatusBar } from "expo-status-bar";

import {getVisibleStars,getStarByHip,Star,StarProfile,VisibleStarsResponse,} from "./src/services/api";
import StarDetailModal from "./src/components/StarDetailModal";
import SkyDomeView from "./src/components/SkyDomeView";
import {getDeviceLocation,DeviceLocation,useDeviceOrientation,} from "./src/engines/sensor";

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

  // View mode switcher (Step 10: Celestial Dome vs List View)
  const [viewMode, setViewMode] = useState<"dome" | "list">("dome");

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
        className="bg-[#0f172a] rounded-xl p-3.5 mb-2.5 border border-[#1e293b]"
        activeOpacity={0.7}
        onPress={() => handleStarPress(item.hip)}
      >
        <View className="flex-row justify-between items-center mb-2.5">
          <View className="flex-row items-center gap-2">
            <Text className={`text-[17px] font-semibold ${isProminent ? "text-yellow-400 font-bold" : "text-slate-200"}`}>
              {item.name}
            </Text>
            <Text className="text-[11px] text-slate-500 bg-[#1e293b] px-1.5 py-0.5 rounded">
              HIP {item.hip}
            </Text>
          </View>
          <View className="bg-[#1e293b] px-2 py-1 rounded-md">
            <Text className="text-xs text-sky-400 font-semibold">
              Mag {item.magnitude.toFixed(2)}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between bg-[#090d16] rounded-lg p-2">
          <View className="items-center flex-1">
            <Text className="text-[10px] text-slate-500 uppercase mb-0.5 font-medium">Altitude</Text>
            <Text className="text-[13px] text-slate-300 font-medium">{item.altitude.toFixed(1)}°</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-[10px] text-slate-500 uppercase mb-0.5 font-medium">Azimuth</Text>
            <Text className="text-[13px] text-slate-300 font-medium">
              {item.azimuth.toFixed(1)}° ({cardinal})
            </Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-[10px] text-slate-500 uppercase mb-0.5 font-medium">Rank</Text>
            <Text className="text-[13px] text-slate-300 font-medium">#{index + 1}</Text>
          </View>
        </View>

        <Text className="mt-2 text-[11px] text-blue-400 font-semibold text-right">
          Tap to view profile →
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#070b14]">
      <StatusBar style="light" />

      {/* App Header */}
      <View className="pt-4 pb-4 px-5 bg-[#0d1527] border-b border-[#1e293b]">
        <Text className="text-2xl font-bold text-slate-50 tracking-wide">✦ Lumina Lens</Text>
        <Text className="text-xs text-slate-400 mt-0.5">Sky Prediction Engine</Text>
        <Text className="text-xs text-blue-400 mt-1.5 font-medium">
          📍 {formatCoordinates(activeLatitude, activeLongitude)}{" "}
          <Text className={isLiveLocation ? "text-emerald-400 font-semibold" : "text-amber-500 font-medium"}>
            [{isLiveLocation ? "Live GPS" : "Default"}]
          </Text>
        </Text>
      </View>

      {/* Orientation HUD (Step 9: Sensor Engine) */}
      <View className="flex-row bg-[#090d16] py-2.5 px-4 border-b border-[#1e293b] items-center justify-around">
        <View className="items-center flex-1">
          <Text className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-semibold">HEADING</Text>
          <Text className="text-sm text-slate-200 font-semibold">
            {orientation.available ? `${Math.round(orientation.azimuth)}° ${currentCardinal}` : "—"}
          </Text>
        </View>
        <View className="w-px h-6 bg-[#1e293b]" />
        <View className="items-center flex-1">
          <Text className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-semibold">ELEVATION</Text>
          <Text className="text-sm text-slate-200 font-semibold">
            {orientation.available ? `${Math.round(orientation.altitude)}°` : "—"}
          </Text>
        </View>
        <View className="w-px h-6 bg-[#1e293b]" />
        <View className="items-center flex-1">
          <Text className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-semibold">AIM</Text>
          <Text className={`text-sm font-semibold ${orientation.altitude > 20 ? "text-sky-400" : "text-slate-400"}`}>
            {!orientation.available ? "Sensors Off" : orientation.altitude > 20 ? "🌌 Sky" : "🔭 Horizon"}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text className="mt-3 text-sm text-slate-400">Calculating visible stars...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-4xl mb-2">⚠️</Text>
          <Text className="text-lg font-semibold text-red-400 mb-1.5">Connection Failed</Text>
          <Text className="text-xs text-slate-400 text-center mb-4">{error}</Text>
          <TouchableOpacity className="bg-blue-600 px-5 py-2.5 rounded-lg" onPress={handleRefresh}>
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.stars || []}
          keyExtractor={(item) => item.hip.toString()}
          renderItem={renderStarItem}
          contentContainerClassName="px-4 py-3"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#60a5fa"
            />
          }
          ListHeaderComponent={
            <View className="py-2.5 px-1 mb-2">
              <Text className="text-xs text-slate-500 uppercase tracking-wider">
                {data?.count || 0} stars currently above horizon (sorted by brightness)
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-6">
              <Text className="text-sm text-slate-400">No stars currently above horizon.</Text>
            </View>
          }
        />
      )}

      {/* Star detail modal (Step 8: Star Identity & Metadata) */}
      <StarDetailModal
        visible={modalVisible}
        loading={detailLoading}
        error={detailError}
        profile={selectedStar}
        onClose={closeDetail}
        onRetry={retryDetail}
      />
    </SafeAreaView>
  );
}