# Branch naming

Create every branch from `dev` and name it `<type>/<short-kebab-description>`.

| Prefix | Use for | Example |
| --- | --- | --- |
| `feat/` | A new capability | `feat/fib-wedge-drawing` |
| `fix/` | A bug fix | `fix/crosshair-label-clipping` |
| `docs/` | Documentation only | `docs/workspace-persist-option` |
| `refactor/` | A change with no visible effect | `refactor/split-pane-layout` |
| `test/` | Tests only | `test/provider-contract` |
| `chore/` | Tooling, CI, dependencies | `chore/bump-vite` |

Rules:

- Use lowercase letters, digits, and hyphens. Keep the description under five words.
- One branch does one thing, matching the one-thing-per-PR rule.
- Open the pull request against `dev`. Releases move from `dev` to `main`.
