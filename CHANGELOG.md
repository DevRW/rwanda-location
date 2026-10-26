# Changelog

All notable changes to `@devrw/rwanda-location` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-26

Faster lookups and two edge-case fixes. No method, export or type was removed, renamed or given a
different signature, the dataset is the same as in 1.1.2, and Node.js 14 or later is still
supported.

### Performance

- Every `RwandaLocation` method now answers from lookup tables instead of going through the
  dataset on every call. In 1.1.2 the list methods, `getStatistics()`, `query()` and `search()`
  read all 14,842 rows, and the lookups by code or name read rows up to the first match. The
  tables are built the first time a method needs them and are shared by all instances,
  including `rwandaLocation`. Creating an instance does no work.
- In the benchmark (`npm run bench`, Apple M4, Node.js 24), lookups by code and the calls of a
  cascading form are roughly 80 to 350 times faster after warm-up, and `search()` without a
  limit about 4 times faster. `search()` with a `limit` stops as soon as it has enough matches.
  The README has the numbers.
- Costs: the first call that needs a table builds it, which took about 1.5 to 6.5 ms in the same
  benchmark. The tables use about 1.2 MB of extra memory for typical use and about 2.8 MB when
  all of them are built.

### Fixed

- `search()`: a `limit` for which `limit < 0` is true, such as `-1`, now means no limit, like
  `0`. In 1.1.2 the value was passed to `Array#slice()`, so `-1` dropped the last match and a
  limit between -1 and 0 returned no rows.
- `getParentLevel()` and `getChildLevel()`: inherited object keys such as `'__proto__'`,
  `'constructor'` and `'toString'` now return `undefined`, like any other unknown level. In 1.1.2
  they returned members of `Object.prototype`.

### Changed

- `query()` and `search()` still return the dataset rows themselves. This is now documented:
  treat these rows as read-only. A change to a row is seen by every caller, and since 1.2.0 a
  change to a row's code or name fields is not seen by later lookups by code or name, because
  the lookup tables are built once. 1.1.2 rescanned the rows on every call. The same applies to
  the dataset array: do not sort or modify it in place. Rows added or removed, and the common
  in-place reorders such as `sort()` and `reverse()`, are detected and the tables rebuilt; other
  changes may not be seen until the process restarts.
- The JSDoc of every public method, type and utility function was rewritten to describe the
  actual behavior: codes compared with `===`, falsy filters, untrimmed name matching, shared rows
  and in-place sorts.
- `dist/db/locations.json` is minified. Its content is unchanged. The unpacked package is about
  4.9 MB instead of 6.9 MB.
- The JavaScript source maps include the TypeScript sources, which are not shipped as separate
  files.
- New files `dist/lib/internal/LocationIndex.*` hold the lookup tables. They are internal, not
  part of the public API, and can change in any release.
- `package.json`: an explicit `"type": "commonjs"` (the package loads exactly as before),
  `homepage` and `bugs` fields, and a `git+https` repository URL. Theo Okafor moved from the
  `author` string to `contributors`, so `author` is now Jacques Nyilinkindi only.
- Development (contributors only): TypeScript 6.0, Jest 30, ESLint 10 with a flat config and
  Prettier 3. Working on the repository needs Node.js ^20.19, ^22.13 or >=24.

### Added

- `CONTRIBUTING.md`, `SECURITY.md` and an issue form for data corrections.
- Continuous integration on GitHub Actions. It checks formatting, lint and types, runs the tests
  on Node.js 20, 22 and 24, checks the packed file list and the public types against 1.1.2, and
  runs smoke tests and a differential test of the packed tarball against 1.1.2 on Node.js 14,
  16, 18, 20, 22 and 24. Consumer code is type-checked with TypeScript 4.7 to 7.0.
- A release workflow that publishes to npm from GitHub Actions with trusted publishing, which
  adds a provenance statement.
- Tests that compare every method with a frozen copy of the 1.1.2 code, and tests that pin the
  dataset's counts and content.
- Scripts for contributors: `npm run compat`, `check:pack`, `check:api` and `bench`.

### Removed

- From the repository only: the unused 2019 Express API server with its Babel and Mocha setup,
  the old `.eslintrc` files (replaced by `eslint.config.mjs`) and the unused `.npmignore`. None
  of these were part of the npm package.

### Documentation

- README rewritten. It gives the correct village count (14,842) and explains the commonly cited
  figure of 14,837. It describes what `search()` and `query()` return and lists the behavior to
  be aware of (strict code comparison, falsy filters, untrimmed names, shared rows). It also
  covers imports from Node.js ES modules, documents every export and type, lists known data
  issues, and gives measured performance and package size. The version history now lives only
  in this file.
- The examples import `@devrw/rwanda-location`. `examples/basic-usage.ts` imported
  `rwanda-location`, which is not this package.

## [1.1.2] - 2025-10-25

### Changed

- **Docs**: Updated the README to show the MIT license

## [1.1.1] - 2025-10-25

### Changed

- **License**: Changed from Apache-2.0 to MIT license for better compatibility
- Updated package metadata to reflect license change

## [1.1.0] - 2025-10-25

The first version published to npm, under the Apache-2.0 license.

### Added

- Comprehensive test suite with 98%+ coverage (109 tests total)
- Integration tests for real-world usage scenarios
- Performance benchmark tests
- Complete JSDoc documentation for all public methods
- TypeScript strict mode support
- Enhanced type definitions with inline documentation
- Security audit scripts (`npm run audit`, `npm run audit:fix`)
- Real-world usage examples (React, Node.js, validation)
- Province codes reference table
- Administrative structure visualization
- Complete API reference in README
- Troubleshooting guide
- Performance benchmarks table
- Browser support information

### Changed

- Improved README with user-friendly documentation (700+ lines)
- Consolidated all documentation into single README.md
- Enhanced package.json with security improvements
- Updated .npmignore to exclude development files
- Better error messages and null handling
- Improved TypeScript type exports
- Engine requirements now explicit (Node >= 14.0.0, npm >= 6.0.0)

### Fixed

- **Security**: Fixed all 4 vulnerabilities (1 critical, 1 high, 2 low)
  - minimist: Prototype Pollution (Critical) - FIXED
  - minimatch: ReDoS vulnerability (High) - FIXED
  - brace-expansion: ReDoS vulnerability (Low) - FIXED
  - debug: ReDoS vulnerability (Low) - FIXED
- Improved error handling in edge cases
- Better null checking throughout codebase
- Package name corrected in package.json
- Author information restored

### Security

- Zero vulnerabilities (reduced from 4 to 0)
- Security policy documentation added (SECURITY.md). Correction: the file was not part of this
  release; it was added in 1.2.0.
- Comprehensive security audit completed (SECURITY_AUDIT_REPORT.md). Correction: the report was
  not added to the repository or the package.
- Package hardening implemented
- Enhanced .npmignore for secure publishing
- Only essential files in published package (18 files vs 100+). Correction: the package has 21
  files.

### Performance

- Optimized query performance (< 20ms for filtered queries)
- Improved memory efficiency
- Faster location lookups with Map data structures. Correction: lookups still went through the
  dataset on every call, up to the first match, and `Map` was only used by the list methods,
  within a call. Lookup tables came in 1.2.0.
- All operations < 100ms even for 14,837 villages. Correction: the dataset has 14,842 village
  records.

### Documentation

- Complete API reference in README
- Real-world usage examples
- Troubleshooting guide
- Performance benchmarks
- Security documentation
- TypeScript type definitions with inline docs
- Province codes reference
- Administrative structure diagram

### Testing

- 109 tests (up from 57, +91% increase)
- 98.01% statement coverage (up from 93.37%)
- 92.68% branch coverage (up from 75.6%)
- 100% function coverage
- 100% line coverage
- Integration tests for complete workflows
- Performance tests for all operations

## 1.0.0 - 2020

Never published to npm: the first npm release is 1.1.0. This version was an Express API server in
this repository.

### Added

- Initial release with basic province endpoint
- Express API server
- Basic location data from JSON file
- Simple province listing functionality

---

[1.2.0]: https://github.com/DevRW/rwanda-location/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/DevRW/rwanda-location/compare/5a17e50...v1.1.2
[1.1.1]: https://github.com/DevRW/rwanda-location/compare/b1bc239...5a17e50
[1.1.0]: https://github.com/DevRW/rwanda-location/commit/b1bc239
