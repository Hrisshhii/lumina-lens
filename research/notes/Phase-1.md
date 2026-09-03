# Phase 1 — Foundation & Sky Prediction

## Objective
Build the technical foundation of Lumina Lens and create the first working sky-prediction system.
The main goal of Phase 1 is:
> Given the user's location and current time, calculate which stars should currently be visible in the sky.
Computer vision, plate solving, AR, and AI are not part of this phase yet.

---

## Phase 1 Plan

1. Set up the React Native mobile application.
2. Set up the FastAPI backend.
3. Connect the mobile application to the backend.
4. Build the Astronomy Engine.
5. Integrate the Hipparcos star catalog.
6. Calculate visible stars using location and time.
7. Build the Sensor Engine.
8. Create a debug sky visualization.
9. Test astronomical predictions.

---

# Step 1 — Verify Git Repository
```bash
pwd
git status
```

---

# Step 2 — Create Mobile Application

Technology selected:
* React Native
* Expo
* TypeScript

- Created the Expo application inside the project repository:

```bash
npx create-expo-app@latest app --template blank-typescript
```

- This created:
```text
lumina-lens/
│
├── app/
│   ├── App.tsx
│   ├── assets/
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
│
├── backend/
├── docs/
├── research/
├── datasets/
└── assets/
```

The `app/` directory will contain the Lumina Lens mobile application.

---

# Step 3 — Start Expo Development Server
- Enter the app:  cd app
- Started Expo:

```bash
npx expo start
```

Expo successfully started the Metro Bundler.
A development server became available on the local network and Expo generated a QR code that can be opened using Expo Go.
This confirmed that the React Native project was created successfully.

---

# Step 4 — Add Web Support
- When attempting to run the application on the web, Expo reported that the required web dependencies were missing.
- Required packages:
* `react-dom`
* `react-native-web`

- Install them using Expo's package manager:
```bash
npx expo install react-dom react-native-web
```
- Using `expo install` instead of regular `npm install` allows Expo to select package versions compatible with the installed Expo SDK.
- Restart the development server:
```bash
npx expo start
```

- Expo development options now include:
```text
w → Web
i → iOS Simulator
QR Code → Physical device using Expo Go
```

---

# Why Web Support Is Useful

Lumina Lens is primarily a mobile application because its core functionality depends on physical phone hardware:

* Camera
* GPS
* Magnetometer
* Gyroscope
* Accelerometer

However, web support is useful during development for quickly testing:

* UI components
* Star information screens
* Settings
* Navigation
* API responses
* General layouts

Sensor and camera functionality will eventually need to be tested using a physical phone.

---

# Current Architecture

The project currently has the beginning of two major components:

```text
Lumina Lens

┌─────────────────────┐
│     Mobile App      │
│                     │
│ React Native        │
│ Expo                │
│ TypeScript          │
└──────────┬──────────┘
           │
           │ HTTP API
           ▼
┌─────────────────────┐
│      Backend        │
│                     │
│ FastAPI             │
│ Python              │
└─────────────────────┘
```

The mobile application foundation has been created.

The backend will be implemented next.

---

# Current Project Structure

```text
lumina-lens/
│
├── app/                 # React Native / Expo application
│
├── backend/             # FastAPI backend
│
├── docs/                # Architecture and project documentation
│
├── research/            # Phase 0 research
│
├── datasets/            # Astronomy datasets
│
├── assets/              # Shared assets
│
├── README.md
└── .gitignore
```

---

# Phase 1 Progress

## Completed

* [x] Verify GitHub repository connection
* [x] Verify `main` branch
* [x] Create React Native application
* [x] Configure Expo
* [x] Configure TypeScript
* [x] Start Metro development server
* [x] Add Expo web dependencies
* [x] Establish initial project structure

## Next

* [ ] Create Python virtual environment
* [ ] Install FastAPI
* [ ] Create backend application
* [ ] Create `/health` API endpoint
* [ ] Run FastAPI development server
* [ ] Connect Expo application to FastAPI
* [ ] Create Astronomy Engine
* [ ] Integrate Hipparcos catalog
* [ ] Calculate visible stars
* [ ] Begin Sensor Engine
* [ ] Build debug sky visualization

---

## Phase 1 Success Condition

At the end of Phase 1, Lumina Lens should be capable of taking:

```text
User Location + Current Date & Time
        ↓
Astronomy Engine
        ↓
Visible Stars
```

and returning astronomical information such as:

```text
Vega

Altitude: 62.4°
Azimuth: 71.8°
Magnitude: 0.03
```

This will be the first functional astronomy capability of Lumina Lens.

## Next:
Astronomy Engine v1
We'll install:
- Skyfield
- Astropy
Then answer the first astronomy question:
```text
"Given my latitude, longitude, and the current time, which stars are visible above the horizon?"
```
That will be the first feature that makes Lumina Lens more than a template—it will become an actual astronomy application.


## Astronomy Engines:
```text
Latitude + Longitude + Current Time
                ↓
            Skyfield
                ↓
          Visible Stars
                ↓
            Altitude
                ↓
            Azimuth
```


### Lumina Lens Astronomy Engine:
```text
It takes: Latitude & Longitude & Time

and does: 

        RA/Dec
          ↓
        Skyfield
          ↓
    Observer position
          ↓
    Celestial coordinates
          ↓
      Altitude/Azimuth

then: 
if position["altitude"] > 0:
means:
The star is above the local horizon.
```

## Step 3: Astronomy Engine v1
- Build the first real astronomy functionality of Lumina Lens: calculate the position of known stars based on the observer's location and current time.

What We Did: 

1. Updated Python Environment
Switched the backend from Python 3.9.6 to Python 3.12.14.
Recreated the backend .venv.
Reinstalled project dependencies.
This fixed compatibility issues with modern Python syntax such as datetime | None.

2. Installed Astronomy Libraries
Skyfield - main astronomy calculation library
Astropy
NumPy

3. Created Astronomy Engine

Created:
```text
backend/app/engines/astronomy/
├── astronomy_engine.py
└── star_data.py
```
Added a small initial dataset containing: Sirius & Vega & Betelgeuse & Polaris
Each star has: Right Ascension & Declination & Apparent magnitude

4. Implemented Sky Calculations
The Astronomy Engine takes: Latitude & Longitude & Current Time
and calculates: Altitude & Azimuth & Distance

It filters out stars below the horizon: altitude > 0

5. Added FastAPI Sky Endpoint

Created:
```text
GET /sky/visible
```
Example:
```text
/sky/visible?latitude=18.5204&longitude=73.8567
```
This returns the stars currently above the horizon for that location.

6. Fixed Skyfield Observer Calculation

- Initially the API returned a 500 Internal Server Error.
- The issue was that the observer needed to be calculated relative to Earth.
- We changed the implementation to:
```text
  Earth + Observer Location
        ↓
  Topocentric Observer
        ↓
  Star Position
```
Skyfield's de421.bsp planetary ephemeris is loaded to provide the Earth reference.

7. Verified Through Swagger
- Tested the endpoint through:
```text
http://127.0.0.1:8000/docs
```
using:
```text
Latitude:  18.5204
Longitude: 73.8567
```
The /sky/visible endpoint now successfully performs the astronomy calculation.

### Current Data Flow
```text
      Location + Time
            ↓
      Astronomy Engine
            ↓
      Skyfield
            ↓
      Star RA/Dec
            ↓
      Altitude + Azimuth
            ↓
      Horizon Filtering
            ↓
      Visible Stars
```

Status
 Python 3.12 environment
 Astronomy dependencies
 Astronomy Engine v1
 Test star dataset
 Skyfield Earth observer
 /sky/visible API
 Successful astronomy calculation

## Step 4: Hipparcos Catalog Integration:
- Moving to real astronomical star catalog
- We want:
```text
Hipparcos Catalog
        ↓
Thousands of stars
        ↓
Astronomy Engine
        ↓
Altitude / Azimuth
        ↓
Visible stars
```

- The Hipparcos catalog gives us standardized astronomical data for stars, including identifiers and positional information