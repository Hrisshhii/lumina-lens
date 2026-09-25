import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Star } from "../services/api";
import { DeviceOrientation } from "../engines/sensor";

interface SkyDomeViewProps {
  stars: Star[];
  orientation: DeviceOrientation;
  onSelectStar: (hipId: number) => void;
  selectedHipId?: number | null;
}

type StarFilter = "all" | "naked_eye" | "prominent" | "named";

export default function SkyDomeView({
  stars,
  orientation,
  onSelectStar,
  selectedHipId,
}: SkyDomeViewProps) {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<StarFilter>("all");

  // Dome diameter adapts to screen width with comfortable padding (capped at 420px)
  const domeSize = useMemo(() => {
    const available = width - 40;
    return Math.min(Math.max(available, 280), 400);
  }, [width]);

  const domeRadius = domeSize / 2;
  const padding = 22; // Inset so horizon markers sit nicely
  const usableRadius = domeRadius - padding;
  const center = domeRadius;

  // Filter stars according to active chip
  const filteredStars = useMemo(() => {
    switch (filter) {
      case "naked_eye":
        return stars.filter((s) => s.magnitude <= 4.0);
      case "prominent":
        return stars.filter((s) => s.magnitude <= 2.5);
      case "named":
        return stars.filter((s) => !s.name.startsWith("HIP "));
      case "all":
      default:
        return stars;
    }
  }, [stars, filter]);

  // Convert (Altitude, Azimuth) to local 2D (x, y) coordinates
  // Zenith (Alt = 90°) -> center (r = 0)
  // Horizon (Alt = 0°) -> outer rim (r = usableRadius)
  // Azimuth: 0° is North (top), 90° East (right), 180° South (bottom), 270° West (left)
  const getCoordinates = (alt: number, az: number) => {
    const clampedAlt = Math.max(0, Math.min(90, alt));
    const r = usableRadius * (1 - clampedAlt / 90);
    const angleRad = ((az - 90) * Math.PI) / 180;
    const x = center + r * Math.cos(angleRad);
    const y = center + r * Math.sin(angleRad);
    return { x, y, r };
  };

  // Device orientation aim reticle coordinates
  const aimPosition = useMemo(() => {
    if (!orientation.available) return null;
    return getCoordinates(orientation.altitude, orientation.azimuth);
  }, [orientation.available, orientation.altitude, orientation.azimuth, usableRadius, center]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="items-center px-4 py-3"
      showsVerticalScrollIndicator={false}
    >
      {/* Filter Chips Bar */}
      <View className="flex-row gap-2 mb-4 flex-wrap justify-center">
        <TouchableOpacity
          onPress={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full border ${
            filter === "all"
              ? "bg-blue-600/30 border-blue-400"
              : "bg-[#0f172a] border-[#1e293b]"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filter === "all" ? "text-blue-300" : "text-slate-400"
            }`}
          >
            All ({stars.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter("named")}
          className={`px-3 py-1.5 rounded-full border ${
            filter === "named"
              ? "bg-amber-600/30 border-amber-400"
              : "bg-[#0f172a] border-[#1e293b]"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filter === "named" ? "text-amber-300" : "text-slate-400"
            }`}
          >
            Named Stars
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter("prominent")}
          className={`px-3 py-1.5 rounded-full border ${
            filter === "prominent"
              ? "bg-sky-600/30 border-sky-400"
              : "bg-[#0f172a] border-[#1e293b]"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filter === "prominent" ? "text-sky-300" : "text-slate-400"
            }`}
          >
            Mag ≤ 2.5
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter("naked_eye")}
          className={`px-3 py-1.5 rounded-full border ${
            filter === "naked_eye"
              ? "bg-indigo-600/30 border-indigo-400"
              : "bg-[#0f172a] border-[#1e293b]"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filter === "naked_eye" ? "text-indigo-300" : "text-slate-400"
            }`}
          >
            Mag ≤ 4.0
          </Text>
        </TouchableOpacity>
      </View>

      {/* The 2D Celestial Radar Dome Container */}
      <View
        style={{ width: domeSize, height: domeSize }}
        className="relative bg-[#050914] rounded-full border border-sky-950/80 shadow-2xl overflow-hidden items-center justify-center"
      >
        {/* Radar Background Glow */}
        <View
          style={{
            position: "absolute",
            width: domeSize,
            height: domeSize,
            borderRadius: domeRadius,
            backgroundColor: "rgba(14, 27, 54, 0.45)",
          }}
        />

        {/* 1. Outer Horizon Ring (Alt = 0°) */}
        <View
          style={{
            position: "absolute",
            width: usableRadius * 2,
            height: usableRadius * 2,
            borderRadius: usableRadius,
            borderWidth: 1.5,
            borderColor: "#1e3a5f",
          }}
        />

        {/* 2. 30° Altitude Ring (r = 2/3 * usableRadius) */}
        <View
          style={{
            position: "absolute",
            width: (usableRadius * 4) / 3,
            height: (usableRadius * 4) / 3,
            borderRadius: (usableRadius * 2) / 3,
            borderWidth: 1,
            borderColor: "#152438",
            borderStyle: "dashed",
          }}
        />

        {/* 3. 60° Altitude Ring (r = 1/3 * usableRadius) */}
        <View
          style={{
            position: "absolute",
            width: (usableRadius * 2) / 3,
            height: (usableRadius * 2) / 3,
            borderRadius: usableRadius / 3,
            borderWidth: 1,
            borderColor: "#152438",
            borderStyle: "dashed",
          }}
        />

        {/* 4. Cardinal Crosshair Lines (N-S and E-W) */}
        <View
          style={{
            position: "absolute",
            width: 1,
            height: usableRadius * 2,
            backgroundColor: "#17253a",
          }}
        />
        <View
          style={{
            position: "absolute",
            height: 1,
            width: usableRadius * 2,
            backgroundColor: "#17253a",
          }}
        />

        {/* 5. Zenith Point (Alt = 90°) */}
        <View
          style={{
            position: "absolute",
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: "#38bdf8",
          }}
        />
        <Text
          style={{
            position: "absolute",
            top: center + 6,
            left: center - 18,
            fontSize: 8,
            color: "#64748b",
            fontWeight: "600",
          }}
        >
          ZENITH
        </Text>

        {/* 6. Altitude Ring Labels */}
        <Text
          style={{
            position: "absolute",
            top: center - usableRadius / 3 - 6,
            left: center + 3,
            fontSize: 7,
            color: "#475569",
            fontWeight: "600",
          }}
        >
          60°
        </Text>
        <Text
          style={{
            position: "absolute",
            top: center - (usableRadius * 2) / 3 - 6,
            left: center + 3,
            fontSize: 7,
            color: "#475569",
            fontWeight: "600",
          }}
        >
          30°
        </Text>

        {/* 7. Cardinal Direction Badges */}
        {/* NORTH (0°) */}
        <View
          style={{
            position: "absolute",
            top: 2,
            alignSelf: "center",
          }}
          className="items-center"
        >
          <Text className="text-[11px] font-bold text-sky-400">N</Text>
          <Text className="text-[7px] text-slate-500 font-semibold">0°</Text>
        </View>

        {/* SOUTH (180°) */}
        <View
          style={{
            position: "absolute",
            bottom: 2,
            alignSelf: "center",
          }}
          className="items-center"
        >
          <Text className="text-[11px] font-bold text-slate-400">S</Text>
          <Text className="text-[7px] text-slate-500 font-semibold">180°</Text>
        </View>

        {/* EAST (90°) */}
        <View
          style={{
            position: "absolute",
            right: 4,
            top: center - 12,
          }}
          className="items-center"
        >
          <Text className="text-[11px] font-bold text-slate-400">E</Text>
          <Text className="text-[7px] text-slate-500 font-semibold">90°</Text>
        </View>

        {/* WEST (270°) */}
        <View
          style={{
            position: "absolute",
            left: 4,
            top: center - 12,
          }}
          className="items-center"
        >
          <Text className="text-[11px] font-bold text-slate-400">W</Text>
          <Text className="text-[7px] text-slate-500 font-semibold">270°</Text>
        </View>

        {/* 8. Render Projected Stars */}
        {filteredStars.map((star) => {
          const { x, y } = getCoordinates(star.altitude, star.azimuth);
          const isSelected = selectedHipId === star.hip;
          const isNamed = !star.name.startsWith("HIP ");

          // Point sizing based on magnitude
          let dotSize = 3;
          let dotColor = "#94a3b8";
          let glowColor = "transparent";

          if (star.magnitude < 0.5) {
            dotSize = 8;
            dotColor = "#ffffff";
            glowColor = "rgba(56, 189, 248, 0.4)";
          } else if (star.magnitude < 1.5) {
            dotSize = 6.5;
            dotColor = "#ffffff";
            glowColor = "rgba(255, 255, 255, 0.3)";
          } else if (star.magnitude < 2.5) {
            dotSize = 5;
            dotColor = "#e2e8f0";
          } else if (star.magnitude < 3.5) {
            dotSize = 4;
            dotColor = "#cbd5e1";
          } else {
            dotSize = 2.5;
            dotColor = "#64748b";
          }

          const touchTargetSize = 28;

          return (
            <TouchableOpacity
              key={star.hip}
              activeOpacity={0.6}
              onPress={() => onSelectStar(star.hip)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                position: "absolute",
                left: x - touchTargetSize / 2,
                top: y - touchTargetSize / 2,
                width: touchTargetSize,
                height: touchTargetSize,
                alignItems: "center",
                justifyContent: "center",
                zIndex: isSelected ? 30 : isNamed ? 20 : 10,
              }}
            >
              {/* Selected Star Indicator Ring */}
              {isSelected && (
                <View
                  style={{
                    position: "absolute",
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.2)",
                  }}
                />
              )}

              {/* Star Glow Halo (for brightest stars) */}
              {glowColor !== "transparent" && (
                <View
                  style={{
                    position: "absolute",
                    width: dotSize + 6,
                    height: dotSize + 6,
                    borderRadius: (dotSize + 6) / 2,
                    backgroundColor: glowColor,
                  }}
                />
              )}

              {/* Star Core Dot */}
              <View
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: dotColor,
                }}
              />

              {/* Star Label for prominent / named stars */}
              {(isNamed || isSelected || star.magnitude < 1.0) && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: touchTargetSize / 2 + 3,
                    top: -2,
                    backgroundColor: "rgba(3, 7, 18, 0.75)",
                    paddingHorizontal: 3,
                    paddingVertical: 1,
                    borderRadius: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: isNamed ? "700" : "500",
                      color: isSelected
                        ? "#38bdf8"
                        : isNamed
                        ? "#facc15"
                        : "#94a3b8",
                    }}
                    numberOfLines={1}
                  >
                    {star.name}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* 9. Live Device Aim Reticle (when orientation available & phone tilted up) */}
        {aimPosition && orientation.altitude > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: aimPosition.x - 14,
              top: aimPosition.y - 14,
              width: 28,
              height: 28,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 40,
            }}
          >
            {/* Pulsing Aim Ring */}
            <View
              style={{
                position: "absolute",
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 1.5,
                borderColor: "#38bdf8",
                borderStyle: "dashed",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
              }}
            />
            {/* Center Crosshair Dot */}
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#38bdf8",
              }}
            />
            <Text
              style={{
                position: "absolute",
                top: 26,
                fontSize: 7,
                color: "#38bdf8",
                fontWeight: "700",
                backgroundColor: "rgba(3, 7, 18, 0.8)",
                paddingHorizontal: 2,
                borderRadius: 2,
              }}
            >
              AIM
            </Text>
          </View>
        )}
      </View>

      {/* Dome Map Legend & Observer Guidelines */}
      <View className="mt-4 w-full bg-[#0d1527] rounded-xl p-3 border border-[#1e293b]">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xs font-semibold text-slate-300">
            Celestial Radar Guide
          </Text>
          <Text className="text-[11px] text-sky-400 font-medium">
            Showing {filteredStars.length} of {stars.length} stars
          </Text>
        </View>

        <View className="flex-row justify-around py-1.5 border-t border-[#1e293b]/60">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-white" />
            <Text className="text-[10px] text-slate-400">Bright (Mag &lt; 1.5)</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <Text className="text-[10px] text-slate-400">Mid (Mag &lt; 3.5)</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-1 h-1 rounded-full bg-slate-500" />
            <Text className="text-[10px] text-slate-400">Faint (&ge; 3.5)</Text>
          </View>
        </View>

        <Text className="text-[10px] text-slate-500 text-center mt-1.5">
          Center is Zenith (straight up, 90°) • Outer ring is Horizon (0°) • Tap any star for details
        </Text>
      </View>
    </ScrollView>
  );
}
