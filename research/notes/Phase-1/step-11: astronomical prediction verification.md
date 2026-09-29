# Step 11: Astronomical Prediction Verification

## Objective
The final milestone of **Phase 1 (Foundation & Sky Prediction)** is to cross-verify the mathematical accuracy, topocentric altitude/azimuth calculations, and physical reality of Lumina Lens's Astronomy Engine against astronomical standards (Stellarium / USNO / Skyfield ground-truth).

---

## 1. Phase 1 Success Criteria

At the conclusion of Step 11, the Lumina Lens Astronomy Engine must satisfy the following criteria:

```text
User Location (Live GPS) + Current UTC Date/Time
                      ↓
              Astronomy Engine
                      ↓
          Visible Stars & Topocentric Angles
```

1. **Polar Alignment Invariant**:
   - For any northern hemisphere observer at latitude $\phi_{\text{obs}}$, the altitude of **Polaris (HIP 11767)** must satisfy:
     $$\left|\text{Alt}_{\text{Polaris}} - \phi_{\text{obs}}\right| \le 1.0^\circ$$
     (Polaris is displaced $\approx 0.66^\circ$ from the Celestial North Pole).
   - The azimuth of Polaris must stay within $\pm 2.5^\circ$ of True North ($0^\circ \text{ or } 360^\circ$).

2. **Horizon Invariant**:
   - All stars returned by `get_visible_stars()` must strictly satisfy $\text{Alt} \ge 0^\circ$.
   - Stars with $\text{Alt} < 0^\circ$ (below physical horizon) must be excluded.

3. **Multi-Observer Hemisphere Invariance**:
   - **Northern Mid-Latitude (Greenwich, UK: 51.48° N, 0.00° W)**: Northern circumpolar stars (Ursa Major, Cassiopeia) must remain visible.
   - **Tropical Northern (Pune, India: 18.52° N, 73.86° E)**: Primary Phase 1 test observer baseline.
   - **Southern Hemisphere (Sydney, Australia: 33.87° S, 151.21° E)**: Northern pole stars must be sub-horizon ($\text{Alt} < 0^\circ$); southern circumpolar stars (Alpha Centauri, Crux) must be visible.

4. **Astrophysical Metadata Accuracy**:
   - Star distance, magnitude, and spectral types must accurately correspond to Hipparcos catalog data.
   - Parallax distance formula:
     $$d_{\text{pc}} = \frac{1000}{\varpi_{\text{mas}}}, \quad d_{\text{ly}} = d_{\text{pc}} \times 3.26156$$

---

## 2. Test Verification Matrix

| Target Star | HIP ID | Right Ascension (J2000) | Declination (J2000) | Visual Mag ($V$) | Expected Behavior / Benchmark |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Polaris** | 11767 | $02^{\text{h}} 31^{\text{m}} 49^{\text{s}}$ | $+89^\circ 15' 51''$ | $1.98$ | $\text{Alt} \approx \text{Latitude}$, $\text{Az} \approx 0^\circ$ |
| **Sirius** | 32349 | $06^{\text{h}} 45^{\text{m}} 09^{\text{s}}$ | $-16^\circ 42' 58''$ | $-1.44$ | Brightest star in night sky, $d \approx 8.6\text{ ly}$ |
| **Vega** | 91262 | $18^{\text{h}} 36^{\text{m}} 56^{\text{s}}$ | $+38^\circ 47' 01''$ | $0.03$ | Photometric zero point reference, $d \approx 25.3\text{ ly}$ |
| **Betelgeuse** | 27989 | $05^{\text{h}} 55^{\text{m}} 10^{\text{s}}$ | $+07^\circ 24' 25''$ | $0.45$ | Red supergiant (M1-M2Ia-ab) in Orion |
| **Rigel** | 24436 | $05^{\text{h}} 14^{\text{m}} 32^{\text{s}}$ | $-08^\circ 12' 06''$ | $0.18$ | Blue supergiant (B8Ia) in Orion |
| **Alpha Centauri** | 71683 | $14^{\text{h}} 39^{\text{m}} 36^{\text{s}}$ | $-60^\circ 50' 02''$ | $-0.01$ | Southern circumpolar, sub-horizon in Greenwich |

---

## 3. Verification Plan & Execution Steps

1. **Develop Automated Test Runner**:
   - Create `backend/verify_astronomy.py` executing the four-observer matrix against fixed timestamps.
2. **Execute Cross-Verification**:
   - Run the script and record precise calculated topocentric coordinates ($\text{Alt/Az}$).
   - Cross-reference with independent Skyfield / JPL DE421 ephemeris calculations.
3. **Verify App UI & SkyDome Consistency**:
   - Verify that stars displayed in the mobile client match the backend output.
4. **Document Phase 1 Completion**:
   - Log output tables, error margins, and sign-off on Phase 1 readiness for **Phase 2 (Computer Vision)**.
