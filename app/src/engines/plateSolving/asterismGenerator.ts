/**
 * Lumina Lens — Asterism Graph Generator (Phase 3 Step 1)
 *
 * Traverses k-nearest neighbor spatial graphs to extract asterism triangle candidates
 * while preventing combinatorial explosion on dense starfields.
 */

import type { StarPoint, TriangleDescriptor, AsterismExtractionConfig } from "./types";
import { euclideanDistance, computeTriangleDescriptor } from "./triangleInvariants";

const DEFAULT_CONFIG: Required<AsterismExtractionConfig> = {
  maxStars: 20,
  minSidePixels: 15,
  maxSidePixels: 850,
  kNearestNeighbors: 5,
  maxCollinearAngleDeg: 172,
};

/**
 * Extracts candidate asterism triangle descriptors from a list of star centroids.
 */
export function extractAsterismTriangles(
  stars: StarPoint[],
  userConfig: AsterismExtractionConfig = {}
): TriangleDescriptor[] {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  if (!stars || stars.length < 3) {
    return [];
  }

  // 1. Brightness pruning: Take top maxStars ordered by flux descending (if flux provided)
  const sortedStars = [...stars];
  if (sortedStars[0]?.flux !== undefined) {
    sortedStars.sort((a, b) => (b.flux || 0) - (a.flux || 0));
  }
  const candidateStars = sortedStars.slice(0, config.maxStars);
  const N = candidateStars.length;

  if (N < 3) {
    return [];
  }

  // 2. Precompute distance matrix between candidate stars
  const distMatrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = euclideanDistance(candidateStars[i], candidateStars[j]);
      distMatrix[i][j] = d;
      distMatrix[j][i] = d;
    }
  }

  // 3. For each star, find its k-nearest neighbors
  const neighbors: number[][] = [];
  const k = Math.min(config.kNearestNeighbors, N - 1);

  for (let i = 0; i < N; i++) {
    const starDistances: Array<{ idx: number; dist: number }> = [];
    for (let j = 0; j < N; j++) {
      if (i !== j) {
        starDistances.push({ idx: j, dist: distMatrix[i][j] });
      }
    }
    starDistances.sort((a, b) => a.dist - b.dist);
    neighbors.push(starDistances.slice(0, k).map((item) => item.idx));
  }

  // 4. Form candidate triplets among k-nearest neighbors
  // Use a set with sorted indices to prevent duplicate triangles
  const visitedTriplets = new Set<string>();
  const descriptors: TriangleDescriptor[] = [];

  for (let i = 0; i < N; i++) {
    const nbrs = neighbors[i];
    const nbrCount = nbrs.length;

    for (let a = 0; a < nbrCount; a++) {
      for (let b = a + 1; b < nbrCount; b++) {
        const j = nbrs[a];
        const kIdx = nbrs[b];

        const tripletKey = [i, j, kIdx].sort((x, y) => x - y).join(",");
        if (visitedTriplets.has(tripletKey)) {
          continue;
        }
        visitedTriplets.add(tripletKey);

        const pA = candidateStars[i];
        const pB = candidateStars[j];
        const pC = candidateStars[kIdx];

        // Quick check on max side length before full descriptor calculation
        const d1 = distMatrix[i][j];
        const d2 = distMatrix[j][kIdx];
        const d3 = distMatrix[i][kIdx];
        const maxDist = Math.max(d1, d2, d3);
        const minDist = Math.min(d1, d2, d3);

        if (minDist < config.minSidePixels || maxDist > config.maxSidePixels) {
          continue;
        }

        const descriptor = computeTriangleDescriptor(
          pA,
          pB,
          pC,
          config.minSidePixels,
          config.maxCollinearAngleDeg
        );

        if (descriptor) {
          descriptors.push(descriptor);
        }
      }
    }
  }

  return descriptors;
}
