## What does this pull request change?

<!-- One or two sentences. Link the issue, for example: Fixes #123 -->

## Type of change

- [ ] Bug fix (no change to documented behavior)
- [ ] New feature (additive: a new method, option or export)
- [ ] Data change (`src/db/locations.json`), with an official source: ...
- [ ] Documentation or examples only
- [ ] Tooling, CI or development dependencies only (the published files do not change)
- [ ] Breaking change (needs a new major version; explain below)

## Compatibility checklist

Existing 1.x users must not break. See CONTRIBUTING.md.

- [ ] No public export, method signature, return shape, result order or `null`/`[]` result
      changed. The CI differential test against the published baseline passes, or every new
      entry in `scripts/compat/allowed-diffs.json` is explained below.
- [ ] Public types are unchanged (`npm run check:api`), or the change is listed in
      `scripts/compat/allowed-api-changes.json` and explained below.
- [ ] `require()`, Node.js ES module imports and TypeScript consumers still work (CI "Runtime"
      and "Types" jobs).
- [ ] The package still runs on Node.js 14 (no newer syntax or APIs in `dist/`).
- [ ] `src/__tests__/oracle/` is unchanged.
- [ ] For data changes: `src/__tests__/data.test.ts` and the README "Data" section are updated.
- [ ] `CHANGELOG.md` has an entry under `## [Unreleased]`.
- [ ] The README is updated if behavior, numbers (counts, sizes) or examples changed.

## Intended behavior differences

<!-- For each new allowed-diffs entry: what changes, and why it is safe for existing users. -->

## How was this tested?

<!-- Commands you ran, for example: npm test, npm run compat. -->
