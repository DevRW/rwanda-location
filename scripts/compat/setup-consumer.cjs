// Creates a throwaway consumer project with the candidate tarball and the published baseline
// installed side by side:
//   node_modules/@devrw/rwanda-location  the candidate (from the tarball)
//   node_modules/baseline                 @devrw/rwanda-location@$BASELINE from the registry
// Lifecycle scripts are skipped so the candidate and the baseline install the same way. Registry
// installs do run install hooks; smoke.cjs asserts that the candidate has none.
//
// Usage: node scripts/compat/setup-consumer.cjs <candidate.tgz> <consumer-dir>
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./lib.cjs');

function main() {
  const [tarball, dir] = process.argv.slice(2);
  if (!tarball || !dir) {
    console.error('usage: node scripts/compat/setup-consumer.cjs <candidate.tgz> <consumer-dir>');
    process.exit(2);
  }
  const tgz = path.resolve(tarball);
  const consumer = path.resolve(dir);
  if (!fs.existsSync(tgz)) throw new Error(`tarball not found: ${tgz}`);
  if (fs.existsSync(consumer) && fs.readdirSync(consumer).length > 0) {
    throw new Error(`consumer directory must be empty or absent: ${consumer}`);
  }
  fs.mkdirSync(consumer, { recursive: true });

  const baseline = lib.baselineVersion();
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ name: 'compat-consumer', version: '0.0.0', private: true }, null, 2) + '\n'
  );
  // npm aliases (name@npm:pkg@version) need npm >= 6.9.
  lib.npm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      tgz,
      `${lib.BASELINE_ALIAS}@npm:${lib.PACKAGE_NAME}@${baseline}`,
    ],
    { cwd: consumer }
  );
  lib.writeEsmLoader(consumer);

  const req = lib.consumerRequire(consumer);
  const cand = req(`${lib.PACKAGE_NAME}/package.json`);
  const base = req(`${lib.BASELINE_ALIAS}/package.json`);
  if (base.name !== lib.PACKAGE_NAME) throw new Error(`baseline alias resolved to ${base.name}`);
  console.log(
    `consumer ready in ${consumer}: candidate ${cand.name}@${cand.version}, baseline ${base.name}@${base.version}`
  );
}

main();
