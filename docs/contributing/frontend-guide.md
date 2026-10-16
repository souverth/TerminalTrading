# Front-End Guide

> **Status:** Stable · **Verified against code:** 2026-10-16 · **Audience:** contributors and AI agents

This guide covers the browser-facing code: the widget and workspace shells, the UI kit, and the renderer's chrome. It states what to edit, where to edit it, and how to verify the change. It is deliberately narrow. For the full file inventory, read [module-map.md](../architecture/module-map.md). For rules a change must respect, read [hard-rules.md](hard-rules.md). For the core and ports, read [core-guide.md](core-guide.md).

## Pick the layer first

| You are changing… | Edit target |
| --- | --- |
| A button, menu row, or panel that a host or plugin adds | `src/widget/contributions.ts` and the public registrations in `src/plugin.ts` |
| The topbar | `src/widget/topbar.ts`, `topbar-composition.ts` |
| The in-chart status line | `src/widget/statusline.ts`, `statusline-model.ts` |
| A dialog or picker | `src/widget/symbol-picker.ts`, `indicator-picker.ts`, `layout-picker.ts`, `timeframe*.ts` |
| The right-click menus | `src/widget/context-menu-model.ts` (items), `context-menu.ts` (view) |
| A docked side panel | `src/widget/side-panel.ts`, `panel-dock.ts`, `object-tree.ts`, `data-window.ts` |
| The mobile layout | `src/widget/mobile-bar.ts`, `more-drawer.ts`, `*-drawer.ts`, `layout-mode.ts` |
| A keyboard shortcut | `src/ui/keymap.ts` and the place that registers the binding |
| A reusable control | `src/ui/components/<name>/` |
| The grid, links between charts, or dividers | `src/workspace/layouts.ts`, `sync.ts`, `splitters.ts` |
| What a workspace cell owns | `src/workspace/ChartCell.ts` |
| What is saved and restored | `src/state/document.ts`, `src/widget/persist.ts`, `src/workspace/persist.ts` |
| Axes, crosshair, chart settings dialog | `src/renderers/native/chrome/` |
| Drawing interaction and the drawing toolbar | `src/renderers/native/drawings/` |
| The indicator inputs dialog | `src/renderers/shared/InputsUI.ts`, `IndicatorInputsDialog.ts` |

Large files: `TerminalTradingWorkspace.ts` (2420 lines), `ChartCell.ts` (1469), `object-tree.ts` (1404), `SettingsDialog.ts` (1299), `UserDrawingController.ts` (1235). Search them; do not read them top to bottom.

## Split logic from view

Put behavior in a pure module and keep the view thin. The repository already does this, and the pure halves are the ones with unit tests:

- `statusline-model.ts` and `statusline.ts`
- `object-tree-model.ts` and `object-tree.ts`
- `context-menu-model.ts` and `context-menu.ts`
- `layouts.ts`, `sync.ts`, `splitters.ts` (DOM-free)
- every UI-kit `controller.ts` beside its `view.ts`

When you add behavior, ask whether it can live in the model half. If it can, test it there.

## Change recipes

### Add a topbar button or context-menu item

1. Register a `WidgetActionDescriptor` with `registerWidgetAction` (exported from `terminal-trading/plugin`). Give it a stable `id`, a `label` (required, even for an icon-only button), and a `target`.
2. Take everything inside `when` and `run` from the `WidgetContext` argument. Never close over an outer widget or chart.
3. Mount any dialog or tooltip with `ctx.host` as the host.
4. Register at import time, before the widget is constructed.
5. Check the mobile placement (`align` and `mobile`); the topbar is hidden on mobile.

Reference: [plugin-sdk.md](plugin-sdk.md). Tests: `topbar-composition.test.ts`, `widget-*.test.ts`.

### Add a docked side panel

1. Register a `SidePanelDescriptor` with `registerSidePanel`. Its `mount(ctx, body, header)` fills `body` and may return a handle.
2. Choose `overlay` when a column would crush the plot, `resizable` for a user-dragged edge, and `maximizable` for a work surface such as an editor.
3. Open it from code with `ctx.togglePanel(id)`. The dock is exclusive: opening one panel closes the other.

### Add a keyboard shortcut

1. Register a `KeyBindingDescriptor` with the keymap manager: a stable `id` (re-registering replaces it), `keys`, a `label` and `category` for the help panel, and a `scope`.
2. Leave `scope` at its default (`'chart'`) unless the key must work inside a dialog. A dialog pushes its own scope and mutes chart bindings.
3. Do not hard-code a key check in a view. The help dialog lists every registered binding, so a hard-coded key is invisible there.

Tests: `ui-keymap.test.ts`.

### Add a row or tab to the chart settings dialog

1. Declare a `settings` section on the chart type (`registerChartType`, `src/chart-types/registry.ts`).
2. Pick row kinds from [settings-rows.md](../architecture/settings-rows.md). Add a new row kind there, and in the registry, only after discussing it.

Test: `chart-type-registry.test.ts`.

### Add a UI-kit component

Follow [adding-a-ui-component.md](adding-a-ui-component.md): `controller.ts`, `view.ts`, `styles.ts`, `index.ts` in `src/ui/components/<name>/`, then export it from `src/ui/index.ts`. Pass an explicit `host` to any component built before its trigger is in the DOM.

### Add a drawing tool

Follow [adding-a-drawing-tool.md](adding-a-drawing-tool.md). The model lives in `src/core/drawings/`; the interaction and painting live in `src/renderers/native/drawings/`.

### Change what is saved

1. Change the document type in `src/state/document.ts`. Both shells share it.
2. Keep older saved documents loadable.
3. If a plugin owns the state, use `registerStatePersistence` and report changes with `ctx.stateChanged()`.

Tests: `state-persistence.test.ts`, `workspace-persist.test.ts`.

### Change the grid layout, links, or dividers

Edit the pure modules (`layouts.ts`, `sync.ts`, `splitters.ts`) and test them without a DOM. Touch `TerminalTradingWorkspace.ts` only for wiring. Tests: `workspace-core.test.ts`.

## Verification checklist

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass together.
2. A unit test fails without your change (a positive proof). For DOM code, add `// @vitest-environment jsdom` at the top of the test file.
3. Open the playground (`npm run playground`) and exercise the change through the real UI. See [testing.md](testing.md) and [workflow.md](workflow.md#the-playground).
4. Assert what a user sees, not that the element exists:
    - computed `display` is not `none`;
    - the resolved `backgroundColor` inside the themed host is not transparent;
    - the bounding rect is not empty;
    - a real click changes a real count or state.
5. Check an overlay or popup under the **dark and light theme**, and at **mobile width** if you touched mobile chrome.
6. Check a **multi-cell workspace** when the code reads the active chart. A captured chart reference breaks here first.

## Reliability rules for front-end code

These are the front-end subset of [hard-rules.md](hard-rules.md). The IDs match.

- **F1 / F2** — Descriptors are data. Use the `WidgetContext` argument inside `run` and `when`.
- **F3** — Give a kit component an explicit `host` when it is built before its trigger is in the DOM.
- **F4** — Pair any authored root `display` with `[hidden] { display: none !important; }`.
- **F6** — Keep logic out of the view.
- **F7** — Register contributions at import time, before the widget is built.
- **F8** — Read the active chart through the context getter.
- **A2** — Only the renderer and widget layers may touch `window`, `document`, `history`, or `location`.
