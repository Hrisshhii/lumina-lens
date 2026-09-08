# Backend Architecture Inspection — `lumina-lens/backend`

---

## Module-by-Module Breakdown

### 1. `backend/app/main.py` — Application Entry Point
- **Responsibility:** Creates the FastAPI app, configures CORS, defines `/` and `/health` endpoints, mounts routers.
- **Interactions:** Imports `app.api.sky` and `app.api.stars` routers via `app.include_router(...)`.
- **Endpoints:** `GET /` (project info), `GET /health` (liveness).
- **Notable:** CORS is fully open (`allow_origins=["*"]` + `allow_credentials=True` — an invalid/unsafe combination in production). No lifespan/startup hooks, no settings import.

### 2. `backend/app/models/` — Data Models
- `star.py`: single Pydantic model `Star` — Hipparcos identity (`hip_id`, names, Bayer/Flamsteed designations, constellation), astrometry (RA/Dec, parallax, proper motions), photometry (magnitude, spectral type, distance in ly), and a human-readable description. All fields except `hip_id` are optional.
- `__init__.py`: re-exports `Star` (`from app.models.star import Star`).
- **Notable:** These are pure Pydantic DTOs — there is **no database, no ORM, no persistence layer anywhere**. The "database" is the Hipparcos catalog loaded into pandas.

### 3. `backend/app/services/star_service.py` — Star Metadata Service
- **Responsibility:** Resolves star identity/metadata by HIP ID and assembles a `Star` profile.
- **Key class:** `StarService` (module-level **singleton** `star_service = StarService()` at import time).
- **Data sources:**
  1. Hipparcos catalog loaded via `skyfield.data.hipparcos.load_dataframe` — **fetched over the network from `hipparcos.URL` at import time** (in `__init__`), not from the local `backend/hip_main.dat` file.
  2. `ENRICHED_METADATA` — a hardcoded dict of 15 famous stars (Sirius, Vega, Betelgeuse, Polaris, Rigel, Arcturus, Aldebaran, Spica, Antares, Altair, Deneb, Pollux, Castor, Alpha Centauri, Canopus) with cultural/scientific metadata.
- **Key function:** `get_star_by_hip(hip_id) -> Star | None` — looks up the catalog row, merges enriched metadata, computes distance from parallax (`3261.56 / parallax_mas` ly), falls back to `"HIP <id>"` naming.
- **Interactions:** Depends only on `app.models.Star`; consumed by `app/api/stars.py`.

### 4. `backend/app/api/` — Route Modules (this project uses `api/`, not `routes/`)
- **`sky.py`:** Router `prefix="/sky"`. `GET /sky/visible?latitude&longitude&limit` — validates coords (±90/±180) and limit (1–2000), then **bypasses the service layer entirely** and calls `AstronomyEngine.get_visible_stars()` directly. Module-level singleton `astronomy_engine = AstronomyEngine()`. Observation time is always `datetime.now()` server-side (no time-travel queries). Returns raw dicts, no `response_model`.
- **`stars.py`:** Router `prefix="/stars"`. `GET /stars/{hip_id}` — validates `hip_id ≥ 1`, delegates to `star_service.get_star_by_hip()`, raises 404 if missing. This is the only route with a `response_model=Star` and proper error handling.
- **No `__init__.py`** in `app/api/` (works via namespace packages, but inconsistent with `models/` and `services/`).

### 5. `backend/app/engines/astronomy/` — Astronomy Engine
- **`astronomy_engine.py`:** `AstronomyEngine` class — the computational core.
  - `__init__`: loads Skyfield timescale, loads **`de421.bsp` ephemeris from disk**, fetches the Hipparcos catalog **over the network again** (a second, independent download), filters to ~5,000 naked-eye stars (mag ≤ 6.0, valid RA), builds a vectorized `Star.from_dataframe`.
  - `get_visible_stars(lat, lon, time, limit)`: vectorized alt/az computation for all stars at once, filters altitude > 0, sorts by magnitude, caps at limit. Returns plain dicts `{hip, name, altitude, azimuth, magnitude}`. Names come from a second hardcoded `PROMINENT_STARS` dict (same 15 HIP IDs as the service's enrichment dict).
  - `get_star_position(star_data, ...)`: single-star apparent position (accepts raw RA/Dec dicts — currently **unused by any route**; it pairs with the dead `star_data.py`).
- **`star_data.py`:** **Dead code.** Hardcoded RA/Dec for only 4 stars; nothing imports it. Superseded by the Hipparcos catalog integration.

### 6. Configuration / Settings
- **There is no configuration module.** No `config.py`, no `settings.py`, no env-var handling (despite `python-dotenv` being in requirements). All values are hardcoded: CORS origins, star magnitude threshold, default limit, catalog URLs.

### 7. Dependencies
- **`backend/requirements.txt`** (complete, pip-frozen style): fastapi 0.128.8, uvicorn, pydantic 2.x, **skyfield 1.54 + jplephem + numpy + pandas + astropy**, python-dotenv. Astropy and sgp4 are installed but **never imported** in app code.
- **`backend/app/requirements.txt`** — a **drifting duplicate** missing the entire astronomy stack (skyfield, pandas, numpy, jplephem, astropy). Installing from this file would crash the app at import.

### 8. Tests
- **None exist.** No `tests/` directory, no test config, no pytest in either requirements file.

### Data Storage
- No database. Runtime state: `de421.bsp` (ephemeris, on disk) + Hipparcos catalog (network-fetched into pandas at startup). `backend/hip_main.dat` sits in the repo but is **never read by any code**.

---

## A. Current Backend Architecture Summary

A small, layered-but-porous FastAPI monolith:

```
main.py (FastAPI + CORS)
 ├── api/sky.py ──────────► engines/astronomy/astronomy_engine.py ──► skyfield/de421.bsp + Hipparcos (network)
 └── api/stars.py ──► services/star_service.py ──► models/star.py ──► Hipparcos (network, 2nd copy) + hardcoded enrichment
```

- **Pattern:** Router → (Service → Model) or Router → Engine. The classic "api/services/models/engines" layering exists, but only `/stars/{id}` follows it; `/sky/visible` skips the service layer.
- **State:** Stateless per-request; heavy state (ephemeris, catalog DataFrame) cached in two import-time singletons.
- **Compute:** Vectorized NumPy/Skyfield — genuinely good performance design (~5k stars in ms).

## B. Backend Request/Data Flow

1. **`GET /sky/visible`** → `sky.py` validates query params → `AstronomyEngine` singleton → vectorized alt/az for ~5k bright stars → horizon filter → magnitude sort → limit → untyped JSON `{latitude, longitude, count, stars[]}`.
2. **`GET /stars/{hip_id}`** → `stars.py` validates path param → `StarService.get_star_by_hip()` → pandas row lookup → merge with `ENRICHED_METADATA` → parallax→light-years math → typed `Star` Pydantic response (or 404).
3. **At import time** (before serving): two catalogs fetched from the network, ephemeris loaded from disk, timescale built. If the Hipparcos URL fetch fails (offline, rate-limited), **the entire app fails to start** — twice, for two separate modules.

## C. Potential Architectural Issues

1. **Import-time side effects / startup fragility:** Both `StarService` and `AstronomyEngine` fetch the Hipparcos catalog from the network during module import. No offline fallback despite `hip_main.dat` sitting unused in `backend/`. App is undeployable without internet at boot.
2. **Duplicate catalog loading:** The ~118k-row Hipparcos DataFrame is downloaded and parsed twice (engine + service) — double memory, double startup latency, potential version skew between the two copies.
3. **Layering violation:** `sky.py` → engine directly; `stars.py` → service. Two different patterns for the same job makes the codebase harder to extend.
4. **Duplicated star-name data:** `PROMINENT_STARS` (engine) and `ENRICHED_METADATA` (service) both hardcode the same 15 HIP IDs — drift risk if one is updated without the other.
5. **No shared response model for `/sky/visible`:** Returns raw dicts while `/stars/{id}` uses typed `Star` — inconsistent API contracts, no OpenAPI schema for sky results, no validation on output.
6. **Drifting duplicate requirements:** `backend/app/requirements.txt` is stale and would produce a broken install.
7. **Wide-open CORS with credentials:** `allow_origins=["*"]` + `allow_credentials=True` is both insecure and technically invalid per the CORS spec.
8. **Dead code:** `star_data.py`, `AstronomyEngine.get_star_position()`, unused `hip_main.dat`, unused deps (`astropy`, `sgp4`, `python-dotenv`).
9. **No tests, no error handling in engine paths:** Any Skyfield/numPy failure becomes an unhandled 500.
10. **Minor:** missing `__init__.py` in `api/` and `engines/`; no settings module despite dotenv in deps; `main.py` has noisy `# pyright: ignore` comments.

## D. Recommended Next Development Step

**Consolidate catalog loading into a single, injectable data layer.** Concretely:
1. Create `backend/app/core/catalog.py` (or `services/catalog_service.py`) that loads the Hipparcos DataFrame **once** — preferably from the local `hip_main.dat` with the network URL as fallback — and expose it to both `StarService` and `AstronomyEngine` via FastAPI's dependency injection or lifespan state.
2. Merge `PROMINENT_STARS` into `ENRICHED_METADATA` as the single source of naming truth.
3. Add a `SkyVisibleStar`/`SkyResponse` Pydantic model for `/sky/visible` so both endpoints have typed contracts.
4. Delete `star_data.py`, reconcile the requirements files into one, and add a minimal `tests/` with pytest covering `/stars/{id}` (hit + 404) and `/sky/visible` (range validation, limit behavior).

This removes the startup fragility and duplication now — before more features (constellations, planets, DSOs per the roadmap) each add their own engine/service with the same copy-paste pattern.