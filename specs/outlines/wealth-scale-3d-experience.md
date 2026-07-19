# Outline: WealthViz — 3D Wealth Scale Experience

## Context

Empty greenfield repo. Goal: a website that makes money magnitudes *viscerally* graspable — countering the brain's log-scale compression of large numbers. The user configures their finances and physically experiences how their wealth, peer statistics, spending targets, and billionaire wealth compare at one honest linear scale.

## Scope

**In scope:**

- 3D scene (three.js) where money = height of €100-bill stacks at true physical scale: **1 bill = 0.1 mm → €1M = 1 m**. Life-size human figure (1.75 m) as the constant reference.
- Two zones: a close-up **table exhibit** for small amounts (coffee, rent, monthly income, annual spending — rendered as individual bills/coins) and a **wealth plaza** of towers (your wealth, country/age percentiles, FIRE target, €1M, €1B at 1,000 m). Ultra-wealth (~€200B ≈ 200 km) shown as a beyond-the-sky projection with a caption, not geometry.
- **Spending-target slices**: configurable expenses (e.g. roadtrip €8k) highlighted as glowing mm-thin slices on the user's own tower.
- **Guided tour**: waypoint camera path with captions, advanced by click/space; **free-fly** mode (WASD + pointer lock, orbit fallback) toggleable anytime. Tour includes a timed fly-up along the €1B tower face — flight time as the felt unit.
- **Config panel** (Svelte overlay): net monthly income, total wealth, liquid/invested split, annual spending, age, country. Persisted to localStorage. Towers update live. FIRE target defaults to 25× annual spending, overridable.
- **Peer data**: bundled static JSON of net-wealth percentiles (p25/50/75/90/99) by age bracket for Germany, Euro area, and US — curated during implementation from ECB HFCS, Destatis, and Fed SCF, converted to EUR, sources cited in the UI.

**Out of scope:**

- Backend, accounts, persistence beyond localStorage.
- Currency/locale toggle (EUR display only, v1), mobile-first polish (must not break on mobile, but desktop is the target), deployment workflow (static build works anywhere; GH Pages later).
- Broad country coverage beyond DE/EA/US.

## Approach

- **Stack**: Vite + Svelte 5 + TypeScript. Plain three.js driven imperatively from one scene module — no Threlte; the experience is animation-heavy (camera paths, tour choreography) where a declarative wrapper adds friction. Svelte owns UI state (config panel, captions, tour progress); a thin typed bridge (`sceneApi`) pushes config changes into the scene.
- **Layout** (`src/`):
  - `lib/scene/` — `scene.ts` (setup, loop), `towers.ts` (tower construction + slices), `exhibit.ts` (table zone), `tour.ts` (waypoints, camera animation via Catmull-Rom + easing), `controls.ts` (fly/orbit).
  - `lib/data/` — `percentiles.json` (curated dataset + source metadata), `model.ts` (user config types, FIRE math, percentile lookup).
  - `lib/ui/` — `ConfigPanel.svelte`, `Caption.svelte`, `Hud.svelte`.
  - `App.svelte`, `main.ts`.
- **Rendering**: each tower is a single box mesh with a repeating bill-edge texture (no per-bill geometry); close-up exhibit uses instanced bill planes and coin cylinders. Fog + sky gradient for depth; the €1B tower disappears into fog/clouds until the fly-up. A handful of meshes total — no perf risk.
- **Tour beats** (order matters): coffee → rent → monthly income → annual spending → *your* tower → peer percentile towers beside it → spending-target slices on your tower ("the roadtrip is this sliver") → €1M → base of €1B, look up → timed fly-up → €200B projection caption → release into free-fly.

## Key Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Money→form mapping | Height-linear cash stacks, 1 m per €1M, 1:1 human scale | Linear and honest; volume-scaled objects compress perceived ratios ~2.5× |
| Navigation | Guided tour default + free-fly unlock | Narrative arc is what makes it land; exploration preserves the "look around" wish |
| Framework | Svelte 5 + plain three.js (no Threlte) | Imperative camera/tour work fights declarative wrappers; fewer deps |
| Small amounts | Separate close-up table exhibit | At 0.1 mm/bill, daily amounts are invisible at plaza scale — they need their own zone |
| Peer data | Static curated JSON (DE/EA/US), cited | No backend; honest enough to publish; wrangling bounded |
| Ultra-wealth | Caption/projection, not geometry | 200 km of geometry adds nothing over the reveal that it *doesn't fit in the sky* |
| Config persistence | localStorage only | Personal tool first; zero infrastructure |

## Trade-offs

- Optimizing for **visceral honesty and narrative** over feature breadth — one scale, one story, few countries.
- Desktop-first WebGL experience over maximal reach; mobile gets a functional but unpolished view.
- Plain three.js gives control at the cost of more imperative code than a wrapper would need.

## Execution profile

- **Tier:** in-session
- **Rationale:** Scene composition, scale/camera feel, and tour choreography are design judgment exercised *during* implementation — tuning by looking, not translating a spec. Data curation also needs judgment about source quality.
- **Escalation triggers:** n/a (in-session).

## Open Questions

- None — data-source specifics (exact HFCS/SCF tables, EUR conversion rates) are resolved during implementation with citations recorded in `percentiles.json`.
