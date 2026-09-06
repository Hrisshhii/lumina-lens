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