# Frontend ↔ Backend Integration Analysis — `lumina-lens`

---

## A. Current Frontend–Backend Architecture

**Communication style:** Direct HTTP/JSON over LAN/loopback. No API gateway, no auth, no caching layer, no websockets, no codegen — the contract is **hand-maintained on both sides**.

```
app/App.tsx  (component + fetching state)
   │  imports
   ▼
app/src/services/api.ts  (raw fetch + hand-written TS types)
   │  HTTP/JSON, BASE_URL = Platform.select
   ▼
backend/app/main.py  (FastAPI, CORS *, routers)
   ├── backend/app/api/sky.py ──────► engines/astronomy/astronomy_engine.py ──► skyfield + de421.bsp + Hipparcos (network)
   └── backend/app/api/stars.py ────► services/star_service.py ──► Hipparcos (network, 2nd copy) + ENRICHED_METADATA (hardcoded)
```

- **API client:** raw `fetch`, one exported function per endpoint, generic `Error` on `!response.ok`.
- **Serialization:** backend returns plain dicts (`/sky/visible`) or Pydantic-serialized `Star` (`/stars/{id}`); frontend calls `response.json()` with **zero runtime validation** — it blindly trusts the backend shape.
- **Auth:** none on either side.
- **CORS:** `backend/app/main.py` sets `allow_origins=["*"]` **with** `allow_credentials=True` — an invalid combination per the CORS spec. Note: CORS only matters for the `react-native-web` build; native iOS/Android fetches are not browser-bound and ignore it.

## B. Complete API Integration Map

**Integration 1 — Visible sky list (the only working integration)**
```
app/App.tsx → App component (fetchStars via useEffect + RefreshControl)
→ getVisibleStars(18.5204, 73.8567, 50)            [app/src/services/api.ts]
→ GET {BASE_URL}/sky/visible?latitude=…&longitude=…&limit=50
→ backend/app/api/sky.py :: get_visible_stars      [router /sky, tag "Sky"]
→ (service layer BYPASSED) AstronomyEngine.get_visible_stars()  [module singleton]
→ Data: skyfield vectorized alt/az · de421.bsp (disk) · Hipparcos (network fetch) · PROMINENT_STARS (hardcoded names)
→ Response (raw dict, no response_model):
   { latitude, longitude, count: len(limited list), stars: [{hip, name, altitude, azimuth, magnitude}] }
→ Consumed by: App.tsx FlatList → renderStarItem (cards with Alt/Az/compass/rank/mag)
```

**Integration 2 — Star profile (BROKEN end-to-end)**
```
app/App.tsx → handleStarPress            ⚠ lives at MODULE SCOPE (lines 7–23) → crashes app at import
→ getStarByHip(hipId)                    [app/src/services/api.ts]
→ GET {BASE_URL}/stars/{hipId}
→ backend/app/api/stars.py :: get_star   [router /stars, tag "Stars", response_model=Star]
→ star_service.get_star_by_hip()         [singleton StarService]
→ Data: Hipparcos pandas DataFrame (independent 2nd network fetch) + ENRICHED_METADATA (hardcoded, 15 stars)
→ Response: typed Pydantic Star (backend/app/models/star.py) | 404 HTTPException {detail}
→ Consumed by: NOTHING — no modal/component renders it; errors swallowed via console.warn
```

**Integration 3 — Health check (defined, never wired)**
```
healthCheck()  [api.ts — exported, zero callers]
→ GET {BASE_URL}/health → backend/app/main.py :: health() → {status:"healthy"}
→ Consumed by: no one. Dead client code.
```

**Integration 4 — `GET /` (backend-only)**
```
backend/app/main.py :: root() → {project, version}
→ No frontend client function, no consumer. Unreferenced.
```

## C. End-to-End Data Flow (working path, when app can boot)

1. `App` mounts → `useEffect` → `fetchStars()` → `loading=true`.
2. `fetch` → `http://10.0.2.2:8000` (Android emu) or `http://localhost:8000` → FastAPI validates `Query(ge/le)` bounds.
3. `AstronomyEngine` computes alt/az for ~5k bright stars, filters `alt > 0`, sorts by magnitude, caps at 50, rounds (alt/az 3dp, mag 2dp).
4. JSON back → `response.json()` (unvalidated) → `setData` → `FlatList`.
5. **Frontend-side transforms:** `getCompassDirection(azimuth)` → 16-point cardinal; `isProminent = !item.name.startsWith("HIP ")` → yellow highlight; `index + 1` → rank badge; `toFixed()` formatting.

## D. Integration Problems / Mismatches

1. **🔴 Launch-blocking:** `App.tsx` lines 7–23 call `useState` at module scope → React "Invalid hook call" on import → **the app cannot start, so today *no* integration works at runtime**, including the nominally complete sky list.
2. **`count` semantic mismatch:** backend returns `count = len(stars)` **after** the `limit` cap; frontend header claims "`count` stars currently above horizon." With `limit=50` and 500+ stars overhead, the UI understates/mislabels the total. Backend never reports the true above-horizon count.
3. **Naming inconsistency in contract:** sky payload uses `hip`; profile payload uses `hip_id` — two different keys for the same concept across the API surface, faithfully duplicated into the frontend types.
4. **Brittle string coupling:** `isProminent` infers fame by parsing the backend's fallback naming convention (`"HIP <id>"`). If the backend changes its fallback format, frontend highlighting silently breaks — presentation logic coupled to backend serialization details.
5. **Error fidelity lost:** backend sends meaningful `404 {detail: "Star with Hipparcos ID X not found…"}`; frontend discards status + body (`throw new Error(statusText)`), so the star-detail UX can't distinguish "not found" from "network down" (moot until the crash is fixed).
6. **No timeout:** `fetch` has no `AbortController`; a hung backend leaves `loading=true` spinner forever. No retry/backoff beyond manual Retry button.
7. **Manual type duplication:** `StarProfile` in `api.ts` is a hand-copied mirror of Pydantic `Star` (`backend/app/models/star.py`); `Star`/`VisibleStarsResponse` hand-copy `sky.py`'s dict shape. Any backend change (e.g., adding fields to the sky dict) silently diverges — no OpenAPI codegen, no shared schema.
8. **Hardcoded URL:** `BASE_URL` = `10.0.2.2`/`localhost:8000` — works only on emulator/simulator/web-same-host. Physical device on LAN, or any deployed environment, fails; no `EXPO_PUBLIC_*` env support, no prod URL strategy.
9. **Hardcoded observer:** Pune coordinates baked into `App.tsx`; backend supports arbitrary lat/lon but the frontend never asks the user/device (no `expo-location`).
10. **CORS misconfiguration:** `*` origins + `allow_credentials=True` is invalid and will be rejected/ignored by spec-compliant browsers — a latent break for the web build.
11. **Dead/unused surface:** `healthCheck()` unused; `GET /` no consumer; backend `GET /stars/{id}` has a client but no working UI; `AstronomyEngine.get_star_position()` + `star_data.py` have no route *and* no client (double-dead).
12. **Unvalidated deserialization:** `response.json()` cast straight to TS interfaces; a backend schema change or error-shaped JSON would surface as `undefined` UI values rather than a caught error.

## E. Highest-Priority Technical Issues

1. **Module-scope hooks crash** (`app/App.tsx`) — blocks every integration; must be fixed before anything else can even be tested.
2. **No single source of truth for the API contract** (hand-duped types both directions + inconsistent `hip` vs `hip_id` keys).
3. **No environment/config strategy** (URLs, coordinates hardcoded; dotenv on backend unused).
4. **Error-handling gap chain:** no timeouts (FE) → generic errors (FE) → detail strings discarded (FE) → unhandled 500s (BE engine paths).
5. **Hardcoded data on the backend leaking into the contract:** `PROMINENT_STARS` (engine) and `ENRICHED_METADATA` (service) duplicate the same 15 HIP IDs; only 15 of ~5,000 returned stars ever have names/profiles — the "detail" feature will 404-free but be a bland `HIP <id>` stub for 99.7% of taps.
6. **CORS invalid combo** for the web target.

## F. Recommended Next Development Step

**Repair and harden the one vertical slice before adding surface area:**
1. Fix `App.tsx` (move state/handler inside the component; render a `StarDetailModal` that actually calls `getStarByHip` with a visible error state for 404s) — completes the step-8 feature end-to-end.
2. Introduce a typed contract layer: define the sky-item shape in the backend with a Pydantic `response_model` (aligning `hip` → `hip_id`), and generate/copy frontend types from it (even manually, from a single documented schema) — kills the drift class of bugs.
3. Fix `count` semantics: return both `count_total_above_horizon` and `returned` from `/sky/visible`; update the summary text.
4. Make `BASE_URL` env-driven (`EXPO_PUBLIC_API_URL` with the current `Platform.select` as dev fallback) and add a `fetchJson` helper with `AbortController` timeout + preserved status codes.
5. Correct CORS (`allow_origins` explicit list, drop `credentials` or restrict origins) so the web build works.

This turns the single fragile integration into a repeatable pattern (typed contract, env config, real error states) that every roadmap feature — constellations, sky view, sensors — can follow without inheriting the current debt.