<!--
Use this template for a release merge from `dev` to `main`.
Open the PR with: ?template=release.md
-->

## Release

Version: `vX.Y.Z`

## Highlights

<!-- Copy the user-facing entries from the `CHANGELOG.md` section for this version. -->

## Checklist

- [ ] `[Unreleased]` in `CHANGELOG.md` is renamed to this version
- [ ] `package.json` version matches
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass on `dev`
- [ ] The attribution mark and `NOTICE` are intact
- [ ] `docs/` matches the released interfaces

## Merge method

Use **Create a merge commit** so the history of `dev` stays intact.
