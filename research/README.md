# Phase 0 Research -- Lumina Lens

## Project Goal

Create a mobile application that identifies every visible star in the
camera view, allows the user to tap any identified object, and provides
rich astronomical information using computer vision, astronomy
libraries, and AI.

------------------------------------------------------------------------

# Core Research Areas

## 1. Astronomy Fundamentals

Topics to learn: 
- Celestial Sphere 
- Right Ascension (RA) 
- Declination(Dec) 
- Altitude & Azimuth 
- Apparent Magnitude 
- Spectral Classes 
- Proper Motion 
- Constellations

Why it matters: Star catalogs store positions using RA/Dec. Phones
observe the sky using Altitude/Azimuth, so coordinate conversion is
essential.

------------------------------------------------------------------------

## 2. Star Catalogs

Evaluate: 
- Hipparcos (good starting point) 
- Gaia DR3 (very large, high precision) 
- Messier Catalog 
- NGC Catalog

Recommendation: Begin with Hipparcos, later upgrade to Gaia.

------------------------------------------------------------------------

## 3. Phone Sensors

Needed: 
- GPS 
- Compass 
- Gyroscope 
- Accelerometer

Purpose: Estimate the camera's pointing direction before computer vision
refinement.

------------------------------------------------------------------------

## 4. Computer Vision

Research: 
- Image preprocessing 
- Noise reduction 
- Bright point detection 
- Blob detection 
- Feature extraction

Libraries: 
- OpenCV 
- OpenCV Mobile

------------------------------------------------------------------------

## 5. Plate Solving

Goal: 
Match detected star patterns with catalog data to identify every visible star.

Keywords: 
- Triangle matching 
- Astrometry 
- Feature matching

------------------------------------------------------------------------

## 6. AI Layer

Use after identification.

Tasks: 
- Explain stars 
- Compare objects 
- Answer astronomy questions

------------------------------------------------------------------------

## Deliverables for Phase 0

-   Understand astronomy concepts
-   Choose technologies
-   Design architecture
-   Plan milestones
