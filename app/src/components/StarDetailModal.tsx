import React from "react";
import {ActivityIndicator,Modal,ScrollView,Text,TouchableOpacity,View,} from "react-native";
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
    <View className="flex-row justify-between py-1.5 border-b border-[#1e293b]">
      <Text className="text-xs text-slate-400 flex-shrink mr-3">{label}</Text>
      <Text className="text-xs text-slate-200 font-semibold text-right flex-shrink">{value}</Text>
    </View>
  );
}

// Star identity & metadata modal (Step 8).
// Not every star has every field, so optional metadata renders gracefully.
export default function StarDetailModal({
  visible,
  loading,
  error,
  profile,
  onClose,
  onRetry,
}: StarDetailModalProps) {
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-slate-950/75 justify-end">
        <View className="bg-[#0d1527] rounded-t-3xl max-h-[88%] border border-[#1e293b] overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-[#1e293b]">
            <View className="flex-1 mr-3">
              <Text className="text-[22px] font-bold text-slate-50" numberOfLines={1}>
                {loading || error ? "Star Details" : displayName}
              </Text>
              {!loading && !error && profile?.constellation ? (
                <Text className="text-xs text-slate-400 mt-0.5">{profile.constellation}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-[#1e293b] items-center justify-center"
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-slate-400 text-base font-semibold">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View className="p-8 items-center">
              <ActivityIndicator size="large" color="#60a5fa" />
              <Text className="mt-3 text-sm text-slate-400 text-center">Fetching star profile…</Text>
            </View>
          ) : error ? (
            <View className="p-8 items-center">
              <Text className="text-4xl mb-2">⚠️</Text>
              <Text className="text-[17px] font-semibold text-red-400 mb-1.5">Couldn't load this star</Text>
              <Text className="text-xs text-slate-400 text-center mb-4">{error}</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="bg-[#1e293b] px-5 py-2.5 rounded-lg"
                  onPress={onRetry}
                >
                  <Text className="text-slate-200 font-semibold text-sm">Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-blue-600 px-5 py-2.5 rounded-lg"
                  onPress={onClose}
                >
                  <Text className="text-white font-semibold text-sm">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : profile ? (
            <ScrollView contentContainerClassName="p-5 pb-8 gap-4">
              <View className="flex-row gap-2">
                <Text className="text-[11px] text-slate-400 bg-[#1e293b] px-2 py-0.5 rounded overflow-hidden font-medium">
                  HIP {profile.hip_id}
                </Text>
                {profile.magnitude != null ? (
                  <Text className="text-[11px] text-sky-400 bg-[#1e293b] px-2 py-0.5 rounded overflow-hidden font-semibold">
                    Mag {profile.magnitude.toFixed(2)}
                  </Text>
                ) : null}
              </View>

              {alternateNames.length > 0 ? (
                <Text className="text-xs text-slate-400 italic">
                  Also known as: {alternateNames.join(", ")}
                </Text>
              ) : null}

              {hasIdentity ? (
                <View className="bg-[#0f172a] rounded-xl p-3.5 border border-[#1e293b]">
                  <Text className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                    Identity
                  </Text>
                  {profile.bayer_designation ? (
                    <DetailRow
                      label="Bayer designation"
                      value={profile.bayer_designation}
                    />
                  ) : null}
                  {profile.flamsteed_designation ? (
                    <DetailRow
                      label="Flamsteed designation"
                      value={profile.flamsteed_designation}
                    />
                  ) : null}
                  {profile.constellation ? (
                    <DetailRow
                      label="Constellation"
                      value={profile.constellation}
                    />
                  ) : null}
                </View>
              ) : null}

              {hasAstrometry ? (
                <View className="bg-[#0f172a] rounded-xl p-3.5 border border-[#1e293b]">
                  <Text className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                    Catalog Position
                  </Text>
                  {profile.right_ascension_hours != null ? (
                    <DetailRow
                      label="Right ascension"
                      value={`${profile.right_ascension_hours.toFixed(3)} h`}
                    />
                  ) : null}
                  {profile.declination_degrees != null ? (
                    <DetailRow
                      label="Declination"
                      value={`${profile.declination_degrees.toFixed(3)}°`}
                    />
                  ) : null}
                  {profile.parallax_mas != null ? (
                    <DetailRow
                      label="Parallax"
                      value={`${profile.parallax_mas.toFixed(2)} mas`}
                    />
                  ) : null}
                  {profile.proper_motion_ra_mas != null ? (
                    <DetailRow
                      label="Proper motion (RA)"
                      value={`${profile.proper_motion_ra_mas.toFixed(2)} mas/yr`}
                    />
                  ) : null}
                  {profile.proper_motion_dec_mas != null ? (
                    <DetailRow
                      label="Proper motion (Dec)"
                      value={`${profile.proper_motion_dec_mas.toFixed(2)} mas/yr`}
                    />
                  ) : null}
                </View>
              ) : null}

              {hasPhysical ? (
                <View className="bg-[#0f172a] rounded-xl p-3.5 border border-[#1e293b]">
                  <Text className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                    Physical Properties
                  </Text>
                  {profile.magnitude != null ? (
                    <DetailRow
                      label="Apparent magnitude"
                      value={profile.magnitude.toFixed(2)}
                    />
                  ) : null}
                  {profile.spectral_type ? (
                    <DetailRow
                      label="Spectral type"
                      value={profile.spectral_type}
                    />
                  ) : null}
                  {profile.distance_light_years != null ? (
                    <DetailRow
                      label="Distance"
                      value={`${profile.distance_light_years.toFixed(1)} light-years`}
                    />
                  ) : null}
                </View>
              ) : null}

              {hasDescription ? (
                <View className="bg-[#0f172a] rounded-xl p-3.5 border border-[#1e293b]">
                  <Text className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                    About
                  </Text>
                  <Text className="text-xs text-slate-300 leading-5">{profile.description}</Text>
                </View>
              ) : null}

              {!hasAnyMetadata ? (
                <View className="p-8 items-center">
                  <Text className="text-sm text-slate-400 text-center">
                    Only basic catalog data is available for this star.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
