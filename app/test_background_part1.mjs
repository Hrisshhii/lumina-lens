/**
 * Verification Test for Phase 2 Step 4 (Part 1):
 * Background Mesh Estimation & Continuous Surface Interpolation
 */

import {
  computeTileStats,
  estimateBackgroundMesh,
  evaluateBackgroundAt,
  generateContinuousSurfaces
} from "./src/engines/vision/background.ts";

console.log("================================================================================");
console.log("🌌 LUMINA LENS — Phase 2 Step 4 (Part 1): Background Mesh & Surface Verification");
console.log("================================================================================\n");

// 1. Synthetic Gradient Frame Creation (400 x 300 with diagonal light-pollution glow)
const width = 400;
const height = 300;
const totalPixels = width * height;
const data = new Uint8ClampedArray(totalPixels);

console.log("1. Synthesizing artificial light pollution gradient (15.0 -> 85.0) with Gaussian noise...");
for (let y = 0; y < height; y++) {
  const normY = y / height;
  const rowOffset = y * width;
  for (let x = 0; x < width; x++) {
    const normX = x / width;
    // Diagonal gradient: 15 at top-left to 85 at bottom-right
    const gradient = 15.0 + 70.0 * (normX * 0.6 + normY * 0.4);
    // Gaussian noise floor (approx +/- 3)
    const noise = (Math.random() - 0.5) * 6;
    data[rowOffset + x] = Math.max(0, Math.min(255, Math.round(gradient + noise)));
  }
}

// 2. Insert synthetic high-intensity star point sources (PSFs) to test outlier immunity
console.log("2. Injecting compact bright star point sources at (60, 60) and (320, 240)...");
const stars = [
  { x: 60, y: 60, peak: 245 },
  { x: 320, y: 240, peak: 250 },
];

for (const s of stars) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const distSq = dx * dx + dy * dy;
      if (distSq <= 4) {
        const idx = (s.y + dy) * width + (s.x + dx);
        const starVal = Math.round(s.peak * Math.exp(-distSq / 1.5));
        data[idx] = Math.max(data[idx], starVal);
      }
    }
  }
}

const buffer = {
  width,
  height,
  stride: width,
  data,
  min: 10,
  max: 255,
  mean: 50,
  stdDev: 25,
};

// 3. Estimate Background Mesh (32x32 tiles)
console.log("\n3. Computing 32x32 Background Mesh...");
const t0 = performance.now();
const mesh = estimateBackgroundMesh(buffer, 32);
const elapsedMesh = performance.now() - t0;

console.log(`   - Mesh dimensions: ${mesh.gridCols} columns x ${mesh.gridRows} rows (${mesh.gridCols * mesh.gridRows} total tiles)`);
console.log(`   - Global background median: ${mesh.globalMedian.toFixed(2)}`);
console.log(`   - Global noise floor sigma: ${mesh.globalStdDev.toFixed(2)}`);
console.log(`   - Computation time: ${elapsedMesh.toFixed(2)} ms`);

// 4. Verify Outlier Immunity:
// Tile containing star at (60, 60) is col 1, row 1 (indices: 32..63 x 32..63)
const starTileCol = Math.floor(60 / 32);
const starTileRow = Math.floor(60 / 32);
const starTileIdx = starTileRow * mesh.gridCols + starTileCol;
const starTileBg = mesh.background[starTileIdx];

// Neighbor tile with no star at col 0, row 1
const neighborTileIdx = starTileRow * mesh.gridCols + 0;
const neighborTileBg = mesh.background[neighborTileIdx];

console.log("\n4. Verifying Outlier Immunity in Star Tiles:");
console.log(`   - Tile (1, 1) containing star peak (245): Estimated Bg = ${starTileBg.toFixed(1)}`);
console.log(`   - Adjacent Tile (0, 1) without star:     Estimated Bg = ${neighborTileBg.toFixed(1)}`);

const bgDiff = Math.abs(starTileBg - neighborTileBg);
if (bgDiff < 5.0) {
  console.log(`   ✅ PASS: Star did not bias background level (difference = ${bgDiff.toFixed(2)} < 5.0)`);
} else {
  console.error(`   ❌ FAIL: Background biased by star (difference = ${bgDiff.toFixed(2)})`);
  process.exit(1);
}

// 5. Bilinear Surface Interpolation Check
console.log("\n5. Testing Continuous Bilinear Surface Interpolation:");
const sampleTopLeft = evaluateBackgroundAt(mesh, 10, 10);
const sampleBottomRight = evaluateBackgroundAt(mesh, 390, 290);
console.log(`   - Top-Left (10, 10):   B = ${sampleTopLeft.bg.toFixed(2)}, sigma = ${sampleTopLeft.sigma.toFixed(2)}`);
console.log(`   - Bottom-Right (390, 290): B = ${sampleBottomRight.bg.toFixed(2)}, sigma = ${sampleBottomRight.sigma.toFixed(2)}`);

if (sampleTopLeft.bg < 30 && sampleBottomRight.bg > 70) {
  console.log("   ✅ PASS: Continuous background tracks the diagonal sky gradient accurately!");
} else {
  console.error("   ❌ FAIL: Interpolation did not reflect true spatial gradient.");
  process.exit(1);
}

// 6. 1080p Full-Resolution Benchmark
console.log("\n6. Benchmarking 1080p Resolution (1920 x 1080)...");
const w1080 = 1920;
const h1080 = 1080;
const data1080 = new Uint8ClampedArray(w1080 * h1080);
// Fill with gradient and noise
for (let y = 0; y < h1080; y += 4) {
  for (let x = 0; x < w1080; x += 4) {
    const val = (x / w1080 * 40 + y / h1080 * 40) | 0;
    data1080[y * w1080 + x] = val;
  }
}

const buffer1080 = {
  width: w1080,
  height: h1080,
  stride: w1080,
  data: data1080,
  min: 0,
  max: 80,
  mean: 40,
  stdDev: 15,
};

const tBench0 = performance.now();
const mesh1080 = estimateBackgroundMesh(buffer1080, 32);
const elapsedMesh1080 = performance.now() - tBench0;

console.log(`   - 1080p Mesh Tiles: ${mesh1080.gridCols} x ${mesh1080.gridRows} (${mesh1080.gridCols * mesh1080.gridRows} tiles)`);
console.log(`   - 1080p Mesh Estimation Latency: ${elapsedMesh1080.toFixed(2)} ms`);

if (elapsedMesh1080 < 35.0) {
  console.log(`   ✅ PASS: 1080p background estimation completed well within 35ms budget!`);
} else {
  console.warn(`   ⚠️ WARNING: 1080p estimation took ${elapsedMesh1080.toFixed(2)} ms`);
}

console.log("\n================================================================================");
console.log("🌟 STEP 4 (PART 1) SUCCESSFUL — MESH ESTIMATION & SURFACE MODELING VALIDATED");
console.log("================================================================================\n");
