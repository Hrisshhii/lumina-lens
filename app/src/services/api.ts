const BASE_URL = "http://localhost:8000";

export async function healthCheck() {
  const response = await fetch(`${BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to connect to backend");
  }

  return response.json();
}