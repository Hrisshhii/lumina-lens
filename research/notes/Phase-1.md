# Foundation & Sky Prediction:
1. Project setup — React Native/Expo mobile app + FastAPI backend, environment files, Git structure.
2. Mobile shell — basic navigation and placeholder Camera/Sky screens.
3. Backend shell — FastAPI server with /health.
4. Astronomy Engine v0.1 — load Hipparcos data and calculate star positions from location + time.
5. Visible-star API — something like GET /sky/visible?lat=...&lon=....
6. Sensor Engine v0.1 — get phone location and later orientation.
7. Connect mobile → backend — send location/time and receive visible stars.
8. Debug Sky View — before using the camera, display the predicted stars on a simple 2D sky screen so we can verify the astronomy is correct.
9. Tests + documentation — verify known stars/locations and document the first working architecture.