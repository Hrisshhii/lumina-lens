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

## Phase 1 Step Documentation

- [Step 1: Verify Git Repository](./step-1:%20verify%20git%20repository.md)
- [Step 2: Create Mobile Application](./step-2:%20create%20mobile%20application.md)
- [Step 3: Start Expo Development Server](./step-3:%20start%20expo%20development%20server.md)
- [Step 4: Add Web Support](./step-4:%20add%20web%20support.md)
- [Step 5: Astronomy Engine v1](./step-5:%20astronomy%20engine%20v1.md)
- [Step 6: Hipparcos Catalog Integration](./step-6:%20hipparcos%20catalog%20integration.md)
- [Step 7: Connect Mobile App to Visible Stars API](./step-7:%20connect%20mobile%20app%20to%20visible%20stars%20api.md)
- [Step 8: Star Identity & Metadata](./step-8:%20star%20identity%20&%20metadata.md)
- [Step 9: Sensor Engine](./step-9:%20sensor%20engine.md)

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
* [x] Create Python virtual environment
* [x] Install FastAPI
* [x] Create backend application
* [x] Create `/health` API endpoint
* [x] Run FastAPI development server
* [x] Connect Expo application to FastAPI
* [x] Create Astronomy Engine
* [x] Integrate Hipparcos catalog
* [x] Calculate visible stars

## Next

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
