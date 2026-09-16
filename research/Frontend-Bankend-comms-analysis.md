# Frontend ↔ Backend Integration Analysis — `lumina-lens`

---

## 1. Current Architecture Overview

Lumina Lens employs a client-server architecture where the mobile client communicates with a local or network FastAPI backend over HTTP/JSON:

```text
app/App.tsx (Main UI & Sensor Orchestration)
   │
   ▼
app/src/services/api.ts (Typed HTTP Client)
   │  GET /sky/visible?latitude={lat}&longitude={lon}&limit=50
   │  GET /stars/{hip_id}
   ▼
backend/app/main.py (FastAPI Application)
   ├── backend/app/api/sky.py ──────► AstronomyEngine (Skyfield + DE421 + Hipparcos)
   └── backend/app/api/stars.py ────► StarService (Hipparcos row + ENRICHED_METADATA)
```

---

## 2. API Integration Map

### Integration 1: Visible Sky List (`GET /sky/visible`)
- **Frontend Caller:** `App.tsx` via `getVisibleStars(lat, lon, limit)` in `app/src/services/api.ts`.
- **Dynamic Parameters:** Live latitude and longitude supplied dynamically by `getDeviceLocation()` (`expo-location`), with fallback to default Pune coordinates if permissions are denied.
- **Backend Handler:** `backend/app/api/sky.py :: get_visible_stars`.
- **Processing:** `AstronomyEngine` computes topocentric Altitude & Azimuth for ~5,000 Hipparcos stars, filters for $\text{Altitude} > 0^\circ$, sorts by visual brightness ($V$ magnitude ascending), and caps at requested limit.
- **Response Format:**
  ```json
  {
    "latitude": 18.5204,
    "longitude": 73.8567,
    "count": 50,
    "stars": [
      {
        "hip": 32349,
        "name": "Sirius",
        "altitude": 42.15,
        "azimuth": 138.42,
        "magnitude": -1.44
      }
    ]
  }
  ```
- **UI Consumer:** `FlatList` in `App.tsx` rendering star cards with visual badges, azimuth compass bearings, and altitude coordinates.

---

### Integration 2: Star Profile & Metadata (`GET /stars/{hip_id}`)
- **Frontend Caller:** `App.tsx` via `handleStarPress(hipId)` calling `getStarByHip(hipId)` in `app/src/services/api.ts`.
- **Backend Handler:** `backend/app/api/stars.py :: get_star`.
- **Processing:** `StarService` resolves the star's Hipparcos catalog entry, computes physical distance from trigonometric parallax ($d = 3261.56 / \varpi$), merges enriched astrophysical records from `ENRICHED_METADATA`, and returns a validated Pydantic `Star` model.
- **Response Format:**
  ```json
  {
    "hip_id": 91262,
    "primary_name": "Vega",
    "alternate_names": ["Alpha Lyrae", "Wega"],
    "bayer_designation": "Alpha Lyrae",
    "flamsteed_designation": "3 Lyrae",
    "constellation": "Lyra",
    "right_ascension_hours": 18.6156,
    "declination_degrees": 38.7836,
    "apparent_magnitude": 0.03,
    "spectral_type": "A0Va",
    "distance_light_years": 25.04,
    "parallax_mas": 130.23,
    "proper_motion_ra_mas": 201.03,
    "proper_motion_dec_mas": 286.23,
    "description": "Vega is the brightest star in the northern constellation of Lyra..."
  }
  ```
- **UI Consumer:** `StarDetailModal.tsx` rendering an interactive sheet with badges, astrometry, astrophysics, and descriptions.

---

### Integration 3: Health & Liveness Check (`GET /health`)
- **Backend Handler:** `backend/app/main.py :: health_check`.
- **Response:** `{"status": "healthy"}`.
- **Client Status:** Exported in `api.ts` as `healthCheck()` for diagnostic testing.

---

## 3. Communication & Contract Status

| Checkpoint | Status | Notes |
|:---|:---|:---|
| **End-to-End Connectivity** | ✅ **Active** | Both `/sky/visible` and `/stars/{id}` fully operational. |
| **Dynamic Geolocation** | ✅ **Active** | Client queries device GPS and transmits live coordinates to `/sky/visible`. |
| **Error Handling** | ✅ **Active** | Detailed error feedback on network drops or backend 404s with Retry options in the modal and main list. |
| **Data Types** | ✅ **Consistent** | `api.ts` maps `hip_id` for star profiles and `hip` for sky visible stars cleanly. |

---

## 4. Recommendations for Future Iterations

1. **Environment Configuration for Base URL:**
   - Define `EXPO_PUBLIC_API_URL` in an `.env` file so the app can target physical devices on Wi-Fi without code modifications.
2. **Pydantic Response Model for `/sky/visible`:**
   - Define a `VisibleStarsResponse` Pydantic model on the backend for `/sky/visible` to ensure automated OpenAPI documentation matches the frontend TypeScript interface.
3. **HTTP Timeout / AbortController:**
   - Introduce an `AbortController` timeout (e.g. 8 seconds) in `app/src/services/api.ts` to cleanly catch hung requests on weak cellular connections.