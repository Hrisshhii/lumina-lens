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
User Location
+
Current Date & Time
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
