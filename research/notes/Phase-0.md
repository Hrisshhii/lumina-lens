# Module-1: Astronomy Fundamentals
- Latitude only exists on Earth, so imagine a sphere around the earth called Celestial Sphere.
- Every start assumed to be attached to the sphere
- The Celestial Sphere has Right Ascension (RA) and Declination (Dec) -> addresses of each star

1. Declination (Dec): similar to Earth's Latitude, range +90 to -90
eg: 
+90° -> North Celestial Pole
+45°
0° -> Celestial Equator
-45°
-90° -> South Celestial Pole

2. Right Ascension (RA): Longitude doesn't work cuz Earth rotates
- Hours are used
- full sky divided in 24 hrs -> every hr corresponds to 15 degrees.
eg: 24hr -> 360 , 1hr -> 15 , 2hr -> 30

# Star Catalog

Every star has an entry like this:

Star	RA	Dec
Sirius	06h45m	-16°
Vega	18h37m	+38°
Polaris	02h31m	+89°
Betelgeuse	05h55m	+07°

Hipparcos and Gaia catalogs stores this. 

- but phone doesn't answer that -> so converted to local coordinates: Altitude & Azimuth
- Altitude: How high something is above horizon, range 0 to 90
- Azimuth: Compass direction from North, range 0 to 360


- So the app does not search the entire sky but uses: Current time + GPS + Phone Orientation + What stars should be visible? and then compares with the camera image.

Process: 
When the app opens:

1. Read GPS coordinates.
2. Get the current date and time.
3. Read the phone's compass and orientation.
4. Use an astronomy library (like Skyfield) to compute the Altitude and Azimuth of nearby stars from their RA/Dec values.
5. Overlay those predicted positions on the camera.
6. Finally, use computer vision and plate solving to refine the match and identify every visible star.

# Module-2: Star Catalogs
- info comes from astronomical catalogs

- Major Catalogs used:
1. Hipparcos (~118,000 stars)
2. Gaia (~1.8 Billion)

- Messier Catalog: not a star catalog, contains famous deep sky objects
eg: Crab Nebula, Andromeda Galaxy, etc 

- NGC Catalog (New General Catalogue): contains Galaxies, Nebulae, Star clusters, etc. 

- How does app use use the Catalog: 
Camera opens ➡ Phone location ➡ Current time ➡ Skyfield predicts visible stars ➡ Load nearby Hipparcos entries ➡ Computer Vision finds stars ➡ Plate Solver matches stars ➡ User taps Sirius ➡ Display all stored information

# Module-3: Phone Sensors & Camera Geometry

- Sensors used: 
1. GPS : Loaction on Earth
2. Compass (Magnetometer): Direction of phone
3. Accelerometer : measures acceleration and gravity -> orientation of phone
4. Gyroscope : measures rotation

Combining all the sensors

- App needs: Location + Latitude & Longitude + Current Time + Phone Orientation

## Understanding Orientation
- three types of rotation 
- Heading (Yaw): Turning left and right
- Pitch: Looking up or down.
- Roll: Portrait & Landscape

## Pipeline: 
GPS + Current Time + Compass + Gyroscope + Accelerometer + Camera FOV

↓

Astronomy Engine

↓

Predict Visible Stars

↓

Only then

↓

Computer Vision

## Camera Coordinate System
- Astronomy Engine predicts positions in angles (Altitude and Azimuth) but camera works in <b>pixels</b>
- Architecture now:

Phone Sensors

↓

Sensor Engine

↓

Astronomy Engine

↓

Visible Object Prediction

↓

Computer Vision

↓

Plate Solver

↓

Catalog Engine

↓

AI Assistant

## Module-4: Computer Vision
1. Capture Image : Around 12 million pixels
2. Convert to Grayscale : color doesn't really help only brightness matters
3. Remove Noise : remove camera noise due to atmosphere, heat, etc
4. Thresholding : remove objects below a threshold to avoid unnecessary catches
5. Blob Detection : The computer groups connected bright pixels call it blob, one detected light source
6. Find the Center : Find the center of blob
7. Detect Every Star : repeat

- When clouds detected show a message "No stars detected" to avoid identifying random noises
- classify the objects so no unnecessay detection
- Later we can eliminate the aeroplace by identifying motion
- same for satellites

## Architecture:
Vision Engine

Camera

↓

Grayscale

↓

Noise Reduction

↓

Threshold

↓

Blob Detection

↓

Centroid Detection

↓

Pixel Coordinates

# Module-5: Plate Solving

The Key Insight
- distance between stars changes if you zoom
- position changes if you rotate
- brightness changes depending on your camera

Steps: 
1. Detect Stars
2. Build Triangles
3. Normalize the Triangle - makes the pattern scale invariant.
4. Search the Catalog - We generate triangle fingerprints from the star catalog
5. Solve the Camera 
Calculate: 
- Camera direction
- Camera rotation
- Camera field of view
- Exact sky coordinates

## The Complete Recognition Pipeline: 

Camera

↓

Vision Engine

↓

Bright Star Coordinates

↓

Pattern Generation

↓

Pattern Matching

↓

Plate Solving

↓

Identified Stars

↓

Catalog Lookup

↓

AI Explanation

## What If the Camera Misses a Star?
- maybe faint star detected
- Professional plate solvers are designed to tolerate this by searching many overlapping geometric patterns rather than relying on a single exact match.

Version 1

Use an existing, proven plate-solving library or service.

Goal:

Learn the pipeline
Validate the app idea
Build the rest of Lumina Lens
Version 2

Write your own simplified plate solver.

You'll understand:

Geometry
Spatial indexing
Search algorithms
Optimization
Version 3

Build an optimized Lumina Lens plate solver.


## Module-6: System Architecture: 
                    Lumina Lens

                    Mobile App
                         │
                         ▼
              ┌────────────────────┐
              │   Presentation UI  │
              └────────────────────┘
                         │
                         ▼
              ┌────────────────────┐
              │   Application Core │
              └────────────────────┘
                         │
      ┌──────────────┬───────────────┬───────────────┐
      ▼              ▼               ▼
 Sensor Engine   Vision Engine   Astronomy Engine
                                      │
                                      ▼
                              Pattern Engine
                                      │
                                      ▼
                               Plate Solver
                                      │
                                      ▼
                               Catalog Engine
                                      │
                                      ▼
                                 AI Engine

## The Engines: 

1. Sensor Engine: 
Responsible for:
- GPS
- Compass
- Gyroscope
- Accelerometer
- Device orientation
Never does astronomy.

2. Vision Engine:
Responsible for:
- Camera
- Frames
- Grayscale
- Blob Detection
- Star Detection

3. Astronomy Engine:
Responsible for:
Given:
- Latitude
- Longitude
- Time
Calculate: 
Visible Stars

↓

Altitude

↓

Azimuth

4. Pattern Engine: 
Responsible for:
- Generate Triangles
or
- Quads from detected stars.

5. Plate Solver:
- Pattern matching.

6. Catalog Engine: 
- database
Given: HIP 32349
Return : 

Everything
↓
Distance
↓
Mass
↓
Temperature
↓
Description

7. AI Engine: 
- It provides explanations, comparisons, and educational responses

## Folder Structure:
lumina-lens/

├── app/                 # React Native application
├── backend/             # FastAPI backend
├── docs/
├── research/
├── assets/
├── datasets/
└── shared/

## App Structure: 
app/

src/
    screens/
    components/
    services/
    hooks/
    store/
    types/
    utils/
    engines/
        sensor/
        vision/
        astronomy/
        pattern/
        plateSolver/
        catalog/
        ai/

## Backend:
- initial:
FastAPI
↓
Catalog API
↓
AI API
↓
Future APIs

- Later:
FastAPI
↓
Authentication
↓
User Profiles
↓
Observation History
↓
Cloud Sync

## Database: 
PostgreSQL
Users
Observations
Favorites
Settings
Downloads

- The star catalogs themselves will likely live as optimized files or specialized indexes rather than ordinary relational tables because they are large, mostly read-only datasets.

## Data Flow: 
Open Camera
↓
Sensor Engine
↓
Astronomy Engine
↓
Predict Stars
↓
Vision Engine
↓
Detect Stars
↓
Pattern Engine
↓
Plate Solver
↓
Catalog Engine
↓
UI
↓
AI

## Technology Choices
### Mobile
- React Native
- Expo
- TypeScript
### Backend
- FastAPI
- Python
### Astronomy
- Skyfield
- Astropy
### Computer Vision
- OpenCV
### AI

Keep this flexible.
Create an interface:
```
interface AIProvider {

    explain()

    compare()

    answer()
}
```

- Today: Gemini
- Tomorrow: OpenAI
- Later: Local LLM
No code changes elsewhere.

### Catalogs

- Start: Hipparcos
- Later: Gaia
- Then: Messier and NGC
The Catalog Engine should hide which source the data came from.