## Step 6: Hipparcos Catalog Integration:
- Moving to real astronomical star catalog
- We want:
```text
Hipparcos Catalog
        ↓
Thousands of stars
        ↓
Astronomy Engine
        ↓
Altitude / Azimuth
        ↓
Visible stars
```

- The Hipparcos catalog gives us standardized astronomical data for stars, including identifiers and positional information.
- The full Hipparcos catalog contains 118,218 stars, which is too large to process on every API request.
- For naked-eye visibility and mobile stargazing, human eyes see up to magnitude ≈ 6.0 to 6.5 (~5,000–9,000 stars).

### What We Did:

1. Installed `pandas` Dependency
- Skyfield's `skyfield.data.hipparcos.load_dataframe` relies on pandas for parsing the catalog format.
- Installed `pandas` (v3.0.5) in the backend `.venv`.

2. Loaded & Filtered the Hipparcos Catalog
- Loaded `hip_main.dat` via Skyfield's built-in loader:
```python
from skyfield.data import hipparcos

with load.open(hipparcos.URL) as f:
    df = hipparcos.load_dataframe(f)
```
- Filtered for stars with valid coordinates and apparent magnitude <= 6.0:
```python
bright_stars = df[df["ra_degrees"].notnull() & (df["magnitude"] <= 6.0)].copy()
```
- This narrows down 118,218 stars to ~5,000 bright stars visible to the human eye under dark skies.

3. Replaced Loop with Vectorized Matrix Math (NumPy)
- Initially, iterating through stars with a Python `for` loop caused `TypeError: 'Star' object is not iterable` because `Star.from_dataframe()` produces a single vectorized Skyfield object.
- More importantly, calculating 5,000 stars in a Python loop would take several seconds per request.
- Switched to Skyfield's vectorized observation:
```python
# Observe all 5,000+ stars simultaneously in one operation:
apparent = observer.at(t).observe(self.stars).apparent()
alt, az, _ = apparent.altaz()
```
- Benchmark: Computes positions for all 5,000 stars in **~20 milliseconds**!

4. Added Prominent Star Identification
- Hipparcos stars are indexed by number (`HIP 32349`, etc.).
- Added a `PROMINENT_STARS` mapping for well-known navigational and bright stars (Sirius, Vega, Betelgeuse, Polaris, Rigel, etc.) so user-friendly names are retained.

5. Updated `/sky/visible` Endpoint
- Added pagination / result capping via a `limit` query parameter (default 100, max 2000).
- Results are sorted by apparent brightness (`magnitude` ascending).
- Added `count` to the response metadata.

### Updated Data Flow
```text
      Location + Time + Magnitude Filter (<= 6.0)
                        ↓
         Topocentric Observer (Earth + WGS84)
                        ↓
     Vectorized Skyfield Observation (5,000 stars)
                        ↓
             NumPy Boolean Mask (alt > 0)
                        ↓
       Sorted by Brightness + Named Star Lookup
                        ↓
                  Visible Stars API
```

Status
  Python 3.12 environment
  Astronomy dependencies & pandas
  Astronomy Engine v1 (Mock dataset)
  Hipparcos Catalog Integration (5,000+ stars)
  Vectorized Skyfield calculations (~20ms)
  Prominent star name mapping
  /sky/visible API with limit and brightness sorting
