## Step 8: Star Identity & Metadata;

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
