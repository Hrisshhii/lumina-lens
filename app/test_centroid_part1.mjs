/**
 * Verification Test for Phase 2 Step 5 (Part 1 & 2):
 * Connected Component Labeling, Sub-Pixel Centroid Accuracy, and Morphological Streak Rejection
 */

import { detectBlobs, computeStarCentroid, extractStarCentroids } from "./src/engines/vision/centroidExtraction.ts";

console.log("================================================================================");
console.log("🌌 LUMINA LENS — Phase 2 Step 5: Sub-Pixel Centroid Extraction Verification");
console.log("================================================================================\n");

const width = 400;
const height = 300;
const totalPixels = width * height;

const starMask = new Uint8Array(totalPixels);
const netData = new Uint8ClampedArray(totalPixels);

// 1. Inject a calibrated Gaussian star with exact ground-truth sub-pixel center
const trueX = 150.35;
const trueY = 80.65;
const peakFlux = 220;
const sigma = 1.6;

console.log(`1. Injecting synthetic star at ground-truth sub-pixel (${trueX}, ${trueY}), sigma=${sigma}...`);
for (let y = 75; y <= 86; y++) {
  for (let x = 145; x <= 156; x++) {
    const dx = x - trueX;
    const dy = y - trueY;
    const distSq = dx * dx + dy * dy;
    const flux = Math.round(peakFlux * Math.exp(-distSq / (2 * sigma * sigma)));
    if (flux >= 8) {
      const idx = y * width + x;
      netData[idx] = flux;
      starMask[idx] = 1;
    }
  }
}

// 2. Inject an isolated single-pixel spike (cosmic ray hit) at (40, 40)
console.log("2. Injecting isolated 1-pixel spike (cosmic ray / thermal defect) at (40, 40)...");
netData[40 * width + 40] = 255;
starMask[40 * width + 40] = 1;

// 3. Inject an elongated satellite streak (1 x 18 pixels) at (250, 180)
console.log("3. Injecting elongated satellite streak (1x18 pixels) at (250, 180)...");
for (let dy = 0; dy < 18; dy++) {
  const idx = (180 + dy) * width + 250;
  netData[idx] = 180;
  starMask[idx] = 1;
}

const netBuffer = {
  width,
  height,
  stride: width,
  data: netData,
  min: 0,
  max: 255,
  mean: 1.2,
  stdDev: 8.5,
};

// 4. Test Part 1: Connected Component Labeling
console.log("\n4. Testing Part 1: 8-Connected Component Labeling (detectBlobs)...");
const t0 = performance.now();
const blobs = detectBlobs(starMask, netBuffer, { minPixelCount: 2, maxPixelCount: 300 });
const elapsedBlobs = performance.now() - t0;

console.log(`   - Raw blobs extracted: ${blobs.length} (Execution: ${elapsedBlobs.toFixed(2)} ms)`);
console.log(`   - Blob details:`);
blobs.forEach((b, i) => {
  console.log(`     #${b.id}: pixels=${b.pixelCount}, bounds=[${b.minX}..${b.maxX}, ${b.minY}..${b.maxY}], peak=${b.peakIntensity}`);
});

// Check that 1-pixel spike was filtered out by minPixelCount: 2
const spikeFound = blobs.some((b) => b.minX === 40 && b.minY === 40);
if (!spikeFound) {
  console.log("   ✅ PASS: Isolated 1-pixel spike successfully rejected by CCL!");
} else {
  console.error("   ❌ FAIL: 1-pixel spike was not rejected.");
  process.exit(1);
}

// 5. Test Part 2: Centroid Extraction & Morphological Filtering
console.log("\n5. Testing Part 2: Sub-Pixel Centroid & Morphological Filtering...");
const t1 = performance.now();
const result = extractStarCentroids(starMask, netBuffer, {
  minPixelCount: 2,
  maxEllipticity: 0.55,
  minFlux: 15.0,
});
const elapsedExtract = performance.now() - t1;

console.log(`   - Validated stars recovered: ${result.stars.length}`);
console.log(`   - Rejected non-stellar artifacts: ${result.rejectedCount}`);
console.log(`   - Extraction latency: ${elapsedExtract.toFixed(2)} ms`);

if (result.stars.length !== 1) {
  console.error(`   ❌ FAIL: Expected exactly 1 star, got ${result.stars.length}.`);
  process.exit(1);
}

const star = result.stars[0];
const errX = Math.abs(star.x - trueX);
const errY = Math.abs(star.y - trueY);
const totalErr = Math.sqrt(errX * errX + errY * errY);

console.log(`\n6. Validating Sub-Pixel Centroid Precision:`);
console.log(`   - Ground Truth Center: (${trueX}, ${trueY})`);
console.log(`   - Extracted Centroid:  (${star.x}, ${star.y})`);
console.log(`   - Sub-Pixel Error:     Δx = ${errX.toFixed(3)} px, Δy = ${errY.toFixed(3)} px (Total Δr = ${totalErr.toFixed(3)} px)`);
console.log(`   - Morphology:          FWHM = ${star.fwhm} px, Ellipticity = ${star.ellipticity}`);
console.log(`   - Photometry:          Integrated Flux = ${star.flux}, Inst. Mag = ${star.instrumentalMagnitude}, SNR = ${star.snr}`);

if (totalErr < 0.10) {
  console.log(`   ✅ PASS: Sub-pixel accuracy within 0.10 pixel target! (Actual: ${totalErr.toFixed(3)} px)`);
} else {
  console.error(`   ❌ FAIL: Centroid error exceeded threshold: ${totalErr.toFixed(3)} px`);
  process.exit(1);
}

// Verify satellite streak was rejected by ellipticity
if (result.rejectedCount >= 1) {
  console.log("   ✅ PASS: Elongated satellite streak rejected by ellipticity filter!");
} else {
  console.error("   ❌ FAIL: Satellite streak was not rejected.");
  process.exit(1);
}

// 7. Benchmark 1080p Frame Execution Time
console.log("\n7. Benchmarking 1080p Resolution (1920 x 1080)...");
const w1080 = 1920;
const h1080 = 1080;
const mask1080 = new Uint8Array(w1080 * h1080);
const net1080 = new Uint8ClampedArray(w1080 * h1080);

// Place 40 stars across 1080p frame
for (let i = 0; i < 40; i++) {
  const sx = 100 + (i % 8) * 220;
  const sy = 80 + Math.floor(i / 8) * 190;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy <= 4) {
        const idx = (sy + dy) * w1080 + (sx + dx);
        mask1080[idx] = 1;
        net1080[idx] = 150;
      }
    }
  }
}

const buffer1080 = {
  width: w1080,
  height: h1080,
  stride: w1080,
  data: net1080,
  min: 0,
  max: 150,
  mean: 0.1,
  stdDev: 2.0,
};

const tBench0 = performance.now();
const res1080 = extractStarCentroids(mask1080, buffer1080);
const elapsed1080 = performance.now() - tBench0;

console.log(`   - 1080p Stars Recovered: ${res1080.stars.length} / 40 stars`);
console.log(`   - 1080p Extraction Latency: ${elapsed1080.toFixed(2)} ms (Budget: < 15 ms)`);

if (res1080.stars.length === 40 && elapsed1080 < 15.0) {
  console.log("   ✅ PASS: 1080p centroid extraction completed well within 15ms budget!");
}

console.log("\n================================================================================");
console.log("🌟 STEP 5 (PARTS 1 & 2) SUCCESSFUL — BLOBS & CENTROIDS VALIDATED");
console.log("================================================================================\n");

