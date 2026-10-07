# Phase 2: Computer Vision & Star Detection

## Objective
- we build the computer vision pipeline that sees where stars actually are through the physical camera lens

---

## Phase 1 Plan
```text
Phase 2: Computer Vision & Star Detection
├── Step 1: Camera Access & Live Viewfinder (Expo Camera setup in React Native)
├── Step 2: Night-Sky Frame Acquisition & Resolution Configuration
├── Step 3: Image Preprocessing (Grayscale conversion & Gaussian / median noise filtering)
├── Step 4: Background Estimation & Adaptive Luminance Thresholding
├── Step 5: Star Blob Detection & Sub-Pixel Centroid Extraction (Intensity-weighted Center of Mass)
└── Step 6: Star Candidate Debug Overlay (Visualizing extracted star centroids on device)
```
---

### Tasks: 
Step 1:
1. Set up camera permissions & hardware integration: Install and configure expo-camera in the mobile app.
2. Build a dedicated Camera Viewfinder component: Create a live camera view with low-light/night-sky camera settings.
3. Add a View Mode Switcher entry: Update App.tsx with a 📷 Camera / Lens mode alongside the existing 🌌 Celestial Dome and 📋 Star List.
4. Create Phase 2 documentation structure: Initialize research/notes/Phase-2/ and create step-1: camera integration.md.

---

## Phase 1 Step Documentation