# Step 1: Asterism Generation & Geometric Invariants (Triangle Descriptors) (Completed ✅)

## Objective
Design and implement the mathematical foundation for star asterism identification. Given a set of 2D star centroids $(x_c, y_c)$ extracted from a camera frame, construct scale-invariant, rotation-invariant geometric descriptors (triangle hashes) that uniquely characterize local star clusters regardless of camera orientation or focal length.

---

## 1. Context & Problem Statement
In Phase 2, the Vision Engine extracted accurate sub-pixel centroids $[(x_0, y_0), (x_1, y_1), \dots]$ from captured frames. However, these coordinates are merely numbers in pixel space. To recognize what stars they correspond to on the celestial sphere without relying on unreliable magnetometer compass readings, we must solve the **Lost-in-Space (LIS)** problem.

Traditional pattern matching fails when:
1. The camera can be rotated at any angle around the optical axis (arbitrary Roll).
2. The focal length and sensor pixel dimensions vary across devices, changing the apparent angular scale (scale ambiguity).
3. False detections (satellites, noise) or missing faint stars introduce perturbations.

To overcome these challenges, we map triplets of star centroids into **scale-invariant geometric invariant feature spaces** where triangles maintain identical coordinates regardless of rotation, translation, or uniform zoom.

---

## 2. Mathematical Formulations & Geometric Invariants

### A. Candidate Triplet Selection
Given $N$ detected star centroids ordered by brightness (luminous flux), forming all possible combinations $\binom{N}{3}$ scales as $\mathcal{O}(N^3)$, which is computationally prohibitive on mobile devices for $N > 30$.

To restrict the combinatorial search while ensuring high-quality asterisms:
1. **Brightness Pruning:** Select the top $M$ brightest stars ($M \le 20$).
2. **Delaunay Triangulation / k-Nearest Neighbors:** Construct triangles exclusively between spatial neighbors:
   - For each star $S_i$, find its $k$ nearest neighbors ($k \in [4, 6]$).
   - Form candidate triplets $(S_i, S_j, S_k)$ with minimum side length $d_{\text{min}} \ge 15\text{ px}$ (avoiding sub-pixel noise or optical double clusters) and maximum side length $d_{\text{max}} \le 0.8 \cdot \min(W, H)$ (avoiding severe lens distortion near frame edges).

---

### B. Invariant Feature Vector Formulation
For any triangle defined by three vertices $A, B, C$, let the Euclidean side lengths in sensor pixel space be:
$$L_a = \|B - C\|_2, \quad L_b = \|A - C\|_2, \quad L_c = \|A - B\|_2$$

Sort the side lengths such that:
$$L_1 \le L_2 \le L_3$$
where $L_1$ is the shortest side and $L_3$ is the longest side.

#### Invariant Metric 1: Normalized Side Ratios
By dividing the shorter sides by the longest side $L_3$, we eliminate the unknown focal length and sensor scale:
$$r_1 = \frac{L_1}{L_3}, \quad r_2 = \frac{L_2}{L_3}$$
Because $L_1 \le L_2 \le L_3$, the normalized coordinates satisfy:
$$0 < r_1 \le r_2 \le 1, \quad r_1 + r_2 > 1 \text{ (triangle inequality)}$$

This maps every possible geometric triangle into a bounded 2D planar region:
$$\Omega = \{(r_1, r_2) \in \mathbb{R}^2 \mid 0 < r_1 \le r_2 \le 1 \text{ and } r_1 + r_2 > 1\}$$

#### Invariant Metric 2: Interior Angles ($\theta_1, \theta_2, \theta_3$)
Using the Law of Cosines, the interior angles opposite each side are scale-invariant:
$$\cos(\theta_3) = \frac{L_1^2 + L_2^2 - L_3^2}{2 L_1 L_2}$$
$$\cos(\theta_2) = \frac{L_1^2 + L_3^2 - L_2^2}{2 L_1 L_3}$$
$$\theta_1 = \pi - (\theta_2 + \theta_3)$$
Ordered as $\theta_{\text{min}} \le \theta_{\text{mid}} \le \theta_{\text{max}}$ with $\sum \theta = 180^\circ$.

#### Invariant Metric 3: Normalized Polar Moment of Inertia
$$\mathcal{I}_{\Delta} = \frac{L_1^2 + L_2^2 + L_3^2}{(L_1 + L_2 + L_3)^2}$$
Provides a fast 1D scalar hash check before computing full 2D or 3D vector distance comparisons.

---

### C. Parity & Vertex Cyclic Ordering
To prevent mirror reflections (which cannot occur in a real pinhole optical camera), vertices are ordered according to their 2D signed cross-product (winding direction):
$$\Delta = (x_B - x_A)(y_C - y_A) - (y_B - y_A)(x_C - x_A)$$
- $\Delta > 0$: Counter-clockwise cyclic ordering.
- $\Delta < 0$: Clockwise cyclic ordering.

The triangle descriptor tuple is defined as:
$$\mathbf{T} = \left( r_1, r_2, \mathcal{I}_\Delta, \text{sign}(\Delta), [\text{id}_A, \text{id}_B, \text{id}_C] \right)$$

---

## 3. Data Contracts & TypeScript Interfaces

```typescript
export interface StarPoint {
  id: number;
  x: number;
  y: number;
  flux: number;
}

export interface TriangleDescriptor {
  /** Shortest side / longest side: L1 / L3 (0 < r1 <= r2) */
  r1: number;
  /** Middle side / longest side: L2 / L3 (r1 <= r2 <= 1) */
  r2: number;
  /** Sorted side lengths in pixels [L1, L2, L3] */
  sides: [number, number, number];
  /** Sorted interior angles in degrees [theta1, theta2, theta3] */
  angles: [number, number, number];
  /** Normalized moment of inertia invariant */
  momentOfInertia: number;
  /** Counter-clockwise vertex winding order */
  isCounterClockwise: boolean;
  /** The 3 constituent star IDs */
  starIds: [number, number, number];
}

export interface AsterismExtractionConfig {
  maxStars: number;          // Default: 20
  minSidePixels: number;     // Default: 15
  maxSidePixels: number;     // Default: 800
  kNearestNeighbors: number; // Default: 5
}
```

---

## 4. Implementation Phasing for Step 1

To build and verify Step 1 cleanly:
- **Part 1: Invariant Math & Triangle Geometry Engine (`triangleInvariants.ts`):**  
  Implement side sorting, normalized side ratios $(r_1, r_2)$, Law of Cosines angles, moment of inertia, and counter-clockwise parity.
- **Part 2: Combinatorial & Delaunay Asterism Extraction (`asterismGenerator.ts`):**  
  Implement $k$-nearest neighbor graph traversal to generate candidate triangles from star centroids, filtering degeneracies (collinear stars, acute needles).
- **Part 3: Unit Testing & Invariance Verification (`test_asterism_invariance.mjs`):**  
  Simulate arbitrary rotation ($0^\circ \dots 360^\circ$), scaling ($0.5\times \dots 2.0\times$), and translation offsets on known asterisms (Orion Belt, Summer Triangle) and assert descriptor invariance within numerical error $\Delta < 10^{-5}$.

---

## 5. Verification & Acceptance Criteria

| Metric | Target | Rationale |
|:---|:---|:---|
| **Rotation Invariance** | $|\Delta r_1| < 10^{-5}, |\Delta r_2| < 10^{-5}$ across any $360^\circ$ rotation | Must be completely agnostic to camera roll |
| **Scale Invariance** | $|\Delta r_1| < 10^{-5}, |\Delta r_2| < 10^{-5}$ across $0.5\times$ to $2.5\times$ zoom | Accommodates variable camera FOV |
| **Collinear Rejection** | $L_1 + L_2 \approx L_3$ rejected automatically | Straight lines provide degenerate astrometric solutions |
| **Extraction Execution Time** | $< 5\text{ ms}$ for 20 stars ($\approx 50$ candidate triangles) | High-speed real-time mobile loop budget |

