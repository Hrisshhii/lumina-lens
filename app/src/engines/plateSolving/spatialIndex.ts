/**
 * Lumina Lens — 2D Spatial Kd-Tree Index (Phase 3 Step 2)
 *
 * Implements a balanced 2-dimensional Kd-tree for (r1, r2) scale-invariant
 * triangle feature spaces. Enables sub-millisecond range and nearest-neighbor
 * lookups across thousands of catalog asterisms.
 */

import type { CatalogAsterism, KdTreeNode, NearestMatchResult } from "./types";

/**
 * Builds a balanced 2D Kd-tree from an array of catalog asterisms.
 */
export function buildKdTree(
  asterisms: CatalogAsterism[],
  depth: number = 0
): KdTreeNode | null {
  if (!asterisms || asterisms.length === 0) {
    return null;
  }

  const axis: 0 | 1 = (depth % 2) as 0 | 1;

  // Sort along current axis: 0 for r1, 1 for r2
  const sorted = [...asterisms].sort((a, b) => {
    const valA = axis === 0 ? a.r1 : a.r2;
    const valB = axis === 0 ? b.r1 : b.r2;
    return valA - valB;
  });

  const medianIndex = Math.floor(sorted.length / 2);
  const medianElement = sorted[medianIndex];

  const leftElements = sorted.slice(0, medianIndex);
  const rightElements = sorted.slice(medianIndex + 1);

  return {
    point: [medianElement.r1, medianElement.r2],
    asterism: medianElement,
    axis,
    left: buildKdTree(leftElements, depth + 1),
    right: buildKdTree(rightElements, depth + 1),
  };
}

/**
 * Performs a 2D Euclidean range search in (r1, r2) feature space.
 * Returns all catalog asterisms with distance <= epsilon from (queryR1, queryR2).
 */
export function rangeSearchKdTree(
  node: KdTreeNode | null,
  queryR1: number,
  queryR2: number,
  epsilon: number,
  results: CatalogAsterism[] = []
): CatalogAsterism[] {
  if (!node) {
    return results;
  }

  const [nodeR1, nodeR2] = node.point;
  const dR1 = queryR1 - nodeR1;
  const dR2 = queryR2 - nodeR2;
  const distSq = dR1 * dR1 + dR2 * dR2;
  const epsSq = epsilon * epsilon;

  if (distSq <= epsSq) {
    results.push(node.asterism);
  }

  const queryCoord = node.axis === 0 ? queryR1 : queryR2;
  const nodeCoord = node.axis === 0 ? nodeR1 : nodeR2;
  const planeDist = queryCoord - nodeCoord;

  // Traverse closer subtree first
  const firstSubtree = planeDist <= 0 ? node.left : node.right;
  const secondSubtree = planeDist <= 0 ? node.right : node.left;

  rangeSearchKdTree(firstSubtree, queryR1, queryR2, epsilon, results);

  // If search sphere crosses splitting hyperplane, check second subtree
  if (planeDist * planeDist <= epsSq) {
    rangeSearchKdTree(secondSubtree, queryR1, queryR2, epsilon, results);
  }

  return results;
}

/**
 * Finds the single nearest neighbor catalog asterism to (queryR1, queryR2).
 */
export function nearestNeighborKdTree(
  node: KdTreeNode | null,
  queryR1: number,
  queryR2: number
): NearestMatchResult | null {
  if (!node) return null;

  let bestAsterism: CatalogAsterism = node.asterism;
  let bestDistSq = (queryR1 - node.point[0]) ** 2 + (queryR2 - node.point[1]) ** 2;

  function search(currentNode: KdTreeNode | null) {
    if (!currentNode) return;

    const [nR1, nR2] = currentNode.point;
    const dSq = (queryR1 - nR1) ** 2 + (queryR2 - nR2) ** 2;

    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestAsterism = currentNode.asterism;
    }

    const queryCoord = currentNode.axis === 0 ? queryR1 : queryR2;
    const nodeCoord = currentNode.axis === 0 ? nR1 : nR2;
    const planeDist = queryCoord - nodeCoord;

    const first = planeDist <= 0 ? currentNode.left : currentNode.right;
    const second = planeDist <= 0 ? currentNode.right : currentNode.left;

    search(first);

    if (planeDist * planeDist < bestDistSq) {
      search(second);
    }
  }

  search(node);

  return {
    asterism: bestAsterism,
    distance: Math.sqrt(bestDistSq),
  };
}
