import React from "react";
import {ActivityIndicator,Pressable,ScrollView,Text,TouchableOpacity,View,} from "react-native";
import type { StarProfile } from "../services/api";

interface StarDetailModalProps {
  visible: boolean;
  loading: boolean;
  error: string | null;
  profile: StarProfile | null;
  onClose: () => void;
  onRetry: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#1e293b" }}>
      <Text style={{ fontSize: 12, color: "#94a3b8", flexShrink: 1, marginRight: 12 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: "#e2e8f0", fontWeight: "600", textAlign: "right", flexShrink: 1 }}>{value}</Text>
    </View>
  );
}

// Star identity & metadata modal (Step 8).
// Uses a custom absolute-positioned overlay instead of React Native's <Modal>
// because <Modal> renders inline on web rather than as a proper floating overlay.
export default function StarDetailModal({visible,loading,error,profile,onClose,onRetry,}: StarDetailModalProps) {
  if (!visible) return null;

  const displayName = profile?.primary_name?.trim() || `HIP ${profile?.hip_id ?? ""}`;
  const alternateNames = profile?.alternate_names ?? [];
  const hasIdentity = !!(
    profile?.bayer_designation ||
    profile?.flamsteed_designation ||
    profile?.constellation ||
    alternateNames.length > 0
  );
  const hasAstrometry =
    profile?.right_ascension_hours != null ||
    profile?.declination_degrees != null ||
    profile?.parallax_mas != null ||
    profile?.proper_motion_ra_mas != null ||
    profile?.proper_motion_dec_mas != null;
  const hasPhysical =
    profile?.magnitude != null ||
    !!profile?.spectral_type ||
    profile?.distance_light_years != null;
  const hasDescription = !!profile?.description;
  const hasAnyMetadata = hasIdentity || hasAstrometry || hasPhysical || hasDescription;

  const sectionCardStyle = {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  } as const;

  const sectionTitleStyle = {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
    fontWeight: "600" as const,
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 50,
      }}
    >
      {/* Backdrop — tapping dismisses */}
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(2, 6, 23, 0.80)",
        }}
      />

      {/* Bottom Sheet Container */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "88%",
          backgroundColor: "#0d1527",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: "#1e293b",
          borderBottomWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Drag Handle */}
        <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#334155" }} />
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#1e293b",
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#f8fafc" }} numberOfLines={1}>
              {loading || error ? "Star Details" : displayName}
            </Text>
            {!loading && !error && profile?.constellation ? (
              <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{profile.constellation}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#1e293b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#94a3b8", fontSize: 16, fontWeight: "600" }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={{ marginTop: 12, fontSize: 14, color: "#94a3b8", textAlign: "center" }}>
              Fetching star profile…
            </Text>
          </View>
        ) : error ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>⚠️</Text>
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#f87171", marginBottom: 6 }}>
              Couldn't load this star
            </Text>
            <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 16 }}>{error}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{ backgroundColor: "#1e293b", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                onPress={onRetry}
              >
                <Text style={{ color: "#e2e8f0", fontWeight: "600", fontSize: 14 }}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                onPress={onClose}
              >
                <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : profile ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 11, color: "#94a3b8", backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: "hidden", fontWeight: "500" }}>
                HIP {profile.hip_id}
              </Text>
              {profile.magnitude != null ? (
                <Text style={{ fontSize: 11, color: "#38bdf8", backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: "hidden", fontWeight: "600" }}>
                  Mag {profile.magnitude.toFixed(2)}
                </Text>
              ) : null}
            </View>

            {alternateNames.length > 0 ? (
              <Text style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                Also known as: {alternateNames.join(", ")}
              </Text>
            ) : null}

            {hasIdentity ? (
              <View style={sectionCardStyle}>
                <Text style={sectionTitleStyle}>Identity</Text>
                {profile.bayer_designation ? <DetailRow label="Bayer designation" value={profile.bayer_designation} /> : null}
                {profile.flamsteed_designation ? <DetailRow label="Flamsteed designation" value={profile.flamsteed_designation} /> : null}
                {profile.constellation ? <DetailRow label="Constellation" value={profile.constellation} /> : null}
              </View>
            ) : null}

            {hasAstrometry ? (
              <View style={sectionCardStyle}>
                <Text style={sectionTitleStyle}>Catalog Position</Text>
                {profile.right_ascension_hours != null ? <DetailRow label="Right ascension" value={`${profile.right_ascension_hours.toFixed(3)} h`} /> : null}
                {profile.declination_degrees != null ? <DetailRow label="Declination" value={`${profile.declination_degrees.toFixed(3)}°`} /> : null}
                {profile.parallax_mas != null ? <DetailRow label="Parallax" value={`${profile.parallax_mas.toFixed(2)} mas`} /> : null}
                {profile.proper_motion_ra_mas != null ? <DetailRow label="Proper motion (RA)" value={`${profile.proper_motion_ra_mas.toFixed(2)} mas/yr`} /> : null}
                {profile.proper_motion_dec_mas != null ? <DetailRow label="Proper motion (Dec)" value={`${profile.proper_motion_dec_mas.toFixed(2)} mas/yr`} /> : null}
              </View>
            ) : null}

            {hasPhysical ? (
              <View style={sectionCardStyle}>
                <Text style={sectionTitleStyle}>Physical Properties</Text>
                {profile.magnitude != null ? <DetailRow label="Apparent magnitude" value={profile.magnitude.toFixed(2)} /> : null}
                {profile.spectral_type ? <DetailRow label="Spectral type" value={profile.spectral_type} /> : null}
                {profile.distance_light_years != null ? <DetailRow label="Distance" value={`${profile.distance_light_years.toFixed(1)} light-years`} /> : null}
              </View>
            ) : null}

            {hasDescription ? (
              <View style={sectionCardStyle}>
                <Text style={sectionTitleStyle}>About</Text>
                <Text style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 20 }}>{profile.description}</Text>
              </View>
            ) : null}

            {!hasAnyMetadata ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: "#94a3b8", textAlign: "center" }}>
                  Only basic catalog data is available for this star.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
