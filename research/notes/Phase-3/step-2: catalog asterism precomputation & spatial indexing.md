# Step 2: Catalog Asterism Precomputation & Spatial Indexing (Kd-Tree / Hash Grid)

## Objective
Precompute reference asterisms from astronomical catalog stars (Hipparcos reference dataset) and structure them into a high-performance 2D spatial Kd-tree and grid hash index. This enables sub-millisecond range queries in $(r_1, r_2)$ scale-invariant feature space to retrieve candidate matches for observed star triangles during real-time Lost-in-Space plate solving.

---

## 1. Context & Motivation

In **Phase 3 Step 1**, we established the scale-invariant and rotation-invariant geometric descriptor for star triplets:
$$\mathbf{T} = \left( r_1 = \frac{L_1}{L_3}, \; r_2 = \frac{L_2}{L_3}, \; \mathcal{I}_\Delta, \; \text{sign}(\Delta), \; [\text{id}_A, \text{id}_B, \text{id}_C] \right)$$
where $L_1 \le L_2 \le L_3$, mapping any physical or camera triangle into the bounded domain:
$$\Omega = \{(r_1, r_2) \in \mathbb{R}^2 \mid 0 < r_1 \le r_2 \le 1, \; r_1 + r_2 > 1\}$$

When the user points their smartphone camera at the night sky, the Vision Engine extracts centroids (Phase 2) and generates dozens of candidate triangles (Phase 3 Step 1). To identify which catalog stars these triangles correspond to, the mobile client must search a reference database of catalog asterisms.

A linear search $\mathcal{O}(M)$ across thousands of catalog triangles for every observed triangle $\mathcal{O}(N_{\text{obs}} \times M)$ is far too slow for real-time mobile performance ($> 100\text{ ms}$). 

**Step 2 solves this by:**
1. Precomputing spherical triangles from bright catalog stars ($V \le 4.5$ / $V \le 5.0$) within typical smartphone camera Fields of View ($10^\circ \le \theta_{\text{FOV}} \le 45^\circ$).
2. Indexing catalog triangles in a 2D spatial **Kd-tree** (and spatial grid bucket hash) partitioned on $(r_1, r_2)$.
3. Providing logarithmic $\mathcal{O}(\log M)$ nearest-neighbor and bounding-box range queries within tolerance $\epsilon$ ($|r_1 - r_1^*| \le \epsilon, |r_2 - r_2^*| \le \epsilon$) in $< 0.1\text{ ms}$.

---

## 2. Mathematical Formulations & Indexing Structures

### A. Great-Circle Spherical Triangle Geometry
For reference stars on the celestial sphere, positions are defined by spherical coordinates $(\text{RA}, \text{Dec}) = (\alpha, \delta)$.
Each star is represented by a 3D unit direction vector:
$$\mathbf{u} = \begin{bmatrix} \cos(\delta)\cos(\alpha) \\ \cos(\delta)\sin(\alpha) \\ \sin(\delta) \end{bmatrix}$$

The angular separation $\theta_{ij}$ between stars $i$ and $j$ on the celestial sphere is:
$$\cos(\theta_{ij}) = \mathbf{u}_i \cdot \mathbf{u}_j$$
$$\theta_{ij} = \arccos\left(\operatorname{clamp}(\mathbf{u}_i \cdot \mathbf{u}_j, -1, 1)\right)$$

For narrow-to-moderate camera fields of view ($\theta \le 35^\circ$), gnomonic (tangent plane) optical projection maps great-circle arcs directly to straight lines in camera pixel space. The angular side lengths $[\theta_{12}, \theta_{23}, \theta_{31}]$ sort into:
$$\theta_1 \le \theta_2 \le \theta_3$$
and the scale-invariant catalog descriptor ratios are:
$$r_1 = \frac{\theta_1}{\theta_3}, \quad r_2 = \frac{\theta_2}{\theta_3}$$

---

### B. 2D Spatial Kd-Tree for Feature Space $\Omega$
A 2D Kd-tree recursively bisects the $(r_1, r_2)$ domain alternating between $r_1$ and $r_2$ axes:
- **Root node (depth 0):** Splits along axis 0 ($r_1$) at the median $r_1$ value.
- **Child nodes (depth 1):** Split along axis 1 ($r_2$) at the median $r_2$ value.
- **Leaf nodes:** Contain up to $K_{\text{bucket}}$ entries (default: 8) with catalog asterism IDs and constituent Hipparcos numbers $[\text{HIP}_1, \text{HIP}_2, \text{HIP}_3]$.

#### Range Query Algorithm:
Given query descriptor $(r_1^*, r_2^*)$ with search radius $\epsilon$ (typical camera centroid noise $\epsilon \approx 0.015$):
1. Traverse tree from root.
2. If current node's split axis coordinate falls within $[q_{\text{axis}} - \epsilon, q_{\text{axis}} + \epsilon]$, explore **both** left and right subtrees.
3. Otherwise, branch only into the subtree containing the query.
4. Check leaf entries against Euclidean feature distance:
   $$D(T, T^*) = \sqrt{(r_1 - r_1^*)^2 + (r_2 - r_2^*)^2} \le \epsilon$$

---

## 3. Data Contracts & TypeScript Interfaces

```typescript
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
  angularSpanDeg: number;            // Largest side theta_3 in degrees
  momentOfInertia: number;
}

export interface KdTreeNode {
  point: [number, number];           // [r1, r2]
  asterism: CatalogAsterism;
  left: KdTreeNode | null;
  right: KdTreeNode | null;
  axis: 0 | 1;                       // 0 for r1, 1 for r2
}

export interface AsterismSpatialIndex {
  tree: KdTreeNode | null;
  totalAsterisms: number;
  queryRange: (r1: number, r2: number, epsilon: number) => CatalogAsterism[];
  nearestNeighbor: (r1: number, r2: number) => { asterism: CatalogAsterism; distance: number } | null;
}
```

---

## 4. Implementation Phasing for Step 2

1. **Part 1: 2D Spatial Kd-Tree Engine (`spatialIndex.ts`):**
   - Pure TypeScript balanced 2D Kd-tree builder (`buildKdTree`).
   - Range search (`rangeSearch2D`) with tolerance $\epsilon$.
   - $k$-Nearest Neighbors search (`knnSearch2D`).
2. **Part 2: Celestial Sphere Catalog Asterism Precomputation (`catalogAsterisms.ts`):**
   - Convert catalog stars to 3D unit vectors.
   - Pairwise angular distance calculation via dot products.
   - Generate catalog asterisms within maximum field of view ($3^\circ \le \theta \le 30^\circ$).
   - Built-in reference asterisms for major constellations (Orion, Summer Triangle, Cassiopeia, Ursa Major, Scorpius, etc.) for instant client-side lookup.
3. **Part 3: Verification Suite (`test_step2_spatial_index.mjs`):**
   - Unit test Kd-tree construction, range query recall, and precision.
   - Benchmark query latency: assert search time $< 0.1\text{ ms}$ for 100 consecutive queries.
   - Verify that all synthetic and observed benchmark asterisms from Phase 2 match their ground-truth catalog entries.

---

## 5. Verification & Acceptance Criteria

| Metric | Target | Rationale |
|:---|:---|:---|
| **Kd-Tree Construction** | $< 15\text{ ms}$ for $1000+$ asterisms | Fast startup / lazy initialisation |
| **Range Query Latency** | $< 0.1\text{ ms}$ per query ($\epsilon = 0.02$) | Real-time interactive mobile budget |
| **Search Recall** | $100\%$ recall for $\Delta r \le \epsilon$ | No true catalog matches skipped |
| **Ground-Truth Match** | $100\%$ recovery on Orion, Summer Triangle, Cassiopeia | Guarantees downstream plate solving success |
