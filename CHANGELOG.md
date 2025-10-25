# Changelog

All notable changes to `@devrw/rwanda-location` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-10-25

### Changed

- **License**: Changed from Apache-2.0 to MIT license for better compatibility
- Updated package metadata to reflect license change

## [1.1.0] - 2025-10-25

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
- Security policy documentation added (SECURITY.md)
- Comprehensive security audit completed (SECURITY_AUDIT_REPORT.md)
- Package hardening implemented
- Enhanced .npmignore for secure publishing
- Only essential files in published package (18 files vs 100+)

### Performance

- Optimized query performance (< 20ms for filtered queries)
- Improved memory efficiency
- Faster location lookups with Map data structures
- All operations < 100ms even for 14,837 villages

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

## [1.0.0] - 2020

### Added

- Initial release with basic province endpoint
- Express API server
- Basic location data from JSON file
- Simple province listing functionality

---

[1.1.1]: https://github.com/DevRW/rwanda-location/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/DevRW/rwanda-location/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/DevRW/rwanda-location/releases/tag/v1.0.0
