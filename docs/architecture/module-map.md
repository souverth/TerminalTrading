# Module Map

> **Status:** Stable · **Verified against code:** 2026-10-16 · **Audience:** contributors and AI agents

This page answers one question: **which file do I open to change X?** It lists every directory under `src/`, what it owns, its entry files, which directories it imports, and which tests cover it. For the concepts behind the layers, read [overview.md](overview.md) and [modules.md](modules.md). For the rules a change must respect, read [../contributing/hard-rules.md](../contributing/hard-rules.md).

File roles come from each file's header comment. A role marked *(inferred)* has no header; confirm it before you rely on it. Line counts in parentheses mark files so large that you should search them instead of reading them top to bottom.

## Observed import directions

The table lists which top-level directories each one imports, measured from the actual `import` statements on the verification date. Only the `pinets` ban is lint-enforced; the rest is convention you keep by reading this table before you add an import.

| Directory | Imports from | Notes |
| --- | --- | --- |
| `core` | `core`, `data`, `chart-types` | The orchestrator reads `data/timeframe` and `data/ProviderRegistry`. It imports no renderer, widget, workspace, or UI kit. |
| `data` | `core`, `data` | Providers import only the ports and model from `core`. |
| `chart-types` | `core`, `chart-types` | The chart-type registry. |
| `state` | nothing | One serializable document type shared by both shells. |
| `ui` | `core`, `ui` | The kit never imports a renderer, the widget, or engine internals. |
| `renderers` | `core`, `chart-types`, `ui`, `renderers` | Renderer chrome reuses the UI kit. |
| `widget` | everything above, and `TerminalTrading` | The shell composes all layers from above. |
| `workspace` | everything above, and `TerminalTrading` | Same as `widget`; it also imports `widget`. |

If a new import breaks one of these rows, treat it as a design question and raise it before you write the code.

## Root files

| File | Role |
| --- | --- |
| `src/TerminalTrading.ts` (444) | The `TerminalTrading` class: the composition root that wires the defaults. |
| `src/index.ts` | Public entry point and default backends. Only this file and the other barrels import concrete backends. |
| `src/plugin.ts` | The plugin SDK barrel (`terminal-trading/plugin`): chart types, native indicators, renderer layers, widget actions, side panels, state persistence, and the engine port types. |
| `src/browser.ts` | Entry of the browser globals build (`window.TerminalTrading`). |

## `src/core` — headless core

| Path | Role |
| --- | --- |
| `engine/EngineOrchestrator.ts` (2889) | The single orchestrator: holds the feed, the engines, and the renderer, routes output to panes, and stamps ids. |
| `engine/IndicatorRegistry.ts`, `IndicatorHandleImpl.ts`, `LiveSession.ts`, `DrawingSeriesService.ts`, `inspect.ts` | Indicator bookkeeping, per-indicator handles, the live tick subscription, drawing series, and element counts. |
| `ports/` | The contracts: `MarketDataFeed.ts`, `DataProvider.ts`, `ScriptingEngine.ts`, `IChartRenderer.ts` (485). Change a port only after a design discussion. |
| `model/` | The neutral model: `ohlcv`, `series`, `scene`, `patch`, `inputs`, `identity` (stable ids), `drawings`, `strategy`, `trades`, `time`. |
| `drawings/` | User drawings: `DrawingStore`, `DrawingController`, `DrawingHistory`, `registry`, `schema`, `toolbar`, plus one file per tool in `types/` (88 files). |
| `native-indicators/` | The native indicator registry (`NativeIndicator.ts`) and the built-ins: `classics/`, `volume/`, `vpvr/`. |
| `marks/` | Timeline marks: `MarksController`, model types, group visibility. |
| `price-styles/` | Bar transforms for price styles (`BarTransform.ts`, `heikin-ashi.ts`). |
| `events/` | `EventBus.ts` (handler errors are isolated) and the chart event types. |
| `DataControl.ts`, `RendererControl.ts`, `DrawingsControl.ts`, `MarksControl.ts`, `PanesControl.ts`, `ReplayControl.ts` | The public control surfaces: `chart.data`, `chart.renderer`, `chart.drawings`, `chart.marks`, `chart.replay`. |
| `options.ts` (401) | The public chart options. |
| `palette.ts`, `tokens.ts`, `theme.ts`, `color.ts`, `icons.ts`, `timezones.ts` | Shared design data with no DOM: semantic palette, design tokens, the reference dark theme, color math, the icon registry, the timezone catalog. |
| `renderer-defaults.ts`, `visible-range.ts`, `script-run.ts`, `IndicatorHandle.ts` | Plugin-contributed renderer defaults, named visible ranges, the reason a script ran, per-indicator events. |
| `util/` | `wall-clock.ts` (a once-per-second pulse), `types.ts`. |

Tests: `orchestrator.test.ts`, `ui-*.test.ts` for kit pieces, plus topic files under `test/` named after the feature.

## `src/data` — market data

| File | Role |
| --- | --- |
| `MultiProviderFeed.ts` | The default feed: routes symbols to registered providers and wraps the cache. |
| `ProviderRegistry.ts` | The provider registry and symbol resolution (`provider:SYMBOL`). |
| `CachingDataFeed.ts`, `BarStore.ts` | The closed-bar cache. The forming bar is never stored as closed history. |
| `timeframe.ts`, `symbol-groups.ts`, `symbol-base.ts` | Timeframe names to milliseconds, futures-root groups, base-asset heuristic. |
| `providers/binance/`, `providers/coinbase/`, `providers/hyperliquid/` | Bundled providers, each with its own request gate. They import only the ports and the model. |

Tests: `caching-data-feed.test.ts` and the provider tests under `test/`.

## `src/chart-types` and `src/state`

| Path | Role |
| --- | --- |
| `chart-types/registry.ts` (376) | The chart-type registry: the extension seam for price styles, including their settings sections and rows. |
| `chart-types/builtins.ts` | Built-in chart types, registered through the same public registry a plugin uses. |
| `state/document.ts` | The one serializable shell-state document that the widget and the workspace share. |

Tests: `chart-type-registry.test.ts`, `state-persistence.test.ts`.

## `src/renderers` — drawing

| Path | Role |
| --- | --- |
| `native/NativeRenderer.ts` (4168) | The native renderer, the only bundled backend. |
| `native/capabilities.ts`, `native/layers.ts` | The renderer's declared capabilities, and the public renderer-layer registry. |
| `native/core/` | Viewport, coordinates, scheduling, input: `ViewportState`, `CoordinateSystem`, `SceneGraph`, `Scheduler`, `InputController`, `KeyboardController`, `autoscale`, `chartConfig` (the serializable style config). |
| `native/backend/` | `IRenderBackend.ts` (the seam), `WebGL2Backend.ts`, `Canvas2dBackend.ts`, candle level of detail. |
| `native/chrome/` | Axes, ticks, crosshair, settings dialog (`SettingsDialog.ts`, 1299), attribution mark, timeline-mark lane. |
| `native/drawings/` | The drawing layer: `UserDrawingController`, `DrawingPainter` (1858), `DrawingToolbar`, the settings panel and popup, hit testing, keys. |
| `shared/` | Renderer chrome used by more than one backend: the inputs UI (`InputsUI.ts`, `IndicatorInputsDialog.ts`), tables, trade markers, PNG export raster. |

## `src/ui` — component kit

| Path | Role |
| --- | --- |
| `index.ts` | The `terminal-trading/ui` barrel. |
| `components/<name>/` | One folder per component with `controller.ts`, `view.ts`, `styles.ts`, `index.ts`. Fifteen components today; see [adding-a-ui-component.md](../contributing/adding-a-ui-component.md). |
| `keymap.ts` | `KeymapManager`: shortcuts are data descriptors. |
| `tokens.ts`, `styles.ts`, `zag.ts`, `surface-events.ts`, `surface-exit.ts`, `sanitize-html.ts` | Design tokens, style injection, the controller-to-view bridge for Zag machines, open and close announcements, exit animation, the HTML allowlist for host rich text. |

Tests: `ui-field.test.ts`, `ui-form-primitives.test.ts`, `ui-keymap.test.ts`, and the other `ui-*` files.

## `src/widget` — the single-chart shell

| Path | Role |
| --- | --- |
| `contributions.ts` (601) | The descriptor seam: widget actions, attachments, side panels, legend actions and callouts, state-persistence handlers, symbol ranking. Defines `WidgetContext`. |
| `topbar.ts`, `topbar-composition.ts` | The topbar and the host's declarative control of its entries. |
| `statusline.ts`, `statusline-model.ts` | The in-chart status line and its pure model. |
| `object-tree.ts` (1404), `object-tree-model.ts`, `data-window.ts` | The docked object tree and data window. The model files are pure. |
| `side-panel.ts`, `panel-dock.ts` | The docked side-panel shell and the dock that owns the panel column. |
| `symbol-picker.ts`, `indicator-picker.ts`, `layout-picker.ts`, `timeframe*.ts`, `bottombar.ts` | Pickers and the bottom bar. |
| `context-menu.ts`, `context-menu-model.ts`, `cell-controls.ts` | Right-click menus (descriptors in the model file) and per-cell controls. |
| `mobile-bar.ts`, `more-drawer.ts`, `*-drawer.ts`, `drawing-pill.ts`, `layout-mode.ts` | The mobile chrome and the size class that selects it. |
| `shell-options.ts`, `indicators.ts`, `persist.ts`, `history.ts` | Options shared by both shells, the indicator manifest, shell-state storage, the unified undo and redo timeline. |
| `TerminalTradingWidget.ts` | **Deprecated** wrapper over `TerminalTradingWorkspace`. |

Tests: `widget-*.test.ts`, `topbar-composition.test.ts`.

## `src/workspace` — the multi-chart shell

| File | Role |
| --- | --- |
| `TerminalTradingWorkspace.ts` (2420) | The grid of cells behind one shared chrome. |
| `ChartCell.ts` (1469) | One cell: a stable identity plus its chart. |
| `layouts.ts`, `sync.ts`, `splitters.ts`, `screenshot.ts` | Pure layout, link, divider, and screenshot geometry (DOM-free, unit-testable). |
| `WorkspaceReplay.ts` | Bar replay across all cells on one clock. |
| `context.ts`, `persist.ts` | The workspace's `WidgetContext` and its storage seam. |

Tests: `workspace-*.test.ts`.

## Outside `src/`

| Path | Role |
| --- | --- |
| `playground/` | Development pages and helpers. Imports Terminal Trading from `src/`. Never referenced by library code. |
| `server/` | A local market-data server for the playground. Not part of the published package and imports nothing from `src/`. |
| `test/` | The vitest suite. |
| `docs/` | This documentation. |
