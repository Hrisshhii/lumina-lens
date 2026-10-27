/**
 * Verification Test for Phase 2 Step 5 (Part 3):
 * Full End-to-End Vision Pipeline:
 * Raw RGBA -> Step 3 Preprocess -> Step 4 Segmentation -> Step 5 Centroid Extraction
 */

import { BENCHMARK_ASTERISMS, generateSyntheticRgba } from "./src/engines/vision/syntheticStarfield.ts";
import { preprocessFrame } from "./src/engines/vision/preprocessing.ts";
import { segmentLuminanceFrame } from "./src/engines/vision/background.ts";
import { extractStarCentroids } from "./src/engines/vision/centroidExtraction.ts";

console.log("================================================================================");
console.log("🌌 LUMINA LENS — Phase 2 Step 5 (Part 3): Full End-to-End Pipeline Verification");
console.log("================================================================================\n");

// 1. Generate Orion asterism with heavy urban light-pollution dome
const orionConfig = {
  ...BENCHMARK_ASTERISMS.orion,
  gradientGlow: true,
};

const width = 800;
const height = 600;
console.log(`1. Generating synthetic Orion field (${width} x ${height}) under urban skyglow...`);
const rawRgba = generateSyntheticRgba(orionConfig, width, height);

// 2. Execute Step 3: Preprocessing
const t0 = performance.now();
const prepResult = preprocessFrame(rawRgba, width, height, {
  enableGaussianBlur: true,
  enableHotPixelRemoval: true,
});
const elapsedPrep = performance.now() - t0;
console.log(`2. Step 3 (Preprocessing) completed in ${elapsedPrep.toFixed(2)} ms`);

// 3. Execute Step 4: Background Estimation & Adaptive CFAR Thresholding
const t1 = performance.now();
const segResult = segmentLuminanceFrame(prepResult.buffer, {
  tileSize: 32,
  sigmaMultiplier: 3.2,
  minNetIntensity: 5,
});
const elapsedSeg = performance.now() - t1;
console.log(`3. Step 4 (Segmentation) completed in ${elapsedSeg.toFixed(2)} ms (${segResult.candidatePixelCount} candidate pixels)`);

// 4. Execute Step 5: Star Centroid Extraction
const t2 = performance.now();
const centroidResult = extractStarCentroids(
  segResult.starMask,
  segResult.netLuminance,
  {
    minPixelCount: 2,
    maxEllipticity: 0.55,
    minFlux: 12.0,
  },
  segResult.backgroundMesh.globalStdDev
);
const elapsedCentroids = performance.now() - t2;
console.log(`4. Step 5 (Centroid Extraction) completed in ${elapsedCentroids.toFixed(2)} ms`);
console.log(`   - Detected stars count: ${centroidResult.stars.length}`);
console.log(`   - Raw blobs: ${centroidResult.rawBlobCount}, Rejected: ${centroidResult.rejectedCount}`);

// 5. Verify ground-truth positions for all 12 Orion stars
console.log("\n5. Verifying Recovered Sub-Pixel Centroids Against Astrometric Ground Truth:");
let maxError = 0;
let allMatched = true;

orionConfig.stars.forEach((groundTruth, idx) => {
  const trueX = groundTruth.x * width;
  const trueY = groundTruth.y * height;
  const name = groundTruth.name || `Field Star #${idx + 1}`;

  // Find closest extracted centroid
  let bestDist = Infinity;
  let bestStar = null;

  for (const s of centroidResult.stars) {
    const d = Math.hypot(s.x - trueX, s.y - trueY);
    if (d < bestDist) {
      bestDist = d;
      bestStar = s;
    }
  }

  const isMatch = bestDist <= 1.0;
  if (!isMatch) allMatched = false;
  if (bestDist > maxError && isMatch) maxError = bestDist;

  console.log(
    `   • ${name.padEnd(20)} Truth: (${trueX.toFixed(1)}, ${trueY.toFixed(1)}) -> ` +
    `Extracted: (${bestStar?.x.toFixed(2)}, ${bestStar?.y.toFixed(2)}) ` +
    `Δr = ${bestDist.toFixed(3)} px [FWHM=${bestStar?.fwhm}px, Flux=${bestStar?.flux}] ` +
    `${isMatch ? "✅ MATCH" : "❌ MISSED"}`
  );
});

console.log(`\n   - Maximum Sub-Pixel Centroid Error: ${maxError.toFixed(3)} px (Target: < 0.20 px)`);

if (allMatched && maxError < 0.20) {
  console.log("   ✅ SUCCESS: 100% of Orion stars resolved with high-precision sub-pixel accuracy!");
} else {
  console.error("   ❌ FAILURE: Centroid extraction did not meet astrometric criteria.");
  process.exit(1);
}

// 6. Full Pipeline Latency Budget
const totalLatency = elapsedPrep + elapsedSeg + elapsedCentroids;
console.log("\n6. Full Pipeline Latency Budget (800 x 600):");
console.log(`   - Step 3 (Preprocessing):        ${elapsedPrep.toFixed(2)} ms`);
console.log(`   - Step 4 (Adaptive Background):  ${elapsedSeg.toFixed(2)} ms`);
console.log(`   - Step 5 (Centroid Extraction):  ${elapsedCentroids.toFixed(2)} ms`);
console.log(`   - Total End-to-End Time:         ${totalLatency.toFixed(2)} ms (Budget: < 75 ms)`);

if (totalLatency < 75.0) {
  console.log("   ✅ PASS: Complete Vision pipeline runs comfortably in real-time!");
}

console.log("\n================================================================================");
console.log("🌟 STEP 5 (PART 3) SUCCESSFUL — END-TO-END VISION PIPELINE VERIFIED");
console.log("================================================================================\n");
