# Contributing

Thank you for helping with `@devrw/rwanda-location`. This guide covers the development setup, the
checks a change must pass, the compatibility rules for 1.x, data corrections and the release
process.

## Development setup

You need Node.js `^20.19`, `^22.13` or `>=24` to work on the repository, because ESLint 10
requires it. `.nvmrc` selects Node.js 24, so `nvm use` picks it up. The published package itself
still supports Node.js 14 and later, and CI tests the packed tarball on Node.js 14, 16, 18, 20, 22
and 24.

```bash
git clone https://github.com/DevRW/rwanda-location.git
cd rwanda-location
npm ci
```

`npm ci` also builds `dist/`, through the `prepare` script.

The library code is in `src/`: `src/lib/RwandaLocation.ts` (the class), `src/lib/utils.ts` (the
utility functions), `src/types/index.ts` (the types) and `src/lib/internal/` (private lookup
tables). The dataset is `src/db/locations.json`.

## npm scripts

| Script                 | What it does                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`        | Deletes `dist/`, compiles `src/` with `tsconfig.json`, then minifies `dist/db/locations.json`.                                        |
| `npm test`             | Runs the Jest tests with coverage. The coverage thresholds are in `jest.config.js`.                                                   |
| `npm run test:watch`   | Runs Jest in watch mode.                                                                                                              |
| `npm run typecheck`    | Type-checks `src/` with the tests (`tsconfig.test.json`) and `examples/` (`tsconfig.examples.json`).                                  |
| `npm run lint`         | Runs ESLint on the whole repository.                                                                                                  |
| `npm run lint:fix`     | Runs ESLint and applies its automatic fixes.                                                                                          |
| `npm run format`       | Formats the repository with Prettier.                                                                                                 |
| `npm run format:check` | Checks the formatting without changing files.                                                                                         |
| `npm run check:pack`   | Checks that the packed tarball contains exactly the expected files. Build first.                                                      |
| `npm run check:api`    | Compares the public `.d.ts` files in `dist/` with the published baseline. Build first. Needs network access.                          |
| `npm run compat`       | Copies the working tree to a temporary directory, builds and packs it there, and runs the compatibility checks. Needs network access. |
| `npm run bench`        | Builds, then compares the speed of `dist/` with the frozen 1.1.2 code.                                                                |
| `npm run audit`        | Runs `npm audit`.                                                                                                                     |
| `npm run audit:fix`    | Runs `npm audit fix`.                                                                                                                 |

Two scripts run on their own: `prepare` builds `dist/` after `npm install` and `npm ci`, and
`prepublishOnly` runs `typecheck`, `test` and `build` before an `npm publish` from the repository
folder. Releases publish the tarball that CI built, which runs no lifecycle scripts.

`npm run compat` accepts options after `--`: `--node <binary>` to also run the runtime checks on
another Node.js binary (repeatable), `--types <version>` to also type-check consumer code with that
TypeScript version (repeatable), `--tarball <file>` to test an existing tarball, and `--keep` to
keep the temporary directory. Without `--types`, `npm run compat` skips the consumer type checks
that the Types job in CI runs. `BASELINE=x.y.z npm run compat` compares against another published
version.

The package has no runtime dependencies, so `npm audit` findings concern the development tools
only.

## What CI checks

`.github/workflows/ci.yml` runs on every pull request and on every push to `main`:

| Job                     | What it checks                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format, lint, typecheck | `npm run format:check`, `npm run lint` and `npm run typecheck` on Node.js 24.                                                                                                                                                        |
| Test                    | `npm test` on Node.js 20, 22 and 24.                                                                                                                                                                                                 |
| Package                 | Builds and packs the tarball once, then runs `check:pack`, `check:api`, [publint](https://publint.dev) and [Are the Types Wrong](https://arethetypeswrong.github.io). The tarball is kept for the jobs below.                        |
| Runtime                 | Installs the tarball next to the published baseline on Node.js 14, 16, 18, 20, 22 and 24, then runs the CommonJS and ES module smoke tests (`scripts/compat/smoke.cjs`, `smoke.mjs`) and the differential test (`differential.cjs`). |
| Types                   | Type-checks consumer code against the tarball with TypeScript 4.7, 5.0, 5.9, 6.0 and 7.0, in every module resolution mode each version supports.                                                                                     |
| CI result               | Passes only when every job above passed.                                                                                                                                                                                             |

The differential test calls thousands of method and argument combinations on the candidate and
on the published baseline, and fails on any difference that is not listed as intended.

## Compatibility rules

Version 1.x has no breaking changes. Code written for 1.1.2 must keep working and keep getting
the same results. That includes the behavior described under "Behavior notes" in the README:
codes compared with `===`, falsy filters meaning "no filter", untrimmed name matching, the shared
rows returned by `query()` and `search()`, the CommonJS entry point and the Node.js ES module
default import.

- New features are additions: new methods, new optional parameters, new exports.
- An intended behavior change must be listed in `scripts/compat/allowed-diffs.json`, with the
  exact check ids from `differential.cjs`, a description, `baselineBelow` set to the release that
  introduces the change, and the expectation the candidate must meet. Explain it in the pull
  request and in the CHANGELOG. To print every check id, create a consumer directory with
  `node scripts/compat/setup-consumer.cjs <tarball> <dir>`, then run
  `node scripts/compat/differential.cjs <dir> --list`.
- An intended change to a public type must be listed in `scripts/compat/allowed-api-changes.json`
  with the sha256 that `npm run check:api` prints, and a reason.
- Never edit `src/__tests__/oracle/`. It is a frozen copy of the published 1.1.2 code that the
  tests compare against.
- Do not add an `exports` map, an ES module build or a `"type": "module"` field in 1.x. Each of
  them changes how existing imports resolve.
- The `dist/lib/internal/` folder is private and may change freely. Do not document paths under
  `dist/`.

## Data corrections

To report a wrong or missing name or code, open an issue with the
[data correction form](https://github.com/DevRW/rwanda-location/issues/new?template=data-correction.yml).
Include the codes concerned and an official source, such as a notice in the Official Gazette or a
publication of NISR, MINALOC or the district.

Users store and filter by the current names and codes, so in 1.x existing names and codes are not
changed in place. A pull request that changes `src/db/locations.json` must also:

- update the expected counts and hash in `src/__tests__/data.test.ts`;
- describe the change in `CHANGELOG.md`;
- update the counts and the "Data" section of the README if they change.

## Pull requests

1. Create a branch from `main` and keep the change focused.
2. Run `npm run format:check`, `npm run lint`, `npm run typecheck` and `npm test`. For changes
   that can affect the package (anything in `src/`, `package.json` or the build), also run
   `npm run build`, `npm run check:pack`, `npm run check:api` and `npm run compat`.
3. Add your change to `CHANGELOG.md` under an `## [Unreleased]` heading at the top (create it if
   it is missing).
4. Update the README if behavior, numbers or examples change.
5. Fill in the pull request template.

## Release process

For maintainers.

1. On `main`, set `version` in `package.json` and move the `[Unreleased]` notes in `CHANGELOG.md`
   to a heading for the new version and date. Make sure CI is green for that commit.
2. On GitHub, publish a release whose tag is `v<version>` (for example `v1.2.0`) on that commit.
   Create the release by hand: a release created by a workflow with the default `GITHUB_TOKEN`
   does not start other workflows.
3. `.github/workflows/release.yml` then checks that the tag matches the version in
   `package.json` and that this version is not on npm yet, runs every CI job, and publishes the
   tarball that CI built and tested with `npm publish`, using npm trusted publishing. npm adds a
   provenance statement. A version with a prerelease suffix, such as `1.3.0-beta.1`, is
   published under the npm dist-tag `next` instead of `latest`.

One-time setup on npmjs.com, before the first release from the workflow (no npm token is stored
in GitHub):

1. In the settings of `@devrw/rwanda-location`, under "Trusted publisher", choose GitHub Actions
   and fill in: organization `DevRW`, repository `rwanda-location`, workflow filename
   `release.yml`. The fields are case-sensitive. The environment name is optional; if you fill
   it in, it must be `npm`, the environment of the publish job.
2. Under allowed actions, tick "npm publish". Configurations created after 2026-09-03 otherwise
   allow only `npm stage publish`.
3. Publish once within 2 days, or npm expires the new configuration.
4. Then set "Publishing access" to "Require two-factor authentication and disallow tokens".
   Trusted publishing keeps working; long-lived tokens stop working.

After a release has shipped:

1. Set `DEFAULT_BASELINE` in `scripts/compat/lib.cjs` to the new version (for example `'1.2.0'`).
   CI, `npm run compat` and `check:api` then compare against it.
2. Remove the entries of that release from `scripts/compat/allowed-diffs.json` and
   `scripts/compat/allowed-api-changes.json`. They no longer apply once the baseline includes
   them.
3. Run `npm run compat` and commit.
