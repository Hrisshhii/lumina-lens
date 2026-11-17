/**
 * Plate Solving Engine Types & Contracts (Phase 3)
 */

export interface StarPoint {
  id: number;
  x: number;
  y: number;
  flux?: number;
}

/**
 * Geometric Triangle Descriptor (Scale & Rotation Invariant)
 *
 * Side ordering: L1 <= L2 <= L3
 * - L1: Shortest side
 * - L2: Middle side
 * - L3: Longest side
 *
 * Invariant coordinates:
 * - r1 = L1 / L3 (0 < r1 <= r2)
 * - r2 = L2 / L3 (r1 <= r2 <= 1, r1 + r2 > 1)
 */
export interface TriangleDescriptor {
  /** Shortest side / longest side: L1 / L3 (0 < r1 <= r2) */
  r1: number;
  /** Middle side / longest side: L2 / L3 (r1 <= r2 <= 1) */
  r2: number;
  /** Sorted side lengths in pixels [L1, L2, L3] */
  sides: [number, number, number];
  /** Sorted interior angles in degrees [theta1, theta2, theta3] (theta1 <= theta2 <= theta3) */
  angles: [number, number, number];
  /** Normalized moment of inertia invariant */
  momentOfInertia: number;
  /** True if vertices are oriented counter-clockwise */
  isCounterClockwise: boolean;
  /** The 3 constituent star IDs ordered according to vertex correspondence */
  starIds: [number, number, number];
}

export interface AsterismExtractionConfig {
  /** Maximum number of brightest stars to consider (default: 20) */
  maxStars?: number;
  /** Minimum Euclidean side length in pixels to reject sub-pixel doubles (default: 15) */
  minSidePixels?: number;
  /** Maximum Euclidean side length in pixels to reject edge distortion (default: 800) */
  maxSidePixels?: number;
  /** Number of spatial nearest neighbors for asterism graph (default: 5) */
  kNearestNeighbors?: number;
  /** Maximum angle tolerance for collinear degeneracy rejection (default: 172 degrees) */
  maxCollinearAngleDeg?: number;
}

/**
 * Step 2: Catalog Asterism & Spatial Indexing Contracts
 */

export interface CatalogStarRecord {
  hip: number;
  name?: string;
  raDeg: number;
  decDeg: number;
  mag: number;
  unitVector: [number, number, number];
}

export interface CatalogAsterism {
  id: number;
  starIds: [number, number, number]; // [HIP_A, HIP_B, HIP_C]
  r1: number;                        // L1 / L3
  r2: number;                        // L2 / L3
  angularSpanDeg: number;            // Largest angular side length theta_3 in degrees
  momentOfInertia: number;
  constellation?: string;
}

export interface KdTreeNode {
  point: [number, number];           // [r1, r2]
  asterism: CatalogAsterism;
  left: KdTreeNode | null;
  right: KdTreeNode | null;
  axis: 0 | 1;                       // 0 for r1, 1 for r2
}

export interface NearestMatchResult {
  asterism: CatalogAsterism;
  distance: number;
}
