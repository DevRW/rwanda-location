# Security policy

## Supported versions

| Version              | Supported |
| -------------------- | --------- |
| Latest 1.x release   | Yes       |
| Earlier 1.x releases | No        |
| 1.0.0 (never on npm) | No        |

Security fixes are released as a new patch version of the latest 1.x release. Releases in 1.x
make no breaking changes, so upgrading within 1.x is safe.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability. Send an email to
[info@jnkindilogs.xyz](mailto:info@jnkindilogs.xyz) with:

- a description of the problem and its impact;
- the affected version;
- steps or code to reproduce it.

Fixes are announced in [CHANGELOG.md](CHANGELOG.md) and in the GitHub release notes.

## Scope

- The package has no runtime dependencies. Installing it adds no other packages to your project.
- Its code only reads the dataset that ships with it. It makes no network requests, does not
  touch the file system after loading, and does not evaluate code.
- Advisories for the development dependencies (build, test and lint tools) do not affect users
  of the npm package. They are handled through Dependabot updates in the repository.
- Wrong or missing names and codes are data problems, not vulnerabilities. Please report them
  with the
  [data correction form](https://github.com/DevRW/rwanda-location/issues/new?template=data-correction.yml).

## Verifying a release

Starting with 1.2.0, releases are published from GitHub Actions by
[`.github/workflows/release.yml`](.github/workflows/release.yml), using npm trusted publishing.
npm attaches a provenance statement that links each published version to its source commit and
to the GitHub Actions build that produced it. To check the registry signatures and provenance
attestations of the packages installed in your project, run:

```bash
npm audit signatures
```

Versions 1.1.2 and earlier were published without provenance.
