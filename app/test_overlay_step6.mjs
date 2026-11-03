/**
 * Unit Test for StarOverlay Projection & Reticle Math (Step 6)
 */

import { mapFrameToScreen, getReticleRadius } from "./src/components/StarOverlay.tsx";

console.log("================================================================================");
console.log("🌌 LUMINA LENS — Phase 2 Step 6: StarOverlay Coordinate Projection Verification");
console.log("================================================================================\n");

// Test 1: Uniform Scaling & Offset Centering
console.log("1. Testing Frame-to-Screen Aspect Ratio Mapping (mapFrameToScreen)...");
// Case A: 800x600 frame mapped to 400x300 viewport (perfect 2:1 fit, no offset)
const rA = mapFrameToScreen(400, 300, 800, 600, 400, 300);
console.log(`   - Case A (800x600 -> 400x300): (${rA.x}, ${rA.y}), scale=${rA.scale}`);
if (rA.x === 200 && rA.y === 150 && rA.scale === 0.5) {
  console.log("   ✅ PASS: Center point mapped exactly with 0.5 scale factor!");
} else {
  console.error("   ❌ FAIL: Case A unexpected result", rA);
  process.exit(1);
}

// Case B: 1920x1080 (16:9) frame mapped to 400x800 tall mobile viewport (pillarboxed)
const rB = mapFrameToScreen(960, 540, 1920, 1080, 400, 800);
console.log(`   - Case B (1920x1080 -> 400x800 tall screen): (${rB.x.toFixed(1)}, ${rB.y.toFixed(1)}), scale=${rB.scale.toFixed(3)}`);
// scale should be 400 / 1920 = 0.20833
// vertical offset = (800 - 1080 * 0.20833) / 2 = (800 - 225) / 2 = 287.5
const expectedYB = 540 * (400 / 1920) + (800 - 1080 * (400 / 1920)) / 2;
if (Math.abs(rB.x - 200) < 0.1 && Math.abs(rB.y - expectedYB) < 0.1) {
  console.log("   ✅ PASS: Pillarboxing & vertical centering offset accurate to < 0.1px!");
} else {
  console.error("   ❌ FAIL: Case B unexpected coordinates", rB);
  process.exit(1);
}

// Test 2: Reticle Sizing Scaling by Flux
console.log("\n2. Testing Responsive Reticle Sizing (getReticleRadius)...");
const rLow = getReticleRadius(50);
const rMid = getReticleRadius(2000);
const rHigh = getReticleRadius(15000);
console.log(`   - Low Flux (50):    Radius = ${rLow} px (Min clamp: 10)`);
console.log(`   - Mid Flux (2000):  Radius = ${rMid} px`);
console.log(`   - High Flux (15000): Radius = ${rHigh} px (Max clamp: 24)`);

if (rLow >= 10 && rMid > rLow && rHigh >= rMid && rHigh <= 24) {
  console.log("   ✅ PASS: Reticle radius scales monotonically with flux and respects bounds!");
} else {
  console.error("   ❌ FAIL: Reticle radius bounds failed.");
  process.exit(1);
}

console.log("\n================================================================================");
console.log("🌟 STEP 6 STAR OVERLAY UNIT TESTS PASSED");
console.log("================================================================================\n");
