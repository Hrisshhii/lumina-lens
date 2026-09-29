#!/usr/bin/env python3
"""
Lumina Lens - Astronomical Prediction Verification Script (Phase 1, Step 11)
Validates the mathematical accuracy, horizon filtering, polar invariance,
hemispheric visibility, and astrophysical metadata against physical ground truth.
"""

from datetime import datetime, timezone
import sys
from app.engines.astronomy.astronomy_engine import AstronomyEngine
from app.services.star_service import StarService

def run_verification():
    print("=" * 75)
    print(" ✦ LUMINA LENS — ASTRONOMICAL PREDICTION VERIFICATION (STEP 11) ✦")
    print("=" * 75)

    engine = AstronomyEngine()
    star_service = StarService()

    # Fixed observation epoch: Equinox / autumn baseline (UTC)
    obs_time = datetime(2026, 9, 29, 21, 0, 0, tzinfo=timezone.utc)
    print(f"Observation Epoch (UTC): {obs_time.isoformat()}\n")

    observers = [
        {"name": "Greenwich (UK)", "lat": 51.4769, "lon": -0.0005, "expected_hemisphere": "Northern"},
        {"name": "Pune (India)", "lat": 18.5204, "lon": 73.8567, "expected_hemisphere": "Northern Tropical"},
        {"name": "Sydney (Australia)", "lat": -33.8688, "lon": 151.2093, "expected_hemisphere": "Southern"},
        {"name": "Quito (Equator)", "lat": -0.1807, "lon": -78.4678, "expected_hemisphere": "Equatorial"},
    ]

    all_passed = True

    # -------------------------------------------------------------
    # 1. Horizon & Sorting Invariant Verification
    # -------------------------------------------------------------
    print("1. VERIFYING HORIZON & SORTING INVARIANTS")
    print("-" * 55)

    for obs in observers:
        stars = engine.get_visible_stars(obs["lat"], obs["lon"], obs_time, limit=100)
        
        # Check Alt >= 0
        below_horizon = [s for s in stars if s["altitude"] < 0]
        if below_horizon:
            print(f"  ❌ FAILED: {obs['name']} returned {len(below_horizon)} stars below horizon!")
            all_passed = False
        else:
            print(f"  ✅ {obs['name']:<20} ({len(stars)} stars): All altitudes >= 0.0°")

        # Check sorted by magnitude
        mags = [s["magnitude"] for s in stars]
        is_sorted = all(mags[i] <= mags[i + 1] for i in range(len(mags) - 1))
        if not is_sorted:
            print(f"  ❌ FAILED: Stars for {obs['name']} not sorted by magnitude!")
            all_passed = False
        else:
            print(f"  ✅ {obs['name']:<20}: Sorted by brightness (mag {mags[0]:.2f} to {mags[-1]:.2f})")

    # -------------------------------------------------------------
    # 2. Polar Alignment Invariant (Polaris / HIP 11767)
    # -------------------------------------------------------------
    print("\n2. VERIFYING POLAR ALIGNMENT INVARIANT (POLARIS / HIP 11767)")
    print("-" * 65)

    # Northern observer checks
    for obs in [observers[0], observers[1]]:
        all_stars = engine.get_visible_stars(obs["lat"], obs["lon"], obs_time, limit=2000)
        polaris = next((s for s in all_stars if s["hip"] == 11767), None)
        
        assert polaris is not None, f"Polaris missing for {obs['name']}"
        alt = polaris["altitude"]
        az = polaris["azimuth"]
        lat = obs["lat"]

        alt_diff = abs(alt - lat)
        az_north_diff = min(az, abs(360.0 - az))

        print(f"  Observer: {obs['name']}")
        print(f"    Latitude: {lat:.4f}° | Polaris Altitude: {alt:.2f}° (Δ = {alt_diff:.2f}°)")
        print(f"    Polaris Azimuth: {az:.2f}° (Deviation from True North = {az_north_diff:.2f}°)")

        if alt_diff <= 1.0 and az_north_diff <= 2.5:
            print(f"    ✅ PASS: Polaris tracks observer latitude and True North within astronomical tolerance.\n")
        else:
            print(f"    ❌ FAILED: Polaris deviation exceeds threshold!\n")
            all_passed = False

    # Southern observer check: Polaris must be invisible in Sydney
    sydney = observers[2]
    sydney_stars = engine.get_visible_stars(sydney["lat"], sydney["lon"], obs_time, limit=2000)
    polaris_in_sydney = any(s["hip"] == 11767 for s in sydney_stars)
    if not polaris_in_sydney:
        print(f"  Observer: {sydney['name']} (Lat {sydney['lat']:.2f}°)")
        print(f"    ✅ PASS: Polaris is correctly sub-horizon (invisible) in Southern Hemisphere.\n")
    else:
        print(f"  ❌ FAILED: Polaris should not be visible in Sydney!\n")
        all_passed = False

    # -------------------------------------------------------------
    # 3. Hemispheric Divergence (Alpha Centauri / HIP 71683)
    # -------------------------------------------------------------
    print("3. VERIFYING HEMISPHERIC DIVERGENCE (ALPHA CENTAURI / HIP 71683)")
    print("-" * 65)
    
    greenwich_stars = engine.get_visible_stars(observers[0]["lat"], observers[0]["lon"], obs_time, limit=2000)
    alpha_cen_greenwich = any(s["hip"] == 71683 for s in greenwich_stars)
    alpha_cen_sydney = next((s for s in sydney_stars if s["hip"] == 71683), None)

    print(f"  Alpha Centauri (Dec = -60.83°):")
    print(f"    Visible at Greenwich (51.48° N): {alpha_cen_greenwich} (Expected: False)")
    print(f"    Visible at Sydney (33.87° S):    {alpha_cen_sydney is not None} (Expected: True)")
    
    if not alpha_cen_greenwich and alpha_cen_sydney:
        print(f"    Alt in Sydney: {alpha_cen_sydney['altitude']:.2f}°, Az: {alpha_cen_sydney['azimuth']:.2f}°")
        print(f"    ✅ PASS: Correct hemispheric declination boundary enforcement.\n")
    else:
        print(f"    ❌ FAILED: Alpha Centauri visibility error!\n")
        all_passed = False

    # -------------------------------------------------------------
    # 4. Astrophysical Metadata & Distance Formula
    # -------------------------------------------------------------
    print("4. VERIFYING ASTROPHYSICAL IDENTITY & METADATA LAYER")
    print("-" * 65)

    test_targets = [
        {"hip": 91262, "name": "Vega", "constellation": "Lyra", "exp_dist": 25.3, "exp_mag": 0.03},
        {"hip": 32349, "name": "Sirius", "constellation": "Canis Major", "exp_dist": 8.6, "exp_mag": -1.44},
        {"hip": 27989, "name": "Betelgeuse", "constellation": "Orion", "exp_dist": 427.5, "exp_mag": 0.45},
        {"hip": 24436, "name": "Rigel", "constellation": "Orion", "exp_dist": 772.9, "exp_mag": 0.18},
    ]

    print(f"  {'Star':<12} {'HIP':<8} {'Constellation':<15} {'Mag':<8} {'Distance (ly)':<18} {'Status'}")
    print(f"  {'-'*12} {'-'*8} {'-'*15} {'-'*8} {'-'*18} {'-'*8}")

    for t in test_targets:
        prof = star_service.get_star_by_hip(t["hip"])
        dist_diff = abs(prof.distance_light_years - t["exp_dist"])
        mag_diff = abs(prof.magnitude - t["exp_mag"])

        status = "✅ PASS" if (dist_diff < 5.0 and mag_diff < 0.1) else "❌ FAIL"
        if status == "❌ FAIL":
            all_passed = False

        print(f"  {prof.primary_name:<12} {prof.hip_id:<8} {prof.constellation:<15} {prof.magnitude:<8.2f} {prof.distance_light_years:<18.1f} {status}")

    print("\n" + "=" * 75)
    if all_passed:
        print(" 🎯 ALL VERIFICATION CHECKS PASSED — ASTRONOMY ENGINE ACCURACY CONFIRMED!")
        print(" Phase 1 Foundation & Sky Prediction is mathematically sound and verified.")
    else:
        print(" ❌ SOME VERIFICATION CHECKS FAILED.")
    print("=" * 75)

    return all_passed

if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
