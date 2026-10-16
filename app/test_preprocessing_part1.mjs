import { rgbaToLuminance } from "./src/engines/vision/preprocessing.ts";

console.log("=================================================================");
console.log(" ✦ STEP 3 PART 1: LUMINANCE CONVERSION & STATS VERIFICATION ✦");
console.log("=================================================================\n");

// Test 1: Color Component Weights
const testPixels = new Uint8ClampedArray([
  255, 255, 255, 255, // Pure White
  0, 0, 0, 255,       // Pure Black
  255, 0, 0, 255,     // Pure Red
  0, 255, 0, 255,     // Pure Green
  0, 0, 255, 255,     // Pure Blue
]);

const buf = rgbaToLuminance(testPixels, 5, 1);
console.log("1. Color Component Weighting (5 test pixels):");
console.log(`   - White (255,255,255): Y = ${buf.data[0]} (Expected ~255)`);
console.log(`   - Black (0,0,0):       Y = ${buf.data[1]} (Expected 0)`);
console.log(`   - Red   (255,0,0):     Y = ${buf.data[2]} (Expected ~53, weight ~21%)`);
console.log(`   - Green (0,255,0):     Y = ${buf.data[3]} (Expected ~182, weight ~71.5%)`);
console.log(`   - Blue  (0,0,255):     Y = ${buf.data[4]} (Expected ~18, weight ~7.5%)`);

const passWeights =
  buf.data[0] >= 253 &&
  buf.data[1] === 0 &&
  buf.data[2] === 53 &&
  buf.data[3] === 182 &&
  buf.data[4] === 18;

console.log(`   Status: ${passWeights ? "✅ PASS" : "❌ FAIL"}\n`);

// Test 2: 1080p Full High-Definition Throughput Benchmark
const W = 1920;
const H = 1080;
const totalPixels = W * H;
const rgba1080p = new Uint8ClampedArray(totalPixels * 4);

// Fill with simulated noisy dark sky (background ~15, faint stars ~180-255)
for (let i = 0; i < totalPixels * 4; i += 4) {
  const bg = (Math.random() * 20) | 0;
  rgba1080p[i] = bg;
  rgba1080p[i + 1] = bg;
  rgba1080p[i + 2] = bg + 5; // slight blue sky bias
  rgba1080p[i + 3] = 255;
}

// Add 50 simulated bright star pixels
for (let s = 0; s < 50; s++) {
  const target = ((Math.random() * totalPixels) | 0) * 4;
  rgba1080p[target] = 250;
  rgba1080p[target + 1] = 250;
  rgba1080p[target + 2] = 255;
}

const startTime = performance.now();
const result1080p = rgbaToLuminance(rgba1080p, W, H);
const elapsedMs = performance.now() - startTime;

console.log("2. 1080p Full-Frame Throughput & Latency Benchmark:");
console.log(`   - Resolution:       ${W} × ${H} (${(totalPixels / 1e6).toFixed(2)} Megapixels)`);
console.log(`   - Raw RGBA Size:    ${(rgba1080p.byteLength / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   - Luminance Size:   ${(result1080p.data.byteLength / (1024 * 1024)).toFixed(2)} MB (3x memory reduction!)`);
console.log(`   - Processing Time:  ${elapsedMs.toFixed(2)} ms`);
console.log(`   - Min Luminance:    ${result1080p.min}`);
console.log(`   - Max Luminance:    ${result1080p.max}`);
console.log(`   - Mean Luminance:   ${result1080p.mean.toFixed(2)}`);
console.log(`   - Std Deviation:    ${result1080p.stdDev.toFixed(2)}`);

const passLatency = elapsedMs < 50.0;
console.log(`   Status: ${passLatency ? `✅ PASS (< 50ms budget, actual: ${elapsedMs.toFixed(2)}ms)` : "⚠️ SLOW"}\n`);

console.log("=================================================================");
if (passWeights && passLatency) {
  console.log(" 🎯 PART 1 VERIFICATION COMPLETED SUCCESSFULLY!");
} else {
  console.log(" ❌ SOME CHECKS FAILED");
  process.exit(1);
}
console.log("=================================================================");
