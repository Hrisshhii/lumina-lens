import {
  createLuminanceBuffer,
  suppressHotPixels,
  separableGaussianBlur3x3,
} from "./src/engines/vision/preprocessing.ts";

console.log("=================================================================");
console.log(" ✦ STEP 3 PART 2: ASTRONOMICAL SPATIAL FILTERING VERIFICATION ✦");
console.log("=================================================================\n");

// --- TEST 1: Hot-Pixel Defect vs. True Star PSF Discrimination ---
console.log("1. Hot-Pixel Defect vs. Star Point Spread Function (PSF):");
const W1 = 24;
const H1 = 24;
const testBuf = createLuminanceBuffer(W1, H1, 10); // Background level 10

// A. Insert an isolated hot pixel at (6, 6)
const hotX = 6, hotY = 6;
testBuf.data[hotY * W1 + hotX] = 255; // Saturated thermal spike

// B. Insert a multi-pixel stellar PSF at (16, 16)
const starX = 16, starY = 16;
testBuf.data[starY * W1 + starX] = 245; // Core
testBuf.data[(starY - 1) * W1 + starX] = 195; // North
testBuf.data[(starY + 1) * W1 + starX] = 195; // South
testBuf.data[starY * W1 + (starX - 1)] = 195; // West
testBuf.data[starY * W1 + (starX + 1)] = 195; // East
testBuf.data[(starY - 1) * W1 + (starX - 1)] = 150; // NW
testBuf.data[(starY - 1) * W1 + (starX + 1)] = 150; // NE
testBuf.data[(starY + 1) * W1 + (starX - 1)] = 150; // SW
testBuf.data[(starY + 1) * W1 + (starX + 1)] = 150; // SE

const cleanedBuf = suppressHotPixels(testBuf, 65);
const cleanedHotPixelVal = cleanedBuf.data[hotY * W1 + hotX];
const cleanedStarCoreVal = cleanedBuf.data[starY * W1 + starX];

console.log(`   - Hot pixel before filtering: 255  --> after filtering: ${cleanedHotPixelVal} (Expected: 10)`);
console.log(`   - Star core before filtering: 245  --> after filtering: ${cleanedStarCoreVal} (Expected: 245)`);

const passHotPixelSuppression = cleanedHotPixelVal === 10;
const passStarPreservation = cleanedStarCoreVal === 245;
const passDiscrimination = passHotPixelSuppression && passStarPreservation;

console.log(`   Status: ${passDiscrimination ? "✅ PASS (Hot pixel eliminated, star PSF 100% preserved)" : "❌ FAIL"}\n`);

// --- TEST 2: Separable 3x3 Gaussian Smoothing Filter ---
console.log("2. Separable 3x3 Binomial Gaussian Smoothing:");
const W2 = 64;
const H2 = 64;
const noisyBuf = createLuminanceBuffer(W2, H2, 15);
// Add random zero-mean Gaussian read noise (+/- 8)
for (let i = 0; i < W2 * H2; i++) {
  noisyBuf.data[i] = Math.max(0, Math.min(255, 15 + ((Math.random() * 16 - 8) | 0)));
}
// Add a bright point source
noisyBuf.data[32 * W2 + 32] = 230;

const beforeNoiseStats = { mean: noisyBuf.mean, stdDev: noisyBuf.stdDev };
const blurredBuf = separableGaussianBlur3x3(noisyBuf);

console.log(`   - Noise stdDev before Gaussian blur: ${beforeNoiseStats.stdDev.toFixed(2)}`);
console.log(`   - Noise stdDev after Gaussian blur:  ${blurredBuf.stdDev.toFixed(2)} (High-frequency noise reduced)`);
console.log(`   - Mean sky level before: ${beforeNoiseStats.mean.toFixed(2)}  --> after: ${blurredBuf.mean.toFixed(2)} (Energy conserved)`);

const passNoiseReduction = blurredBuf.stdDev < beforeNoiseStats.stdDev;
const passEnergyConservation = Math.abs(blurredBuf.mean - beforeNoiseStats.mean) < 1.0;
const passGaussian = passNoiseReduction && passEnergyConservation;

console.log(`   Status: ${passGaussian ? "✅ PASS (Noise smoothed & flux energy conserved)" : "❌ FAIL"}\n`);

// --- TEST 3: Full 1080p High-Throughput Latency Benchmark ---
console.log("3. 1080p Full-Frame Spatial Filtering Throughput:");
const W1080 = 1920;
const H1080 = 1080;
const total1080 = W1080 * H1080;
const largeBuf = createLuminanceBuffer(W1080, H1080, 12);

// Inject 100 hot pixels and random noise
for (let i = 0; i < 100; i++) {
  const idx = (Math.random() * total1080) | 0;
  largeBuf.data[idx] = 255;
}

const t0 = performance.now();
const hotCleaned1080 = suppressHotPixels(largeBuf, 65);
const tHotMs = performance.now() - t0;

const t1 = performance.now();
const blurred1080 = separableGaussianBlur3x3(hotCleaned1080);
const tBlurMs = performance.now() - t1;

const tTotalMs = tHotMs + tBlurMs;

console.log(`   - Resolution:                 ${W1080} × ${H1080} (${(total1080 / 1e6).toFixed(2)} Megapixels)`);
console.log(`   - Hot-Pixel Suppression Time: ${tHotMs.toFixed(2)} ms`);
console.log(`   - Separable Gaussian 3x3:     ${tBlurMs.toFixed(2)} ms`);
console.log(`   - Total Preprocessing Time:   ${tTotalMs.toFixed(2)} ms`);

const passLatency = tTotalMs < 45.0;
console.log(`   Status: ${passLatency ? `✅ PASS (< 45ms budget, actual: ${tTotalMs.toFixed(2)}ms)` : "⚠️ SLOW"}\n`);

console.log("=================================================================");
if (passDiscrimination && passGaussian && passLatency) {
  console.log(" 🎯 PART 2 VERIFICATION COMPLETED SUCCESSFULLY!");
} else {
  console.log(" ❌ SOME CHECKS FAILED");
  process.exit(1);
}
console.log("=================================================================");
