// Shared helpers for the compatibility scripts. Everything under scripts/compat/ is plain
// CommonJS with ES2020 syntax and no dependencies, because it runs on every Node version the
// package supports (engines: node >= 14), including inside CI jobs that never run `npm ci`.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const PACKAGE_NAME = '@devrw/rwanda-location';
// The published version that candidates are compared against. Override with BASELINE=x.y.z.
const DEFAULT_BASELINE = '1.1.2';
// npm alias under which the baseline is installed next to the candidate.
const BASELINE_ALIAS = 'baseline';
const ESM_LOADER = 'compat-esm-loader.mjs';

function baselineVersion() {
  return process.env.BASELINE || DEFAULT_BASELINE;
}

// Runs a command and throws if it fails. On Windows npm is a .cmd shim, which needs a shell.
function run(cmd, args, options) {
  const opts = Object.assign({ stdio: 'inherit', shell: process.platform === 'win32' }, options);
  const result = spawnSync(cmd, args, opts);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`);
  }
  return result;
}

function npm(args, options) {
  return run('npm', args, options);
}

// Compares x.y.z versions numerically; prerelease suffixes are ignored.
function compareVersions(a, b) {
  const pa = String(a).split('-')[0].split('.').map(Number);
  const pb = String(b).split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

// A require() that resolves bare specifiers exactly like code inside the consumer project.
function consumerRequire(consumerDir) {
  return createRequire(path.join(path.resolve(consumerDir), 'package.json'));
}

// ESM resolution of bare specifiers is relative to the importing file, so dynamic imports go
// through a one-line module that lives inside the consumer project.
function writeEsmLoader(consumerDir) {
  const file = path.join(path.resolve(consumerDir), ESM_LOADER);
  fs.writeFileSync(file, 'export const load = (specifier) => import(specifier);\n');
  return file;
}

function esmLoader(consumerDir) {
  const file = path.join(path.resolve(consumerDir), ESM_LOADER);
  if (!fs.existsSync(file)) writeEsmLoader(consumerDir);
  return import(pathToFileURL(file).href).then((mod) => mod.load);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = {
  PACKAGE_NAME,
  DEFAULT_BASELINE,
  BASELINE_ALIAS,
  ESM_LOADER,
  baselineVersion,
  run,
  npm,
  compareVersions,
  consumerRequire,
  writeEsmLoader,
  esmLoader,
  readJson,
};
