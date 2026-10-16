# Hard Rules

> **Status:** Stable · **Verified against code:** 2026-10-16 · **Audience:** contributors and AI agents

These rules are not preferences. Break one and the change is wrong, however well it works. Each rule names where it comes from and how it is enforced, so you know whether a green gate proves you kept it. "Review" means no tool catches a violation; you carry the burden.

If a change seems to need an exception, stop and raise it as a design question. Do not work around the rule.

## Architecture and licensing

| # | Rule | Source | Enforced by |
| --- | --- | --- | --- |
| A1 | Terminal Trading ships **no scripting engine** and imports none. `pinets` and `@luxalgo/vela-pinets` never appear in `src/` and never in `dependencies`; the playground may use them as `devDependencies`. | [ADR 0003](../architecture/adr/0003-no-default-scripting-engine.md), [boundaries.md](../architecture/boundaries.md) | Lint (imports in `src/`). A `package.json` entry is review. |
| A2 | The **core is headless**. No `window`, `document`, `history`, or `location` outside the renderer and widget layers. | `AGENTS.md` | Review |
| A3 | Only the **neutral model** crosses a port. No backend-specific type ever does. | [ADR 0001](../architecture/adr/0001-neutral-model-as-cross-layer-currency.md) | Review |
| A4 | The **core never imports the UI kit**, and the **kit never imports engine internals**. Check the table in [module-map.md](../architecture/module-map.md#observed-import-directions) before you add an import. | [ADR 0004](../architecture/adr/0004-enforce-layering-with-import-acl.md) | Review |
| A5 | Only the **composition root** (`TerminalTrading.ts` and the package barrels) imports concrete backends. | [boundaries.md](../architecture/boundaries.md) | Review |
| A6 | **One chart is one market and one time axis.** Panes share the X axis. | `AGENTS.md` | Review |
| A7 | **Extend through public seams**: chart types, renderer layers, native indicators, widget actions, settings sections. A new hole in a layer is a design decision. | `AGENTS.md` | Review |
| A8 | The in-chart **attribution mark stays on by default**. Any example or document that disables it states the equivalent-notice obligation. | `NOTICE`, `AGENTS.md` | Review |

## Data and model

| # | Rule | Source | Enforced by |
| --- | --- | --- | --- |
| D1 | **Time is epoch milliseconds** everywhere in the model. A renderer converts at its own boundary. | [boundaries.md](../architecture/boundaries.md) | Review |
| D2 | The **core owns primary data.** Engines never fetch it; they use the core-supplied `fetchSeries` gateway for secondary series. | [ADR 0002](../architecture/adr/0002-core-owns-market-data.md) | Review |
| D3 | **Never cache the forming bar as closed history.** | [boundaries.md](../architecture/boundaries.md) | Review |
| D4 | The core **never synthesizes one timeframe from another.** A provider may aggregate inside itself; the core asks for the timeframe it needs. | [boundaries.md](../architecture/boundaries.md) | Review |
| D5 | **Series ids come from `stableSeriesId`**, so live ticks patch the existing element and persisted per-series settings survive re-runs. | `src/plugin.ts` | Review |
| D6 | **Capability flags are honest.** The core trusts them and never re-checks; a false flag produces silently wrong output. | [boundaries.md](../architecture/boundaries.md) | Review |
| D7 | **Optional port members degrade to a defined fallback**, never to undefined behavior. | [boundaries.md](../architecture/boundaries.md) | Review |
| D8 | **Routing and id stamping belong to the core.** An engine emits an unrouted model. | [boundaries.md](../architecture/boundaries.md) | Review |

## Front end

| # | Rule | Source | Enforced by |
| --- | --- | --- | --- |
| F1 | **Contributions are data descriptors, never DOM.** | `AGENTS.md`, `src/widget/contributions.ts` | Review |
| F2 | Inside a contribution's `run` or `when`, **take everything from the `WidgetContext` argument.** Never close over an outer widget or chart: the context is rebuilt per call and keeps descriptors correct with several charts. | `AGENTS.md` | Review |
| F3 | A kit component built **before its trigger is in the DOM needs an explicit `host`.** The `closest()` fallback portals to `<body>`, outside the theme variables. | `AGENTS.md` | Review, browser probe |
| F4 | Any authored `display` on a component's root **defeats the `[hidden]` rule.** Pair it with `[hidden] { display: none !important; }`. | `AGENTS.md` | Browser probe |
| F5 | A new UI component follows the four-file skeleton: `controller.ts`, `view.ts`, `styles.ts`, `index.ts`. | [adding-a-ui-component.md](adding-a-ui-component.md) | Review |
| F6 | **Keep logic out of the view.** Controllers hold behavior with no DOM so another view layer can reuse them. | [adding-a-ui-component.md](adding-a-ui-component.md) | Review |
| F7 | **Register contributions at import time, before a widget is constructed.** | `src/widget/contributions.ts` | Review |
| F8 | **Read the active chart through the context getter**, never a captured reference. A shell may replace its chart. | `src/widget/contributions.ts` | Review |

## Reliability

| # | Rule | Source | Enforced by |
| --- | --- | --- | --- |
| R1 | **Handler errors are isolated.** An event handler that throws is logged and never breaks the emitter or other handlers. | `src/core/events/EventBus.ts` | Review |
| R2 | **No engine for a language is an error you can act on**, not a silent empty chart. | [boundaries.md](../architecture/boundaries.md) | Review |
| R3 | **Engine registration is last-wins and affects only indicators created afterward.** | [boundaries.md](../architecture/boundaries.md) | Review |
| R4 | **Provider failures are environmental first.** With the network down, a provider failure is not a bug in the change. | `AGENTS.md` | Judgment |
| R5 | **Pure logic stays pure** (layouts, sync, geometry, models) so it can be unit-tested without a DOM. | `src/workspace/layouts.ts`, `sync.ts` | Review |

## Safety

| # | Rule |
| --- | --- |
| S1 | **Do not expose `server/` on a public network.** It has no authentication and wraps an unofficial upstream. It listens on loopback by default. |
| S2 | **Never commit secrets**: API keys, tokens, `.env` files, or personal data. |
| S3 | **Never name other charting products** in code, comments, commit messages, or docs. Describe a feature by its own behavior. |
| S4 | **Everything in the repo is English.** |
| S5 | **Keep changes inside this repository.** Do not edit a sibling package without the owner's explicit permission. |
| S6 | **Pass host-supplied rich text through the allowlist in `src/ui/sanitize-html.ts`** before it reaches the DOM. |

## Process

| # | Rule |
| --- | --- |
| P1 | A change is done only when **typecheck, lint, test, and build** pass together. |
| P2 | **Reproduce a bug first.** If a unit test can reproduce it, write the failing test before the fix. |
| P3 | Every new behavior has a **positive proof**: a test or browser probe that fails if the feature is absent. |
| P4 | **Do not claim "fixed" or "works" for something you did not run.** Say what you ran and what you did not. |
| P5 | **Present the change and wait for approval before you commit.** Use targeted `git add`. Never commit `.scratchpad/`, build output, or unrelated edits. |
| P6 | **Released changelog sections are immutable.** New entries go under `[Unreleased]`. |
| P7 | **One pull request does one thing.** |

