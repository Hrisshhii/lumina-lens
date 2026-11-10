/**
 * Lumina Lens — Triangle Invariants Engine (Phase 3 Step 1)
 *
 * Computes scale-invariant, rotation-invariant geometric representations
 * for star centroid triplets to facilitate Lost-in-Space plate solving.
 */

import { StarPoint, TriangleDescriptor } from "./types";

/**
 * Calculates Euclidean 2D distance between two points.
 */
export function euclideanDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

/**
 * Calculates the 2D signed cross product (winding orientation) of points A -> B -> C.
 * > 0: Counter-clockwise
 * < 0: Clockwise
 * = 0: Collinear
 */
export function signedTriangleArea(pA: StarPoint, pB: StarPoint, pC: StarPoint): number {
  return 0.5 * ((pB.x - pA.x) * (pC.y - pA.y) - (pB.y - pA.y) * (pC.x - pA.x));
}

/**
 * Calculates the interior angle (in degrees) opposite side L_opp given sides (L_adj1, L_adj2, L_opp)
 * using the Law of Cosines:
 * cos(theta) = (L_adj1^2 + L_adj2^2 - L_opp^2) / (2 * L_adj1 * L_adj2)
 */
export function computeOppositeAngleDeg(
  sideAdj1: number,
  sideAdj2: number,
  sideOpp: number
): number {
  const denom = 2 * sideAdj1 * sideAdj2;
  if (denom <= 0) return 0;
  const cosVal = Math.max(-1, Math.min(1, (sideAdj1 * sideAdj1 + sideAdj2 * sideAdj2 - sideOpp * sideOpp) / denom));
  return (Math.acos(cosVal) * 180) / Math.PI;
}

/**
 * Computes normalized polar moment of inertia for the triangle:
 * I = (L1^2 + L2^2 + L3^2) / (L1 + L2 + L3)^2
 */
export function computeMomentOfInertia(L1: number, L2: number, L3: number): number {
  const perimeter = L1 + L2 + L3;
  if (perimeter <= 0) return 0;
  return (L1 * L1 + L2 * L2 + L3 * L3) / (perimeter * perimeter);
}

/**
 * Computes the complete scale-invariant, rotation-invariant descriptor for 3 star centroids.
 * Returns null if the points are degenerate (coincident or collinear beyond threshold).
 */
export function computeTriangleDescriptor(
  pA: StarPoint,
  pB: StarPoint,
  pC: StarPoint,
  minSidePixels: number = 5,
  maxCollinearAngleDeg: number = 175
): TriangleDescriptor | null {
  // Compute side lengths
  // a: opposite pA (dist between B and C)
  // b: opposite pB (dist between A and C)
  // c: opposite pC (dist between A and B)
  const distA = euclideanDistance(pB, pC);
  const distB = euclideanDistance(pA, pC);
  const distC = euclideanDistance(pA, pB);

  if (distA < minSidePixels || distB < minSidePixels || distC < minSidePixels) {
    return null;
  }

  // Association between side and opposite vertex star ID
  const sideVertexPairs: Array<{ length: number; oppStarId: number }> = [
    { length: distA, oppStarId: pA.id },
    { length: distB, oppStarId: pB.id },
    { length: distC, oppStarId: pC.id },
  ];

  // Sort ascending by length: L1 <= L2 <= L3
  sideVertexPairs.sort((a, b) => a.length - b.length);

  const L1 = sideVertexPairs[0].length;
  const L2 = sideVertexPairs[1].length;
  const L3 = sideVertexPairs[2].length;

  if (L3 <= 0) return null;

  // Triangle inequality check
  if (L1 + L2 <= L3) {
    return null;
  }

  // Calculate angles opposite each sorted side
  // theta1 is opposite L1, theta2 opposite L2, theta3 opposite L3
  const theta1 = computeOppositeAngleDeg(L2, L3, L1);
  const theta2 = computeOppositeAngleDeg(L1, L3, L2);
  const theta3 = 180 - (theta1 + theta2);

  // Collinear degeneracy check: largest angle cannot exceed maxCollinearAngleDeg
  if (theta3 >= maxCollinearAngleDeg) {
    return null;
  }

  // Normalized side ratios
  const r1 = L1 / L3;
  const r2 = L2 / L3;

  // Moment of inertia invariant
  const momentOfInertia = computeMomentOfInertia(L1, L2, L3);

  // Signed area & winding parity
  const area = signedTriangleArea(pA, pB, pC);
  const isCounterClockwise = area > 0;

  // Constituent star IDs ordered opposite [L1, L2, L3]
  const orderedStarIds: [number, number, number] = [
    sideVertexPairs[0].oppStarId,
    sideVertexPairs[1].oppStarId,
    sideVertexPairs[2].oppStarId,
  ];

  return {
    r1,
    r2,
    sides: [L1, L2, L3],
    angles: [theta1, theta2, theta3],
    momentOfInertia,
    isCounterClockwise,
    starIds: orderedStarIds,
  };
}
