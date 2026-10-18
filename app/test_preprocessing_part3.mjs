import {
  BENCHMARK_ASTERISMS,
  generateSyntheticRgba,
} from "./src/engines/vision/syntheticStarfield.ts";
import { preprocessFrame } from "./src/engines/vision/preprocessing.ts";

console.log("=================================================================");
console.log(" ✦ STEP 3 PART 3: END-TO-END PREPROCESSING PIPELINE TEST ✦");
console.log("=================================================================\n");

// 1. Test Orion frame preprocessing
console.log("1. End-to-End Synthetic Orion Frame Preprocessing:");
const orionConfig = BENCHMARK_ASTERISMS.orion;
const W = 960;
const H = 540;
const rgbaOrion = generateSyntheticRgba(orionConfig, W, H);

console.log(`   - Input Buffer:      ${orionConfig.name} (${W}x${H}, ${(rgbaOrion.byteLength / (1024 * 1024)).toFixed(2)} MB)`);

const result = preprocessFrame(rgbaOrion, W, H, {
  enableHotPixelRemoval: true,
  enableGaussianBlur: true,
});

console.log(`   - Output Dimensions: ${result.buffer.width} × ${result.buffer.height}`);
console.log(`   - Stages Completed:  ${result.stagesCompleted.join(" -> ")}`);
console.log(`   - Execution Time:    ${result.executionTimeMs.toFixed(2)} ms`);
console.log(`   - Min Intensity:     ${result.buffer.min}`);
console.log(`   - Max Intensity:     ${result.buffer.max} (Betelgeuse / Rigel peak)`);
console.log(`   - Mean Sky Level:    ${result.buffer.mean.toFixed(2)}`);
console.log(`   - Noise StdDev:      ${result.buffer.stdDev.toFixed(2)}`);

const passStages = result.stagesCompleted.length === 3;
const passMetrics = result.buffer.max > 200 && result.buffer.min >= 0;
const passSpeed = result.executionTimeMs < 35;

console.log(`   Status: ${passStages && passMetrics && passSpeed ? "✅ PASS" : "❌ FAIL"}\n`);

// 2. Test Multi-Asterism Verification (Summer Triangle & Cassiopeia)
console.log("2. Multi-Asterism Verification (Summer Triangle & Cassiopeia):");
const summerRgba = generateSyntheticRgba(BENCHMARK_ASTERISMS.summer_triangle, W, H);
const casRgba = generateSyntheticRgba(BENCHMARK_ASTERISMS.cassiopeia, W, H);

const summerRes = preprocessFrame(summerRgba, W, H);
const casRes = preprocessFrame(casRgba, W, H);

console.log(`   - Summer Triangle: ${summerRes.buffer.width}x${summerRes.buffer.height}, peak: ${summerRes.buffer.max}, time: ${summerRes.executionTimeMs.toFixed(2)}ms`);
console.log(`   - Cassiopeia:      ${casRes.buffer.width}x${casRes.buffer.height}, peak: ${casRes.buffer.max}, time: ${casRes.executionTimeMs.toFixed(2)}ms`);

const passMulti = summerRes.buffer.max > 150 && casRes.buffer.max > 150;
console.log(`   Status: ${passMulti ? "✅ PASS" : "❌ FAIL"}\n`);

console.log("=================================================================");
if (passStages && passMetrics && passSpeed && passMulti) {
  console.log(" 🎯 PART 3 END-TO-END PIPELINE VERIFICATION SUCCESSFUL!");
} else {
  console.log(" ❌ CHECKS FAILED");
  process.exit(1);
}
console.log("=================================================================");
