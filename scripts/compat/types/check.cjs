// Type-checks the consumer files in this folder against a candidate tarball with one TypeScript
// version, in every module-resolution mode that version supports:
//   node10            TypeScript < 7 (TypeScript 7 removed it; 6 needs ignoreDeprecations)
//   node16, nodenext  TypeScript >= 4.7, from a CommonJS file and from an ESM file
//   bundler           TypeScript >= 5.0
// The package's own .d.ts files are checked too (skipLibCheck: false).
//
// Usage: node scripts/compat/types/check.cjs <candidate.tgz> <typescript-version> <work-dir>
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('../lib.cjs');

const COMMON = {
  strict: true,
  noEmit: true,
  skipLibCheck: false,
  esModuleInterop: true,
  resolveJsonModule: true,
  target: 'es2020',
  lib: ['es2020'],
  types: [],
};

function modes(major, minor) {
  const list = [];
  if (major < 7) {
    const options = { module: 'commonjs', moduleResolution: 'node' };
    if (major === 6) options.ignoreDeprecations = '6.0';
    list.push(['node10', options, ['consumer.ts']]);
  }
  if (major > 4 || (major === 4 && minor >= 7)) {
    list.push([
      'node16',
      { module: 'node16', moduleResolution: 'node16' },
      ['consumer.ts', 'consumer.mts'],
    ]);
    list.push([
      'nodenext',
      { module: 'nodenext', moduleResolution: 'nodenext' },
      ['consumer.ts', 'consumer.mts'],
    ]);
  }
  if (major >= 5) {
    list.push(['bundler', { module: 'esnext', moduleResolution: 'bundler' }, ['consumer.ts']]);
  }
  return list;
}

function main() {
  const [tarball, version, dir] = process.argv.slice(2);
  if (!tarball || !version || !dir) {
    console.error(
      'usage: node scripts/compat/types/check.cjs <candidate.tgz> <typescript-version> <work-dir>'
    );
    process.exit(2);
  }
  const work = path.resolve(dir);
  if (fs.existsSync(work) && fs.readdirSync(work).length > 0) {
    throw new Error(`work directory must be empty or absent: ${work}`);
  }
  fs.mkdirSync(work, { recursive: true });
  // No "type" field: .ts files are CommonJS and .mts files are ESM under node16/nodenext.
  fs.writeFileSync(path.join(work, 'package.json'), '{"name":"types-consumer","private":true}\n');
  lib.npm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      path.resolve(tarball),
      `typescript@${version}`,
    ],
    { cwd: work }
  );
  for (const file of ['consumer.ts', 'consumer.mts']) {
    fs.copyFileSync(path.join(__dirname, file), path.join(work, file));
  }

  const tsVersion = lib.readJson(
    path.join(work, 'node_modules', 'typescript', 'package.json')
  ).version;
  const [major, minor] = tsVersion.split('.').map(Number);
  const tsc = path.join(work, 'node_modules', 'typescript', 'bin', 'tsc');
  let failed = 0;
  for (const [name, options, files] of modes(major, minor)) {
    const config = `tsconfig.${name}.json`;
    const json = { compilerOptions: Object.assign({}, COMMON, options), files };
    fs.writeFileSync(path.join(work, config), JSON.stringify(json, null, 2) + '\n');
    try {
      lib.run(process.execPath, [tsc, '-p', config], { cwd: work, shell: false });
      console.log(`types: typescript ${tsVersion} ${name}: OK`);
    } catch {
      failed++;
      console.log(`types: typescript ${tsVersion} ${name}: FAILED`);
    }
  }
  if (failed) process.exit(1);
}

main();
