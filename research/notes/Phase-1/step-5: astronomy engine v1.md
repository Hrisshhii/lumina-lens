## Step 5: Astronomy Engine v1
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
