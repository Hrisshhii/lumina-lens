import React from "react";
import {ActivityIndicator,Pressable,ScrollView,Text,TouchableOpacity,View} from "react-native";
import type { StarProfile } from "../services/api";

interface StarDetailModalProps {
  visible: boolean;
  loading: boolean;
  error: string | null;
  profile: StarProfile | null;
  onClose: () => void;
  onRetry: () => void;
}

function DetailRow({label,value,}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row justify-between border-b border-cosmos-border py-1.5">
      <Text className="mr-3 shrink text-xs text-slate-400">
        {label}
      </Text>

      <Text className="shrink text-right text-xs font-semibold text-slate-200">
        {value}
      </Text>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-cosmos-border bg-cosmos-hud p-3.5">
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </Text>
  );
}

// Star identity and metadata bottom sheet.
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
  const hasAnyMetadata =
    hasIdentity || hasAstrometry || hasPhysical || hasDescription;

  return (
    <View className="absolute inset-0 z-[9999]" style={{ elevation: 50 }}>
      {/* Backdrop */}
      <Pressable onPress={onClose}
        className="absolute inset-0 bg-slate-950/80"
        accessibilityRole="button"
        accessibilityLabel="Close star details"
      />

      {/* Bottom sheet */}
      <View className="absolute bottom-0 left-0 right-0 max-h-[88%] overflow-hidden rounded-t-3xl border border-b-0 border-cosmos-border bg-cosmos-card">
        {/* Drag handle */}
        <View className="items-center pb-1 pt-2">
          <View className="h-1 w-9 rounded-full bg-slate-700" />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-cosmos-border px-5 pb-3 pt-2">
          <View className="mr-3 flex-1">
            <Text
              className="text-[22px] font-bold text-slate-50"
              numberOfLines={1}
            >
              {loading || error ? "Star Details" : displayName}
            </Text>

            {!loading && !error && profile?.constellation ? (
              <Text className="mt-0.5 text-xs text-slate-400">
                {profile.constellation}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="h-8 w-8 items-center justify-center rounded-full bg-slate-800"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text className="text-base font-semibold text-slate-400">
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading state */}
        {loading ? (
          <View className="items-center p-8">
            <ActivityIndicator size="large" color="#60a5fa" />

            <Text className="mt-3 text-center text-sm text-slate-400">
              Fetching star profile…
            </Text>
          </View>
        ) : error ? (
          /* Error state */
          <View className="items-center p-8">
            <Text className="mb-2 text-4xl">⚠️</Text>

            <Text className="mb-1.5 text-[17px] font-semibold text-red-400">
              Couldn't load this star
            </Text>

            <Text className="mb-4 text-center text-xs text-slate-400">
              {error}
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="rounded-lg bg-slate-800 px-5 py-2.5"
                onPress={onRetry}
              >
                <Text className="text-sm font-semibold text-slate-200">
                  Retry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-lg bg-blue-600 px-5 py-2.5"
                onPress={onClose}
              >
                <Text className="text-sm font-semibold text-white">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : profile ? (
          /* Star profile */
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 p-5 pb-8"
            showsVerticalScrollIndicator={false}
          >
            {/* Catalog badges */}
            <View className="flex-row flex-wrap gap-2">
              <Text className="overflow-hidden rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                HIP {profile.hip_id}
              </Text>

              {profile.magnitude != null ? (
                <Text className="overflow-hidden rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-sky-400">
                  Mag {profile.magnitude.toFixed(2)}
                </Text>
              ) : null}
            </View>

            {alternateNames.length > 0 ? (
              <Text className="text-xs italic text-slate-400">
                Also known as: {alternateNames.join(", ")}
              </Text>
            ) : null}

            {/* Identity */}
            {hasIdentity ? (
              <SectionCard>
                <SectionTitle>Identity</SectionTitle>

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
              </SectionCard>
            ) : null}

            {/* Catalog position */}
            {hasAstrometry ? (
              <SectionCard>
                <SectionTitle>Catalog Position</SectionTitle>

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
              </SectionCard>
            ) : null}

            {/* Physical properties */}
            {hasPhysical ? (
              <SectionCard>
                <SectionTitle>Physical Properties</SectionTitle>

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
              </SectionCard>
            ) : null}

            {/* Description */}
            {hasDescription ? (
              <SectionCard>
                <SectionTitle>About</SectionTitle>

                <Text className="text-xs leading-5 text-slate-300">
                  {profile.description}
                </Text>
              </SectionCard>
            ) : null}

            {!hasAnyMetadata ? (
              <View className="items-center p-8">
                <Text className="text-center text-sm text-slate-400">
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
