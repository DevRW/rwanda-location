// Runs the whole compatibility suite locally, the way CI does, without writing to the working
// tree: it copies the working tree (uncommitted changes included) to a temporary directory,
// installs and builds it there, packs it, then runs check-pack and check-api, and runs
// smoke.cjs, smoke.mjs and differential.cjs in a consumer project that has the tarball and the
// published baseline side by side.
//
// Usage: npm run compat [-- options]
//   --tarball <file>  test this tarball instead of building the working tree
//   --node <binary>   also run the runtime checks with this Node binary (repeatable)
//   --types <ver>     also type-check consumers with this TypeScript version (repeatable)
//   --keep            keep the temporary directory
// Environment: BASELINE=x.y.z selects the published version to compare against (default 1.1.2).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('./lib.cjs');

const ROOT = path.join(__dirname, '..', '..');
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage']);

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.endsWith('.tgz')) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dest);
    else if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(src), dest);
    else if (entry.isFile()) fs.copyFileSync(src, dest);
  }
}

function parseArgs(argv) {
  const opts = { tarball: null, nodes: [], types: [], keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tarball') opts.tarball = path.resolve(argv[++i]);
    else if (a === '--node') opts.nodes.push(argv[++i]);
    else if (a === '--types') opts.types.push(argv[++i]);
    else if (a === '--keep') opts.keep = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return opts;
}

function step(title, fn) {
  console.log(`\n=== ${title}`);
  fn();
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rwanda-location-compat-'));
  const node = (binary, script, args) =>
    lib.run(binary, [path.join(__dirname, script)].concat(args), { shell: false });
  let ok = false;
  try {
    let tarball = opts.tarball;
    if (!tarball) {
      const repo = path.join(work, 'repo');
      const pkgDir = path.join(work, 'pkg');
      step('copy the working tree', () => copyTree(ROOT, repo));
      step('npm ci', () =>
        lib.npm(['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: repo })
      );
      step('npm run build', () => lib.npm(['run', 'build'], { cwd: repo }));
      step('check-pack', () =>
        lib.run(process.execPath, ['scripts/check-pack.cjs'], { cwd: repo })
      );
      step('npm pack', () => {
        fs.mkdirSync(pkgDir);
        lib.npm(['pack', '--ignore-scripts', '--pack-destination', pkgDir], { cwd: repo });
      });
      tarball = path.join(pkgDir, fs.readdirSync(pkgDir)[0]);
    } else {
      step('check-pack', () => node(process.execPath, '../check-pack.cjs', [tarball]));
    }

    const consumer = path.join(work, 'consumer');
    step(`consumer with ${path.basename(tarball)} and baseline ${lib.baselineVersion()}`, () =>
      node(process.execPath, 'setup-consumer.cjs', [tarball, consumer])
    );
    step('check-api', () => {
      const candidate = path.join(consumer, 'node_modules', lib.PACKAGE_NAME);
      const baseline = path.join(consumer, 'node_modules', lib.BASELINE_ALIAS);
      node(process.execPath, '../check-api.cjs', [
        '--candidate',
        candidate,
        '--baseline',
        baseline,
      ]);
    });
    for (const binary of [process.execPath].concat(opts.nodes)) {
      step(`runtime checks with ${binary}`, () => {
        node(binary, 'smoke.cjs', [consumer]);
        node(binary, 'smoke.mjs', [consumer]);
        node(binary, 'differential.cjs', [consumer]);
      });
    }
    for (const version of opts.types) {
      step(`types with typescript ${version}`, () =>
        node(process.execPath, 'types/check.cjs', [
          tarball,
          version,
          path.join(work, `types-${version}`),
        ])
      );
    }
    ok = true;
  } finally {
    if (ok && !opts.keep) fs.rmSync(work, { recursive: true, force: true });
    else console.log(`\nwork directory kept: ${work}`);
  }
  console.log('\ncompat: all checks passed');
}

try {
  main();
} catch (err) {
  console.error(`\ncompat: ${err.message}`);
  process.exit(1);
}
