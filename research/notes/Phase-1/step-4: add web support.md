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
