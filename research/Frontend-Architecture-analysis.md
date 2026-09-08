# Frontend Architecture Inspection — `lumina-lens/app`

---

## Module-by-Module Breakdown

### 1. `app/package.json` — Dependencies & Scripts
- **Stack:** Expo SDK `~57.0.9`, React Native `0.86.2`, React `19.2.3`, `react-dom` (web support), `react-native-web ^0.21.2`, `expo-status-bar ~57.0.1`.
- **Dev:** TypeScript `~6.0.3`, `@types/react ~19.2.2`.
- **Scripts:** standard Expo `start / android / ios / web`. No `test`, no `lint`, no `typecheck` script.
- **Notable:** Extremely minimal. **No navigation library, no state library, no test runner, no ESLint/Prettier.**

### 2. `app/index.ts` — Entry Point
- Standard Expo boilerplate: `registerRootComponent(App)` from `./App`. No providers wrapped here (none exist to wrap).

### 3. `app/App.tsx` — The Entire UI (316-line monolith)
- **Responsibility:** Everything — root component, screen, list item rendering, data fetching logic, compass utility, and all styles in one file.
- **Structure:**
  - `getCompassDirection(azimuth)` — 16-point compass utility (module scope, fine, but belongs in `utils/`).
  - `DEFAULT_LATITUDE/DEFAULT_LONGITUDE` — hardcoded Pune, India (18.5204, 73.8567); no GPS.
  - `App()` component: local `useState` for `data/loading/refreshing/error`; `fetchStars` via `useCallback`; `useEffect` initial load; error state with Retry button; `FlatList` with pull-to-refresh, summary header, empty state.
  - `renderStarItem` — inline star card (name, HIP badge, magnitude badge, altitude/azimuth/rank boxes); prominent stars highlighted yellow via `!item.name.startsWith("HIP ")` heuristic.
- **Styling:** single `StyleSheet.create` with ~30 hardcoded dark-theme hex colors (`#070b14`, `#0d1527`, `#60a5fa`…). No theme object, no design tokens.
- **🔴 Critical bug (lines 7–23):** `useState<StarProfile>`, `setDetailLoading`, `setModalVisible` and `handleStarPress` are declared at **module scope, outside any component**. Calling hooks at module level throws React's *"Invalid hook call"* — as written, **the app crashes at import time**. This is clearly a half-finished "star detail modal" feature (matches the open research note `research/notes/Phase-1/step-8: star identity & metadata.md`): the API function `getStarByHip` and types exist, the handler exists, but no modal/component ever renders, and the code was pasted above the component definition instead of inside it.
- **Minor:** inconsistent formatting (`const [data,setData]=useState...` vs. spaced style elsewhere) — no formatter enforced.

### 4. `app/src/` — Only One Subdirectory Exists
- `src/services/` is the **only** directory. There are **no** `screens/`, `components/`, `navigation/`, `hooks/`, `utils/`, `types/`, or `constants/` directories. All UI/logic lives in `App.tsx`.

### 5. `app/src/services/api.ts` — API Client
- **Responsibility:** typed HTTP access to the backend; the sole frontend↔backend integration point.
- **Contents:**
  - `BASE_URL` — `Platform.select({ android: "http://10.0.2.2:8000", default: "http://localhost:8000" })` (Android emulator loopback). Hardcoded dev URL; **no env-var support, no production URL**.
  - Types: `Star` (sky result), `VisibleStarsResponse`, `StarProfile` (mirrors backend Pydantic `Star` — manually duplicated, will drift).
  - Functions: `healthCheck()`, `getVisibleStars(lat, lon, limit)`, `getStarByHip(hipId)` — all raw `fetch`, JSON parse, throw generic `Error` on `!response.ok`.
- **Gaps:** no timeouts/`AbortController`, no retry, no typed error class (HTTP status lost), no query-string encoding, no response validation (trusts backend shape), `healthCheck` is exported but **never used anywhere**.

### 6. `app/app.json` — Expo Config
- Stock template: name/slug `"app"`, portrait, iOS tablet support, Android adaptive icon, web favicon.
- **Notable:** `userInterfaceStyle: "light"` directly contradicts the app's dark star-map theme (status bar is `style="light"` on `#070b14` background). No `scheme` (deep linking), no `plugins`, no `newArchEnabled` flag, no `permissions` (none needed yet).

### 7. `app/tsconfig.json`
- Extends `expo/tsconfig.base` with `"strict": true` — good baseline; but the module-scope hooks in `App.tsx` show type-checking isn't being run in CI/scripts.

### 8. `app/assets/`
- Standard Expo boilerplate only: `icon.png`, `splash-icon.png`, `favicon.png`, three Android adaptive-icon layers. No app-specific imagery.

### 9. Tests
- **None.** No test files, no jest/vitest config, no testing-library, no test script.

### 10. Agent Docs
- `app/CLAUDE.md` and `app/AGENTS.md` exist at `app/` root (AI-assistant instruction files, not runtime code).

---

## State Management Approach
Local `useState`/`useEffect` only — no Redux/Zustand/Jotai, no context, no react-query/SWR. Server state is fetched ad-hoc inside the component; every refresh re-fetches from scratch.

## API Communication Approach
Raw `fetch` in a thin typed service module. No axios, no interceptors, no auth, no caching, no offline support. Backend base URL resolved per-platform for local dev only.

## Authentication / Local Storage
**None present** — no auth flow, no secure storage, no AsyncStorage/MMKV. (Consistent with the project phase; nothing in the backend requires auth either.)

## Frontend–Backend Integration Currently Implemented
- `GET /health` → client function exists but unused.
- `GET /sky/visible?latitude&longitude&limit=50` → fully wired: list, refresh, error/retry.
- `GET /stars/{hip_id}` → client function + types exist; **UI never calls it successfully** (the calling code is the broken module-scope block).

---

## A. Current Frontend Architecture Summary
A single-screen Expo (SDK 57 / RN 0.86 / React 19) app in TypeScript-strict. Architecture is "monolith component + one API module": `index.ts` → `App.tsx` (all UI, state, fetching, styles) → `src/services/api.ts` (typed fetch). Web is enabled via `react-native-web`. No navigation, no shared state, no design system, no tests, no lint/format tooling.

## B. Navigation Structure
**None.** Single screen (`App`), no `@react-navigation`, no expo-router. The planned star-detail "modal" is implemented as state (`modalVisible`) rather than a route — and is currently broken/unused.

## C. Frontend Data Flow
```
app launch → App.useEffect → fetchStars()
  → api.getVisibleStars(18.5204, 73.8567, 50)   [hardcoded Pune coords]
  → raw fetch → BASE_URL (10.0.2.2 / localhost :8000)
  → { latitude, longitude, count, stars[] } typed as VisibleStarsResponse
  → useState → FlatList renders star cards (brightness order)
pull-to-refresh → fetchStars(true) → same path
star press → (intended) getStarByHip → StarProfile → modal  ← NOT WIRED (module-scope hook crash)
```

## D. Frontend–Backend Communication
Direct `fetch` to FastAPI at `http://localhost:8000` (device: `10.0.2.2` for the Android emulator). JSON only, no auth headers, no timeout, generic `Error` messages surfaced in a Retry UI. CORS on the backend is wide open, so dev works; but there is no production URL strategy (env config) on either side.

## E. Important Dependencies
| Dependency | Purpose |
|---|---|
| `expo ~57` | SDK, tooling, `registerRootComponent` |
| `react-native 0.86.2` / `react 19.2.3` | UI runtime |
| `react-native-web` + `react-dom` | browser target |
| `expo-status-bar` | status bar styling |
| `typescript ~6` (dev) | strict typing |

Nothing else — no navigation, state, animation, maps/sky-chart, sensors, or testing libraries.

## F. Potential Architectural Issues
1. **🔴 Launch-blocking bug:** module-scope `useState`/async handler in `App.tsx` (lines 7–23) throws *"Invalid hook call"* on import — the app cannot start as committed. Evidence of an unfinished step-8 merge.
2. **Monolith component:** 316-line `App.tsx` mixes fetching logic, business heuristics (`isProminent`), presentation, and 30+ styles — no separation of concerns; adding screens means copying this pattern.
3. **Missing abstractions:** no screens/components/hooks/utils/types directories; no custom `useVisibleStars` hook; no theme; star-detail never extracted into a component.
4. **Duplicate type definitions:** `StarProfile`/`Star` in `api.ts` hand-mirror backend Pydantic models — drift risk (backend already has richer `Star`; frontend copies are partial).
5. **Hardcoded location & URL:** Pune coordinates and dev `BASE_URL` baked in; no `expo-location`, no env handling (no `EXPO_PUBLIC_*` vars), so the app can't ship or adapt to real users.
6. **Error handling gaps in api.ts:** no status codes preserved, no timeout, no network-vs-HTTP distinction; `console.warn` in the (broken) press handler; unused `healthCheck`.
7. **Config mismatch:** `userInterfaceStyle: "light"` vs. dark UI; no deep-linking scheme; no lint/format/CI/typecheck scripts (which is *how* the hook bug survived).
8. **No tests** and no test infrastructure at all.
9. **State-management ceiling:** ad-hoc fetch/refresh state is fine for one screen, but there's no pattern ready for the roadmap's sky-view/AR features (sensor data, cached catalog, settings).

## G. Recommended Next Frontend Development Step
**Fix the crash and complete the step-8 star-detail feature properly:**
1. Move `selectedStar/detailLoading/modalVisible` and `handleStarPress` **inside `App()`** (or better, into a `useStarProfile()` hook) so the app launches again.
2. Render the detail as a `Modal` component (`src/components/StarDetailModal.tsx`) consuming the already-built `getStarByHip` + `StarProfile`, including loading/error states (the backend 404 path needs UI handling).
3. While restructuring, introduce the missing folders in minimal form: `src/components/` (extract `StarCard`), `src/hooks/` (`useVisibleStars`), `src/utils/` (`getCompassDirection`), `src/types/` — leaving `App.tsx` as pure composition.
4. Add `typecheck`/`lint` scripts (tsc + ESLint with react-hooks plugin — it would have caught the hook bug) before the next feature.

This un-blocks the app, ships the half-finished metadata UX end-to-end, and sets the structural pattern the roadmap's later screens can follow.