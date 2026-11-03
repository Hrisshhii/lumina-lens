/**
 * Verification Test for Phase 2 Step 6:
 * Multi-Asterism Star Overlay Verification (Orion, Summer Triangle, Cassiopeia)
 * Validates mapFrameToScreen mapping, reticle placement, and end-to-end integration.
 */

import { BENCHMARK_ASTERISMS, generateSyntheticRgba } from "./src/engines/vision/syntheticStarfield.ts";
import { preprocessFrame } from "./src/engines/vision/preprocessing.ts";
import { segmentLuminanceFrame } from "./src/engines/vision/background.ts";
import { extractStarCentroids } from "./src/engines/vision/centroidExtraction.ts";
import { mapFrameToScreen, getReticleRadius } from "./src/engines/vision/overlayMath.ts";

console.log("================================================================================");
console.log("🌌 LUMINA LENS — Phase 2 Step 6: Multi-Asterism Overlay & Verification Test");
console.log("================================================================================\n");

const asterismKeys = ["orion", "summer_triangle", "cassiopeia"];
const frameWidth = 800;
const frameHeight = 600;

// Device viewport simulation (mobile screen 390x844)
const viewWidth = 390;
const viewHeight = 844;

let allPassed = true;

for (const key of asterismKeys) {
  const config = BENCHMARK_ASTERISMS[key];
  console.log(`\n--- Testing Asterism: ${config.name} (${config.stars.length} stars) ---`);

  // 1. Synthetic RGBA generation
  const rgba = generateSyntheticRgba(config, frameWidth, frameHeight);

  // 2. Preprocess frame
  const prep = preprocessFrame(rgba, frameWidth, frameHeight, {
    enableGaussianBlur: true,
    enableHotPixelRemoval: true,
  });

  // 3. Segment & CFAR threshold
  const seg = segmentLuminanceFrame(prep.buffer, {
    tileSize: 32,
    sigmaMultiplier: 3.2,
    minNetIntensity: 5,
  });

  // 4. Centroid extraction
  const centroids = extractStarCentroids(
    seg.starMask,
    seg.netLuminance,
    { minPixelCount: 2, maxEllipticity: 0.55, minFlux: 12.0 },
    seg.backgroundMesh.globalStdDev
  );

  console.log(`   - Stars Extracted: ${centroids.stars.length} (Extraction time: ${centroids.executionTimeMs.toFixed(1)} ms)`);

  // 5. Verify screen overlay projection for each ground-truth star
  let matchedCount = 0;
  for (const truth of config.stars) {
    const truthFx = truth.x * frameWidth;
    const truthFy = truth.y * frameHeight;
    const truthScreen = mapFrameToScreen(truthFx, truthFy, frameWidth, frameHeight, viewWidth, viewHeight);

    // Find nearest centroid
    let minD = Infinity;
    let closest = null;
    for (const c of centroids.stars) {
      const d = Math.hypot(c.x - truthFx, c.y - truthFy);
      if (d < minD) {
        minD = d;
        closest = c;
      }
    }

    if (closest && minD < 1.0) {
      matchedCount++;
      const screenPos = mapFrameToScreen(closest.x, closest.y, frameWidth, frameHeight, viewWidth, viewHeight);
      const reticleRadius = getReticleRadius(closest.flux);
      const screenDelta = Math.hypot(screenPos.x - truthScreen.x, screenPos.y - truthScreen.y);

      // Verify that screen delta is well within 0.5px
      if (screenDelta > 0.5) {
        console.error(`   ❌ Projection error too large on star ${truth.name || "unnamed"}: ${screenDelta.toFixed(3)} px`);
        allPassed = false;
      }
    } else {
      console.warn(`   ⚠️ Unmatched star: ${truth.name || "unnamed"} at (${truthFx}, ${truthFy})`);
    }
  }

  const recoveryRate = (matchedCount / config.stars.length) * 100;
  console.log(`   - Ground-Truth Recovery: ${matchedCount}/${config.stars.length} (${recoveryRate.toFixed(1)}%)`);
  if (matchedCount >= config.stars.length - 1) {
    console.log(`   ✅ PASS: Overlay projection and reticle alignment verified for ${config.name}!`);
  } else {
    console.error(`   ❌ FAIL: Under-detection in ${config.name}`);
    allPassed = false;
  }
}

console.log("\n================================================================================");
if (allPassed) {
  console.log("🌟 STEP 6 MULTI-ASTERISM VISUAL VERIFICATION & OVERLAY SUITE PASSED ✅");
} else {
  console.error("❌ MULTI-ASTERISM VERIFICATION FAILED");
  process.exit(1);
}
console.log("================================================================================\n");
