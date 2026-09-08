import { Platform } from "react-native";

export const BASE_URL = Platform.select({
  android: "http://10.0.2.2:8000",
  default: "http://localhost:8000",
});

export interface Star {
  hip: number;
  name: string;
  altitude: number;
  azimuth: number;
  magnitude: number;
}

export interface VisibleStarsResponse {
  latitude: number;
  longitude: number;
  count: number;
  stars: Star[];
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("Failed to connect to backend");
  }
  return response.json();
}

export async function getVisibleStars(
  latitude: number,
  longitude: number,
  limit: number = 50
): Promise<VisibleStarsResponse> {
  const response = await fetch(
    `${BASE_URL}/sky/visible?latitude=${latitude}&longitude=${longitude}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch visible stars: ${response.statusText}`);
  }
  return response.json();
}

// Star profile returned by GET /stars/{hip_id}
export interface StarProfile {
  hip: number;
  primary_name: string;
  alternate_names?: string[];
  bayer_designation?: string;
  flamsteed_designation?: string;
  constellation?: string;
  right_ascension_hours?: number;
  declination_degrees?: number;
  parallax_mas?: number;
  proper_motion_ra_mas?: number;
  proper_motion_dec_mas?: number;
  magnitude?: number;
  spectral_type?: string;
  distance_light_years?: number;
  description?: string;
}

export async function getStarByHip(hipId: number): Promise<StarProfile> {
  const response = await fetch(`${BASE_URL}/stars/${hipId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch star profile: ${response.statusText}`);
  }
  return response.json();
}