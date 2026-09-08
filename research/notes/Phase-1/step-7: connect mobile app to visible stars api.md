## Step 5: Connect Mobile App to Visible Stars API
- Connecting the React Native / Expo application to the backend's `/sky/visible` endpoint.

### What We Did:

1. Created Typed API Service
- Updated `app/src/services/api.ts` with `Star` and `VisibleStarsResponse` interfaces.
- Added platform-aware `BASE_URL` (`10.0.2.2` for Android emulator, `localhost` for web/iOS).
- Implemented `getVisibleStars(latitude, longitude, limit)` to fetch stars currently above the local horizon.

2. Built Star Prediction UI
- Updated `app/App.tsx` with an astronomy-focused dark night-sky theme (`#070b14`).
- Displayed each star's:
  * Name (prominent star names highlighted in gold, HIP numbers for others)
  * Catalog ID (`HIP <number>`)
  * Apparent magnitude (`Mag <val>`)
  * Celestial coordinates: Altitude (`Alt <val>°`) and Azimuth with compass cardinal directions (`Az <val>° (NW)`)
  * Brightness rank
- Added pull-to-refresh (`RefreshControl`) allowing live sky recalculation as time progresses.
- Added loading indicators and connection error handling with retry functionality.

Status
  Python 3.12 environment
  Astronomy dependencies & pandas
  Astronomy Engine v1 (Mock dataset)
  Hipparcos Catalog Integration (5,000+ stars)
  Vectorized Skyfield calculations (~20ms)
  Prominent star name mapping
  /sky/visible API with limit and brightness sorting
  Mobile app connected to /sky/visible
  Dynamic star list UI with coordinates and compass heading
