import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  const displayName =
    profile?.primary_name?.trim() || `HIP ${profile?.hip_id ?? ""}`;
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.title} numberOfLines={1}>
                {loading || error ? "Star Details" : displayName}
              </Text>
              {!loading && !error && profile?.constellation ? (
                <Text style={styles.subtitle}>{profile.constellation}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#60a5fa" />
              <Text style={styles.statusText}>Fetching star profile…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Couldn't load this star</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onRetry}
                >
                  <Text style={styles.secondaryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onClose}
                >
                  <Text style={styles.primaryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : profile ? (
            <ScrollView contentContainerStyle={styles.body}>
              <View style={styles.badgeRow}>
                <Text style={styles.hipBadge}>HIP {profile.hip_id}</Text>
                {profile.magnitude != null ? (
                  <Text style={styles.magBadge}>
                    Mag {profile.magnitude.toFixed(2)}
                  </Text>
                ) : null}
              </View>

              {alternateNames.length > 0 ? (
                <Text style={styles.alternateNames}>
                  Also known as: {alternateNames.join(", ")}
                </Text>
              ) : null}

              {hasIdentity ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Identity</Text>
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
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Catalog Position</Text>
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
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Physical Properties</Text>
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
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.description}>{profile.description}</Text>
                </View>
              ) : null}

              {!hasAnyMetadata ? (
                <View style={styles.centered}>
                  <Text style={styles.statusText}>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0d1527",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "#1e293b",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitles: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "600",
  },
  centered: {
    padding: 32,
    alignItems: "center",
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
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
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  body: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  hipBadge: {
    fontSize: 11,
    color: "#64748b",
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  magBadge: {
    fontSize: 11,
    color: "#38bdf8",
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  alternateNames: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  section: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  sectionTitle: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1e293b",
  },
  rowLabel: {
    fontSize: 13,
    color: "#94a3b8",
    flexShrink: 1,
    marginRight: 12,
  },
  rowValue: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  description: {
    fontSize: 13,
    color: "#cbd5e1",
    lineHeight: 20,
  },
});
