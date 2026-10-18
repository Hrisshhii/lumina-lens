import { createSyntheticFrame } from "./src/engines/vision/syntheticStarfield.ts";
import {
  preprocessFrame,
  preprocessCapturedFrame,
} from "./src/engines/vision/preprocessing.ts";

console.log("=================================================================");
console.log(" ✦ STEP 3 PART 3: END-TO-END PREPROCESSING PIPELINE TEST ✦");
console.log("=================================================================\n");

// 1. Test createSyntheticFrame and preprocessCapturedFrame
console.log("1. End-to-End Synthetic Orion Frame Preprocessing:");
const orionFrame = createSyntheticFrame("orion");
console.log(`   - Input Frame:       ${orionFrame.metadata?.targetConstellation} (${orionFrame.width}x${orionFrame.height})`);
console.log(`   - Source Type:       ${orionFrame.source}`);

const result = preprocessCapturedFrame(orionFrame, {
  enableHotPixelRemoval: true,
  enableGaussianBlur: true,
});

console.log(`   - Output Dimensions: ${result.buffer.width} × ${result.buffer.height}`);
console.log(`   - Stages Completed:  ${result.stagesCompleted.join(" -> ")}`);
console.log(`   - Execution Time:    ${result.executionTimeMs.toFixed(2)} ms`);
console.log(`   - Min Intensity:     ${result.buffer.min}`);
console.log(`   - Max Intensity:     ${result.buffer.max} (Brightest star peak)`);
console.log(`   - Mean Sky Level:    ${result.buffer.mean.toFixed(2)}`);
console.log(`   - Noise StdDev:      ${result.buffer.stdDev.toFixed(2)}`);

const passStages = result.stagesCompleted.length === 3;
const passMetrics = result.buffer.max > 200 && result.buffer.min >= 0;
const passSpeed = result.executionTimeMs < 35;

console.log(`   Status: ${passStages && passMetrics && passSpeed ? "✅ PASS" : "❌ FAIL"}\n`);

// 2. Test Cassiopeia and Summer Triangle
console.log("2. Multi-Asterism Verification (Summer Triangle & Cassiopeia):");
const summerFrame = createSyntheticFrame("summer_triangle");
const cassiopeiaFrame = createSyntheticFrame("cassiopeia");

const summerRes = preprocessCapturedFrame(summerFrame);
const casRes = preprocessCapturedFrame(cassiopeiaFrame);

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
