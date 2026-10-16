# Core Guide

> **Status:** Stable · **Verified against code:** 2026-10-16 · **Audience:** contributors and AI agents

This guide covers the headless core, the ports, the neutral model, and the data layer. It is the counterpart of [frontend-guide.md](frontend-guide.md). For the file inventory, read [module-map.md](../architecture/module-map.md). For the rules a change must respect, read [hard-rules.md](hard-rules.md).

## Pick the target first

| You are changing… | Edit target |
| --- | --- |
| How indicator output is routed, stamped, or patched | `src/core/engine/EngineOrchestrator.ts` (2889 lines; search it) |
| The live tick path | `src/core/engine/LiveSession.ts` |
| A port contract | `src/core/ports/` — raise a design question first |
| The neutral model | `src/core/model/` |
| Public chart options | `src/core/options.ts` |
| A public control (`chart.data`, `chart.renderer`, …) | `src/core/*Control.ts` |
| User drawings (model, store, history) | `src/core/drawings/` |
| A native indicator | `src/core/native-indicators/` |
| A price style (chart type) | `src/chart-types/`, `src/core/price-styles/` |
| Timeline marks | `src/core/marks/` |
| Provider routing and the cache | `src/data/MultiProviderFeed.ts`, `ProviderRegistry.ts`, `CachingDataFeed.ts`, `BarStore.ts` |
| A bundled provider | `src/data/providers/<name>/` |
| The default wiring | `src/TerminalTrading.ts`, `src/index.ts` |

Large files: `EngineOrchestrator.ts` (2889) and `IChartRenderer.ts` (485).

## Change recipes

### Add or change a data provider

Follow [adding-a-data-provider.md](adding-a-data-provider.md). Implement `DataProvider` (`getBars` is the only required method) and register it with `chart.data.registerProvider`. A bundled provider also needs an entry in `tsup.config.ts` and a subpath in `package.json`. Tests: `<name>-provider.test.ts` and `multi-provider-feed.test.ts`.

### Change the neutral model

1. Edit the type in `src/core/model/`.
2. Update every producer and consumer: the orchestrator, the native renderer, and `src/plugin.ts` if the type is public.
3. Keep time in epoch milliseconds and series ids from `stableSeriesId`.
4. A model change is visible to every plugin and engine author. Treat it as a design-first change.

### Change a port

1. Open an issue first. A port is a public contract with semver consequences.
2. Keep new members optional, with a defined fallback when a backend omits them.
3. Update the contract tests that drive the core through fakes, and the matching guide ([adding-a-renderer.md](adding-a-renderer.md), [adding-an-engine.md](adding-an-engine.md), or [adding-a-data-provider.md](adding-a-data-provider.md)).

### Add a native indicator

Register it with `registerNativeIndicator` (see `src/core/native-indicators/NativeIndicator.ts` and the built-ins under `classics/`). It computes in the core and draws through renderer layers. Do not add an engine dependency.

### Add a price style

Register a chart type with `registerChartType` (`src/chart-types/registry.ts`). A style is a bar transform plus optional settings; `src/core/price-styles/heikin-ashi.ts` is the small reference.

### Change the live data path

Read `src/core/engine/LiveSession.ts` and the "live streaming path" section of [data-flow.md](../architecture/data-flow.md). The core takes the streaming path only when the chart is live, the script is not viewport-dependent, and the engine declares streaming.

## Verification checklist

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass together.
2. Drive the core with a **fake renderer**, a **fake feed**, and a **fake engine** (see [testing.md](testing.md)). Assert on the neutral model that reaches the renderer.
3. A test fails without your change.
4. If the change affects what a user sees, check it in the playground as well.
5. Check the optional-member fallbacks: remove an optional method from a fake and confirm the core still behaves.

## Reliability rules for core code

These are the core subset of [hard-rules.md](hard-rules.md). The IDs match.

- **A2** — The core is headless: no `window`, `document`, `history`, or `location`.
- **A3 / A5** — Only the neutral model crosses a port, and only the composition root imports a concrete backend.
- **D1** — Time is epoch milliseconds.
- **D2** — The core owns primary data; engines use `fetchSeries` for secondary series.
- **D3** — The forming bar is never cached as closed history.
- **D4** — The core never builds one timeframe from another.
- **D5** — Series ids come from `stableSeriesId`.
- **D6 / D7** — Capability flags are honest, and optional members have a defined fallback.
- **R1** — An event handler that throws never breaks the emitter.
- **R2 / R3** — A missing engine raises an actionable error, and re-registering an engine affects only later indicators.
