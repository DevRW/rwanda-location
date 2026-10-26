// Compares the public type declarations with the published baseline. Every dist/**/*.d.ts is
// re-printed by the TypeScript printer with comments removed, so documentation edits and
// formatting do not count, and any other difference fails. dist/lib/internal/ holds private
// modules: files there may be added, changed or removed (they are listed, not compared once a
// baseline ships them). An intentional public type change is accepted by listing the file in
// scripts/compat/allowed-api-changes.json with the sha256 of its comment-free text, which this
// script prints when the file differs.
//
// Usage: node scripts/check-api.cjs [--candidate <package-dir>] [--baseline <package-dir>]
//   --candidate  defaults to this repository (run `npm run build` first)
//   --baseline   defaults to @devrw/rwanda-location@$BASELINE (1.1.2 unless set), installed
//                from the registry into a temporary directory
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');
const lib = require('./compat/lib.cjs');

const ALLOW_FILE = path.join(__dirname, 'compat', 'allowed-api-changes.json');
const INTERNAL = /^dist\/lib\/internal\//;

function declarationFiles(pkgDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.d.ts')) {
        out.push(path.relative(pkgDir, full).split(path.sep).join('/'));
      }
    }
  };
  const dist = path.join(pkgDir, 'dist');
  if (!fs.existsSync(dist)) throw new Error(`no dist/ in ${pkgDir}`);
  walk(dist);
  return out.sort();
}

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function normalized(file) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  return printer.printFile(source);
}

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// Line diff (longest common subsequence); declaration files are small.
function lineDiff(a, b) {
  const x = a.split('\n');
  const y = b.split('\n');
  const lcs = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) {
      i++;
      j++;
    } else if (i < x.length && (j === y.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
      out.push(`    - ${x[i++]}`);
    } else {
      out.push(`    + ${y[j++]}`);
    }
  }
  return out.join('\n');
}

function installBaseline() {
  const version = lib.baselineVersion();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rwanda-location-api-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"api-baseline","private":true}\n');
  try {
    lib.npm(
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        `${lib.BASELINE_ALIAS}@npm:${lib.PACKAGE_NAME}@${version}`,
      ],
      { cwd: dir }
    );
  } catch (err) {
    if (fs.rmSync) fs.rmSync(dir, { recursive: true, force: true });
    throw err;
  }
  return { dir, pkgDir: path.join(dir, 'node_modules', lib.BASELINE_ALIAS) };
}

function parseArgs(argv) {
  const opts = { candidate: path.join(__dirname, '..'), baseline: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--candidate') opts.candidate = path.resolve(argv[++i]);
    else if (argv[i] === '--baseline') opts.baseline = path.resolve(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  let temp = null;
  if (!opts.baseline) {
    temp = installBaseline();
    opts.baseline = temp.pkgDir;
  }
  try {
    process.exitCode = compare(opts.baseline, opts.candidate) ? 0 : 1;
  } finally {
    if (temp && fs.rmSync) fs.rmSync(temp.dir, { recursive: true, force: true });
  }
}

function compare(baselineDir, candidateDir) {
  const allowed = lib.readJson(ALLOW_FILE).files || {};
  const version = (dir) => lib.readJson(path.join(dir, 'package.json')).version;
  console.log(
    `check-api: baseline ${version(baselineDir)} vs candidate ${version(candidateDir)} ` +
      `(typescript ${ts.version})`
  );
  const baseFiles = declarationFiles(baselineDir);
  const candFiles = declarationFiles(candidateDir);
  const problems = [];
  const used = new Set();

  for (const file of baseFiles) {
    const internal = INTERNAL.test(file);
    if (!candFiles.includes(file)) {
      if (internal) console.log(`  internal  ${file} (removed)`);
      else problems.push(`${file}: missing from the candidate`);
      continue;
    }
    const before = normalized(path.join(baselineDir, file));
    const after = normalized(path.join(candidateDir, file));
    if (before === after) {
      console.log(`  same      ${file}`);
      continue;
    }
    if (internal) {
      console.log(`  internal  ${file} (changed)`);
      continue;
    }
    const hash = sha256(after);
    if (allowed[file] && allowed[file].sha256 === hash) {
      used.add(file);
      console.log(`  allowed   ${file} (${allowed[file].reason})`);
      continue;
    }
    problems.push(
      `${file}: declarations differ from the baseline\n${lineDiff(before, after)}\n` +
        `    To accept this change, add to scripts/compat/allowed-api-changes.json:\n` +
        `    "${file}": { "sha256": "${hash}", "reason": "..." }`
    );
  }
  for (const file of candFiles) {
    if (baseFiles.includes(file)) continue;
    if (INTERNAL.test(file)) console.log(`  internal  ${file}`);
    else problems.push(`${file}: new declaration file outside dist/lib/internal/`);
  }
  for (const file of Object.keys(allowed)) {
    if (!used.has(file)) console.log(`  note: allow-list entry for ${file} was not needed`);
  }

  for (const p of problems) console.log(`  FAIL ${p}`);
  if (problems.length === 0) console.log('check-api: OK');
  return problems.length === 0;
}

main();
