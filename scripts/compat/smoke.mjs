// Node ESM smoke test of an installed package. In 1.x the package is CommonJS, so Node ESM sees:
//  - named imports, detected by cjs-module-lexer from tsc's re-exports;
//  - a default import that is the whole module.exports object, not the class. Code such as
//    `import pkg from '@devrw/rwanda-location'; pkg.rwandaLocation` depends on this quirk.
// ESM and CommonJS must share one module instance (one class, one singleton, one data array).
// JSON is loaded through createRequire: import attributes for JSON differ between Node versions.
//
// Usage: node scripts/compat/smoke.mjs <consumer-dir> [package-specifier]
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const NAMED = [
  'rwandaLocation',
  'RwandaLocation',
  'normalizeString',
  'matchesString',
  'getUniqueByKey',
  'sortByNumericKey',
  'sortByStringKey',
  'isValidProvinceCode',
  'isValidDistrictCode',
  'formatLocation',
  'getParentLevel',
  'getChildLevel',
];

// Bare specifiers in ESM resolve relative to the importing file, so the static imports are
// written into a module inside the consumer project.
function writeProbe(dir, spec) {
  const file = path.join(dir, `compat-smoke-${spec.replace(/[^a-z0-9]+/gi, '_')}.mjs`);
  const source = [
    `import def, { ${NAMED.join(', ')} } from '${spec}';`,
    `import * as ns from '${spec}';`,
    `import * as deepClass from '${spec}/dist/lib/RwandaLocation.js';`,
    `import * as deepIndex from '${spec}/dist/index.js';`,
    `export { def, ns, deepClass, deepIndex, ${NAMED.join(', ')} };`,
    '',
  ].join('\n');
  fs.writeFileSync(file, source);
  return file;
}

async function main() {
  const dir = process.argv[2] && path.resolve(process.argv[2]);
  const spec = process.argv[3] || '@devrw/rwanda-location';
  if (!dir) {
    console.error('usage: node scripts/compat/smoke.mjs <consumer-dir> [package-specifier]');
    process.exit(2);
  }
  const require = createRequire(path.join(dir, 'package.json'));
  const cjs = require(spec);
  const pkg = require(`${spec}/package.json`);
  console.log(`smoke.mjs: ${pkg.name}@${pkg.version} (${spec}) on node ${process.version}`);

  const probe = await import(pathToFileURL(writeProbe(dir, spec)).href);
  for (const name of NAMED) {
    assert.strictEqual(probe[name], cjs[name], `named import ${name} is the CommonJS export`);
    assert.strictEqual(probe.ns[name], cjs[name], `namespace ${name}`);
  }
  assert.strictEqual(typeof probe.def, 'object', 'default import is module.exports, not the class');
  assert.strictEqual(probe.def, cjs);
  assert.strictEqual(probe.def.default, cjs.RwandaLocation);
  assert.strictEqual(probe.ns.default, cjs);
  assert.throws(() => new probe.def(), TypeError);
  assert.ok(probe.rwandaLocation instanceof probe.RwandaLocation);
  assert.strictEqual(
    probe.rwandaLocation,
    cjs.rwandaLocation,
    'ESM and CommonJS share the singleton'
  );

  // Deep ESM imports with explicit extensions.
  assert.strictEqual(probe.deepClass.RwandaLocation, cjs.RwandaLocation);
  assert.strictEqual(probe.deepIndex.default, cjs);

  const data = require(`${spec}/dist/db/locations.json`);
  assert.strictEqual(data.length, 14842);
  assert.strictEqual(
    probe.rwandaLocation.data,
    data,
    'the singleton reads the deep-imported array'
  );
  assert.strictEqual(probe.rwandaLocation.getDistricts().length, 30);
  assert.strictEqual(new probe.RwandaLocation().getVillageByCode(101010102).name, 'Gihanga');
  assert.strictEqual(probe.normalizeString(' KiGaLi '), 'kigali');

  console.log('smoke.mjs: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
