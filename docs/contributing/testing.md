# Testing

Vela™ is tested in **two tiers**. They cover different things; a change that affects what users see needs both.

- **Tier 1 — unit tests** (vitest, `npm test`): the bulk of the suite. Pure logic, port contracts, and DOM behavior under jsdom.
- **Tier 2 — browser verification** (the playground): the real renderer, the real widget chrome, and the real event paths.

## Tier 1 — unit tests

Run them once with `npm test`, or in watch mode with `npm run test:watch`. Tests live in `test/`. The default environment is Node. A test that needs a DOM opts in with a `// @vitest-environment jsdom` docblock at the top of the file.

They cover:

- **Pure logic** — the deterministic pieces of the core that need no renderer and no browser.
- **The port contracts** — what each layer promises across the `MarketDataFeed`, `ScriptingEngine`, and `IChartRenderer` boundaries.
- **UI-kit and widget behavior** — components and widget chrome mounted under jsdom.

### Drive the system through the injection seams

The ports exist so the core runs without real backends. Substitute test doubles through the dependency-injection constructor:

- a **fake renderer** instead of the native one,
- an **injected feed** (`deps.dataFeed`) or a fake `DataProvider` that hands the core the bars a scenario needs,
- a **fake engine** implementing `ScriptingEngine`, since Vela™ bundles none.

A double only has to honor the contract. It never needs backend-specific behavior, because the only thing crossing a port is the neutral model.

### Write a test that fails without the feature

A green suite proves nothing about a new capability. For every new behavior, add a test that would **fail if the feature were absent**. For a bug fix, write the failing test first, then fix.

### Known slow tests

Workspace and drawing-settings tests mount whole workspaces and can exceed vitest's default 5-second timeout when the whole suite runs in parallel. A timeout with no assertion failure is a load problem, not a regression: re-run the file on its own (`npx vitest run test/<file>`) before you suspect your change.

## Tier 2 — browser verification

Anything you need to *see* or *click* belongs here: a renderer change, a drawing tool, a widget interaction.

1. Run `npm run playground` (`http://localhost:5190`). It imports Vela™ straight from `src/`, so edits are live on save, with no build step.
2. Exercise the change end to end through the UI.
3. Assert what a user would see, not that an element exists:
    - **Computed visibility** — `display`, resolved `backgroundColor` inside the themed host, and a non-empty bounding rect.
    - **Real interaction** — click through the UI; check that counts and states actually change.
    - **Portals** — an element that renders outside the theme variables passes a presence check and still looks wrong.

Provider data comes from the public Binance API, which needs no key. If the network is unavailable, provider failures are environmental, not bugs. See [workflow.md](./workflow.md#the-playground) for the pages and which servers each one needs.

Browser verification is manual today. State in your pull request what you checked and what you did not.

## Which tier for which change

- Logic in the core, or a port contract: **Tier 1** with the matching test double.
- A DOM component or widget behavior: **Tier 1** under jsdom, then **Tier 2** to confirm it renders.
- Anything visual or interactive: **Tier 2**.

For isolating *why* a test or a render is wrong, see [debugging.md](./debugging.md).
