// Asserts the exact list of files that `npm pack` puts in the tarball. A file that disappears
// breaks deep imports; an extra file is usually an accident (sources, tests, local settings).
// The only open-ended part is dist/lib/internal/, which holds private implementation modules.
//
// Usage: node scripts/check-pack.cjs [<file.tgz> | <pack.json>]
//   With no argument it runs `npm pack --dry-run --json --ignore-scripts` in the repository root,
//   so build first (npm run build). --ignore-scripts keeps the `prepare` build from writing to
//   stdout and corrupting the JSON. A tarball is listed the same way; a saved `npm pack --json`
//   output is read as is.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// The 21 files of the published 1.1.2 tarball.
const EXPECTED = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'dist/db/locations.json',
  'dist/index.d.ts',
  'dist/index.d.ts.map',
  'dist/index.js',
  'dist/index.js.map',
  'dist/lib/RwandaLocation.d.ts',
  'dist/lib/RwandaLocation.d.ts.map',
  'dist/lib/RwandaLocation.js',
  'dist/lib/RwandaLocation.js.map',
  'dist/lib/utils.d.ts',
  'dist/lib/utils.d.ts.map',
  'dist/lib/utils.js',
  'dist/lib/utils.js.map',
  'dist/types/index.d.ts',
  'dist/types/index.d.ts.map',
  'dist/types/index.js',
  'dist/types/index.js.map',
  'package.json',
];

// Compiled internal modules: name.js, name.d.ts and their source maps, directly in that folder.
const INTERNAL = /^dist\/lib\/internal\/[A-Za-z0-9_-]+\.(js|d\.ts)(\.map)?$/;

function packInfo(file) {
  if (file && file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const root = path.join(__dirname, '..');
  const args = ['pack', '--dry-run', '--json', '--ignore-scripts'];
  if (file) args.push(path.resolve(file));
  const result = spawnSync('npm', args, {
    cwd: file ? os.tmpdir() : root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`npm pack --dry-run exited with ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

function main() {
  const info = packInfo(process.argv[2])[0];
  const files = info.files.map((f) => f.path).sort();
  const problems = [];

  for (const p of EXPECTED) if (!files.includes(p)) problems.push(`missing: ${p}`);
  const internal = [];
  for (const p of files) {
    if (EXPECTED.includes(p)) continue;
    if (INTERNAL.test(p)) internal.push(p);
    else problems.push(`unexpected: ${p}`);
  }

  const size = `${(info.size / 1024).toFixed(0)} KiB packed, ${(info.unpackedSize / 1048576).toFixed(2)} MiB unpacked`;
  console.log(`check-pack: ${info.name}@${info.version}, ${files.length} files, ${size}`);
  for (const p of internal) console.log(`  internal: ${p}`);
  for (const p of problems) console.log(`  FAIL ${p}`);
  if (problems.length) process.exit(1);
  console.log('check-pack: OK');
}

main();
