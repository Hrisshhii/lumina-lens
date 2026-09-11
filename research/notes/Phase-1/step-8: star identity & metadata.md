## Step 8: A - Star Identity & Metadata;

- The current Astronomy Engine can determine where visible stars are located in the sky.
- For example:
```text
{
  "hip": 91262,
  "name": "Vega",
  "altitude": 59.776,
  "azimuth": 42.429,
  "magnitude": 0.03
}
```
- This is enough for sky-position calculations, but it is not enough for the main Lumina Lens experience:
```text
Point the camera at a star → identify the star → tap it → display useful information about it.
```
<b>Therefore, Lumina Lens needs a separate Star Identity & Metadata layer.</b>

### Current flow:
```text
Device Location + Time
        ↓
Astronomy Engine
        ↓
Hipparcos Catalog
        ↓
Skyfield
        ↓
Altitude + Azimuth
        ↓
Visible Stars
        ↓
FastAPI
        ↓
React Native
```
- The next layer will extend this to:
```text
Hipparcos
    ↓
Star Identity / Metadata
    ↓
Star Profile
    ↓
FastAPI
    ↓
Lumina Lens UI
```

- we currently use Hipparcos catalog through skyfield. It provides important astrometric and photometric info:
```text
- HIP identifier
- Right Ascension
- Declination
- Visual magnitude
- Trigonometric parallax
- Proper motion in Right Ascension
- Proper motion in Declination
```

- Our current Hipparcos/Skyfield pipeline can provide:
```text
HIP ID
RA
Dec
Magnitude
Parallax
Proper Motion
```
Our Astronomy Engine additionally calculates:
```text
Altitude
Azimuth
Current apparent position
```
These values should remain part of the astronomy layer.

- Information we need: 
For the user-facing star profile, we want to eventually support:
```text
Common name
HIP designation
HD designation
HR designation
Bayer designation
Flamsteed designation
Constellation
Spectral type
Magnitude
Distance
Right Ascension
Declination
Parallax
Proper motion
Scientific description
Other identifiers
```
Not every star will have every field.
- The system must therefore support missing/unknown metadata gracefully.

### The Astronomy Engine should answer:
```text
Where is this object in the sky?
```
Therefore it is Responsible for:
```text
RA / Dec
Time
Observer location
Altitude
Azimuth
Visibility
Apparent position
``` 
### The Star Identity/Metadata system should answer:
```text
What is this object?
```
Responsible for:
```text
Names
Identifiers
Constellation
Spectral type
Distance
Descriptions
Cross-identifications
Additional scientific metadata
```
### Potential Metadata Sources
1. Hipparcos
Role: Primary astrometric catalog.
Useful for:
```text
HIP ID
RA
Dec
V magnitude
Parallax
Proper motion
```
Hipparcos is already integrated into Lumina Lens through Skyfield.

2. SIMBAD
Role: Candidate scientific metadata and cross-identification source.
SIMBAD is useful for connecting astronomical objects with multiple identifiers and additional scientific information.
Potentially useful information includes:
```text
Object identifiers
Coordinates
Magnitudes
Spectral classifications
Proper motion
Parallax
Cross-identifications
Bibliographic information
```
SIMBAD should not be queried individually for every visible star during normal app usage. Instead, it should be considered part of a metadata ingestion/enrichment process.

### Architecture: 
```bash
              DATA INGESTION
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
    Hipparcos                 SIMBAD
        │                       │
        └───────────┬───────────┘
                    ↓
          Lumina Lens Database
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
   Astronomy Engine      Star Service
          │                   │
          └─────────┬─────────┘
                    ↓
                 FastAPI
                    ↓
               Mobile App
```

- Proposed API
The existing endpoint:
```text
GET /sky/visible
```
answers: <b>Which stars are visible?</b>

We should add a separate endpoint:
```text
GET /stars/{hip_id}
```
Example: GET /stars/91262

This should answer: <b>What do we know about HIP 91262?</b>

### Camera Flow: 
```text
          Camera
            ↓ 
  Detected star position
            ↓ 
  Camera coordinate system
            ↓
      Sky coordinates
            ↓
  Candidate Hipparcos stars
            ↓
      Star matching
            ↓
          HIP ID
            ↓
        Star Profile
            ↓ 
      User taps star
            ↓ 
    Information screen
```

------------------------------------------------------------------------

# Step 8 Status:
The backend half of this step (the <code>GET /stars/{hip_id}</code> endpoint and <code>StarService</code> metadata layer) was already complete.

```text
User taps star in list
        ↓
GET /stars/{hip_id}
        ↓
Star Profile (Pydantic Star)
        ↓
StarDetailModal renders identity & metadata
```

## Changes Made (frontend only — no backend changes)

### 1. `app/App.tsx` — Fixed launch-blocking crash
- The star-detail state (`selectedStar`, `detailLoading`, `modalVisible`) and the `handleStarPress` handler had been declared at <b>module scope, outside the component</b>. Calling hooks at module level throws React's <i>"Invalid hook call"</i> — the app crashed at import time.
- All of it is now moved <b>inside the `App()` component</b>, wrapped in `useCallback` with correct dependencies.
- Added supporting state: `selectedHip` (for Retry) and `detailError` (so 404/network failures are visible instead of a silent `console.warn`).
- Star cards in the list are now pressable (`TouchableOpacity`, with a "Tap to view profile →" hint) wired to `handleStarPress(item.hip)`.
- `StarDetailModal` is rendered at the root of the screen, receiving `visible / loading / error / profile / onClose / onRetry`.

### 2. `app/src/components/StarDetailModal.tsx` — New component
Renders the tapped star's identity & metadata in the existing dark theme, with three states:
```text
Loading  → spinner + "Fetching star profile…"
Error    → visible message + Retry + Close buttons (handles backend 404)
Profile  → full metadata, every section rendered only when data exists
```
Profile sections (gracefully handles missing fields, per this step's requirement that not every star has every field):
```text
Header    → primary name (falls back to "HIP <id>"), constellation, close button
Badges    → HIP id, apparent magnitude
Identity  → alternate names, Bayer designation, Flamsteed designation, constellation
Catalog Position → RA (h), Dec (°), parallax (mas), proper motion RA/Dec (mas/yr)
Physical Properties → apparent magnitude, spectral type, distance (light-years)
About     → scientific description
```

### 3. `app/src/services/api.ts` — Fixed `StarProfile` contract bug
- The interface previously declared the identifier as `hip`, but the backend serializes the Pydantic `Star` model, so `GET /stars/{hip_id}` returns <code>hip_id</code>. The modal would have rendered `undefined`.
- Changed to `hip_id: number` and made `primary_name` optional (`primary_name?: string | null`), with a comment documenting that `/stars/{id}` uses `hip_id` while `/sky/visible` items use `hip`.

## Next After This Step
- <b>Sensor Engine</b> (GPS / compass / gyroscope / accelerometer) — replaces the hardcoded Pune observer coordinates.
- <b>Debug sky visualization</b> — then test astronomical predictions (Phase 1 success condition).
- Deferred hardening (from the architecture analysis): env-driven <code>BASE_URL</code> (<code>EXPO_PUBLIC_API_URL</code>), typed <code>response_model</code> for <code>/sky/visible</code>, single catalog load in the backend.


