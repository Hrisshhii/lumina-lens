/**
 * Verification Test for Phase 2 Step 4 (Part 3):
 * Full End-to-End Pipeline: Raw RGBA -> Preprocessing (Step 3) -> Adaptive Segmentation (Step 4)
 */

import { BENCHMARK_ASTERISMS, generateSyntheticRgba } from "./src/engines/vision/syntheticStarfield.ts";
import { preprocessFrame } from "./src/engines/vision/preprocessing.ts";
import { segmentLuminanceFrame } from "./src/engines/vision/background.ts";

console.log("================================================================================");
console.log("🌌 LUMINA LENS — Phase 2 Step 4 (Part 3): End-to-End Pipeline Verification");
console.log("================================================================================\n");

// 1. Generate Orion asterism with heavy urban light-pollution dome
const orionConfig = {
  ...BENCHMARK_ASTERISMS.orion,
  gradientGlow: true,
};

const width = 800;
const height = 600;
console.log(`1. Generating synthetic Orion field (${width} x ${height}) with urban light pollution...`);
console.log(`   - Target Stars in Asterism: ${orionConfig.stars.length}`);
orionConfig.stars.forEach((s) => {
  console.log(`     • ${s.name?.padEnd(12)} (Mag ${s.magnitude}) at normalized (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`);
});

const rawRgba = generateSyntheticRgba(orionConfig, width, height);

// 2. Execute Step 3: Preprocessing
console.log("\n2. Executing Step 3 (Photopic Luminance + Gaussian Blur + Hot Pixel Removal)...");
const tPrep0 = performance.now();
const prepResult = preprocessFrame(rawRgba, width, height, {
  enableGaussianBlur: true,
  enableHotPixelRemoval: true,
});
const elapsedPrep = performance.now() - tPrep0;

console.log(`   - Preprocessing latency: ${elapsedPrep.toFixed(2)} ms`);
console.log(`   - Preprocessed stats: min=${prepResult.buffer.min}, max=${prepResult.buffer.max}, mean=${prepResult.buffer.mean.toFixed(2)}`);

// 3. Execute Step 4: Background Estimation & Adaptive Segmentation
console.log("\n3. Executing Step 4 (Mesh Background + CFAR Adaptive Segmentation)...");
const tSeg0 = performance.now();
const segResult = segmentLuminanceFrame(prepResult.buffer, {
  tileSize: 32,
  sigmaMultiplier: 3.2,
  minNetIntensity: 6,
});
const elapsedSeg = performance.now() - tSeg0;

console.log(`   - Segmentation latency: ${elapsedSeg.toFixed(2)} ms`);
console.log(`   - Mesh tiles: ${segResult.backgroundMesh.gridCols} x ${segResult.backgroundMesh.gridRows}`);
console.log(`   - Background median: ${segResult.backgroundMesh.globalMedian.toFixed(2)}`);
console.log(`   - Background noise sigma: ${segResult.backgroundMesh.globalStdDev.toFixed(2)}`);
console.log(`   - Net Luminance: max=${segResult.netLuminance.max}, mean=${segResult.netLuminance.mean.toFixed(2)}`);
console.log(`   - Candidate star pixels: ${segResult.candidatePixelCount}`);

// 4. Verify detection of all Orion stars
console.log("\n4. Verifying Detection of Every Star in Orion Asterism:");
let allDetected = true;

orionConfig.stars.forEach((star) => {
  const cx = Math.round(star.x * width);
  const cy = Math.round(star.y * height);
  const searchRadius = 4;

  let hits = 0;
  for (let dy = -searchRadius; dy <= searchRadius; dy++) {
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        if (segResult.starMask[py * width + px] === 1) {
          hits++;
        }
      }
    }
  }

  const detected = hits > 0;
  console.log(`   - Star ${star.name?.padEnd(12)} at (${cx.toString().padStart(3)}, ${cy.toString().padStart(3)}): ${hits} candidate pixels [${detected ? "✅ FOUND" : "❌ MISSED"}]`);
  if (!detected) allDetected = false;
});

if (allDetected) {
  console.log("\n   ✅ SUCCESS: 100% of Orion asterism stars successfully isolated!");
} else {
  console.error("\n   ❌ FAILURE: Not all stars were detected.");
  process.exit(1);
}

// 5. Total Pipeline Latency Summary
const totalLatency = elapsedPrep + elapsedSeg;
console.log("\n5. Pipeline Latency Budget (800 x 600):");
console.log(`   - Step 3 (Preprocessing): ${elapsedPrep.toFixed(2)} ms`);
console.log(`   - Step 4 (Segmentation):  ${elapsedSeg.toFixed(2)} ms`);
console.log(`   - Combined Total:         ${totalLatency.toFixed(2)} ms (Budget: < 60 ms)`);

if (totalLatency < 60) {
  console.log("   ✅ PASS: Combined pipeline comfortably within 60ms real-time budget!");
}

console.log("\n================================================================================");
console.log("🌟 STEP 4 (PART 3) SUCCESSFUL — FULL PIPELINE INTEGRATION VALIDATED");
console.log("================================================================================\n");
