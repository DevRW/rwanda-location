// Benchmarks the built package (dist/) against the frozen 1.1.2 code in src/__tests__/oracle,
// on the call patterns the lookup tables are meant for. Plain Node (>= 14), no dependencies.
//
//   npm run bench                      builds, then runs every scenario (about a minute)
//   node scripts/bench.cjs --quick     one short round, for a quick look
//   node scripts/bench.cjs --rounds 5  more rounds, for steadier numbers on a busy machine
//
// Each scenario runs both implementations in alternating rounds on the same inputs (drawn from
// the dataset with a fixed seed) and reports the median time per operation. Timings depend on
// the machine and its load; compare runs on the same machine only.
'use strict';

const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const distEntry = path.join(root, 'dist', 'index.js');
const oracleEntry = path.join(root, 'src', '__tests__', 'oracle', 'v1.1.2', 'RwandaLocation.js');

const args = process.argv.slice(2);
const quick = args.includes('--quick');
const roundsArg = args.indexOf('--rounds');
const rounds = roundsArg >= 0 ? Number(args[roundsArg + 1]) : quick ? 1 : 3;
const budgetMs = quick ? 100 : 300; // measuring time per scenario, per implementation and round

let current;
try {
  current = require(distEntry);
} catch (error) {
  console.error(`Cannot load ${distEntry}: ${error.message}\nRun "npm run build" first.`);
  process.exit(1);
}
const Legacy = require(oracleEntry).RwandaLocation;
const implementations = [
  { name: '1.1.2', rw: new Legacy() },
  { name: 'current', rw: new current.RwandaLocation() },
];

// ---------------------------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------------------------

const data = require(path.join(root, 'dist', 'db', 'locations.json'));

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(42);
const pick = (items) => items[Math.floor(random() * items.length)];
const distinct = (key) => Array.from(new Set(data.map((row) => row[key])));
const at = (items, i) => items[i % items.length];

const districtCodes = distinct('district_code');
const sectorCodes = distinct('sector_code');
const cellCodes = distinct('cell_code');
const villageCodes = distinct('village_code');
const districtNames = distinct('district_name');
const villageNames = distinct('village_name');
const randomRows = Array.from({ length: 4096 }, () => pick(data));
const validCodes = Array.from({ length: 1000 }, () => pick(villageCodes));
const mixedCodes = Array.from({ length: 1000 }, (_, i) =>
  i % 2 ? pick(villageCodes) : pick(cellCodes) * 100 + 99
);

// ---------------------------------------------------------------------------------------------
// Scenarios: fn(rw, i) performs one operation, using input number i
// ---------------------------------------------------------------------------------------------

function validate(rw, codes) {
  let valid = 0;
  for (let k = 0; k < codes.length; k++) if (rw.getVillageByCode(codes[k])) valid++;
  return valid;
}

const scenarios = [
  [
    'cascading dropdown: provinces > districts > sectors > cells > villages > village',
    (rw, i) => {
      const row = at(randomRows, i);
      rw.getProvinces();
      rw.getDistricts(row.province_code);
      rw.getSectors(row.district_code);
      rw.getCells(row.sector_code);
      rw.getVillages(row.cell_code);
      return rw.getVillageByCode(row.village_code);
    },
  ],
  ['validate 1,000 village codes', (rw) => validate(rw, validCodes)],
  ['validate 1,000 village codes, half of them invalid', (rw) => validate(rw, mixedCodes)],
  ['getVillageByCode(code)', (rw, i) => rw.getVillageByCode(at(villageCodes, i))],
  ['getFullPath(code)', (rw, i) => rw.getFullPath(at(villageCodes, i * 7))],
  ['getStatistics()', (rw) => rw.getStatistics()],
  ["search({ query: 'kigali' })", (rw) => rw.search({ query: 'kigali' })],
  ['search({ query: <village name> })', (rw, i) => rw.search({ query: at(villageNames, i * 31) })],
  ["search({ query: 'gitega', limit: 10 })", (rw) => rw.search({ query: 'gitega', limit: 10 })],
  [
    'search({ query: <3 letters of a name>, limit: 5 }), as in a typeahead',
    (rw, i) => rw.search({ query: at(villageNames, i * 13).slice(0, 3), limit: 5 }),
  ],
  ['query({ districtCode })', (rw, i) => rw.query({ districtCode: at(districtCodes, i) })],
  ['query({ sectorCode })', (rw, i) => rw.query({ sectorCode: at(sectorCodes, i) })],
  ['query({ villageCode })', (rw, i) => rw.query({ villageCode: at(villageCodes, i * 31) })],
  ['query({ districtName })', (rw, i) => rw.query({ districtName: at(districtNames, i) })],
  ['query({ villageName })', (rw, i) => rw.query({ villageName: at(villageNames, i * 13) })],
  [
    'query({ sectorName, districtName })',
    (rw, i) => {
      const row = at(randomRows, i);
      return rw.query({ sectorName: row.sector_name, districtName: row.district_name });
    },
  ],
];

// ---------------------------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------------------------

let sink = 0; // results feed this, so the work cannot be optimized away
function consume(result) {
  sink += result == null ? 1 : Array.isArray(result) ? result.length : 2;
}

const now = () => process.hrtime.bigint();
const elapsedMs = (start) => Number(now() - start) / 1e6;

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Median time of one operation, in microseconds. */
function measure(fn, rw) {
  let i = 0;
  const warmUpEnd = Date.now() + budgetMs / 3;
  while (Date.now() < warmUpEnd) consume(fn(rw, i++));

  // Time batches of operations that each take at least 2 ms, so the timer's resolution is not an
  // issue, and use the median batch.
  let batch = 1;
  for (;;) {
    const start = now();
    for (let k = 0; k < batch; k++) consume(fn(rw, i++));
    if (elapsedMs(start) >= 2 || batch >= 1 << 20) break;
    batch *= 2;
  }
  const samples = [];
  const end = Date.now() + budgetMs;
  while (samples.length < 7 || (Date.now() < end && samples.length < 200)) {
    const start = now();
    for (let k = 0; k < batch; k++) consume(fn(rw, i++));
    samples.push((elapsedMs(start) * 1000) / batch);
  }
  return median(samples);
}

function formatTime(us) {
  if (us >= 1000) return `${(us / 1000).toFixed(2)} ms`;
  if (us >= 10) return `${us.toFixed(1)} µs`;
  return `${us.toFixed(2)} µs`;
}

function formatSpeedup(ratio) {
  return ratio >= 100 ? `${Math.round(ratio)}x` : `${ratio.toFixed(1)}x`;
}

function table(header, rows) {
  const widths = header.map((_, c) => Math.max(...[header, ...rows].map((row) => row[c].length)));
  const line = (row) =>
    row.map((cell, c) => (c === 0 ? cell.padEnd(widths[c]) : cell.padStart(widths[c]))).join('  ');
  return [line(header), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

/** Runs `code` in a fresh Node process and returns what it prints as JSON. */
function fresh(code) {
  return JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' }));
}

/** Load time and the first calls (which build the lookup tables), in fresh processes. */
function coldStart() {
  const runs = quick ? 3 : 7;
  const firstCalls = {
    getVillageByCode: 'rw.getVillageByCode(507150505)',
    getVillages: 'rw.getVillages(5071505)',
    getStatistics: 'rw.getStatistics()',
    search: "rw.search({ query: 'kigali' })",
  };
  const results = [];
  for (const [label, call] of Object.entries(firstCalls)) {
    const timings = { '1.1.2': [], current: [] };
    for (let run = 0; run < runs; run++) {
      for (const [name, load] of [
        ['1.1.2', `new (require(${JSON.stringify(oracleEntry)}).RwandaLocation)()`],
        ['current', `require(${JSON.stringify(distEntry)}).rwandaLocation`],
      ]) {
        const code = `
          const t = () => Number(process.hrtime.bigint()) / 1e6;
          const rw = ${load};
          const a = t(); ${call}; const b = t(); ${call}; const c = t();
          console.log(JSON.stringify([b - a, c - b]));`;
        timings[name].push(fresh(code));
      }
    }
    const first = (name) => median(timings[name].map((t) => t[0]));
    const second = (name) => median(timings[name].map((t) => t[1]));
    results.push([
      label,
      formatTime(first('1.1.2') * 1000),
      formatTime(first('current') * 1000),
      formatTime(second('1.1.2') * 1000),
      formatTime(second('current') * 1000),
    ]);
  }
  const loads = [];
  for (let run = 0; run < runs; run++) {
    loads.push(
      fresh(`
        const t = () => Number(process.hrtime.bigint()) / 1e6;
        const a = t(); require(${JSON.stringify(distEntry)}); const b = t();
        console.log(JSON.stringify(b - a));`)
    );
  }
  return { results, load: median(loads), runs };
}

// ---------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------

const cpus = os.cpus();
console.log('Benchmark: @devrw/rwanda-location, current dist/ against the frozen 1.1.2 code');
console.log(`Date:      ${new Date().toISOString()}`);
console.log(
  `Node:      ${process.version} (${process.platform} ${process.arch}, V8 ${process.versions.v8})`
);
console.log(`CPU:       ${cpus.length ? cpus[0].model : 'unknown'} x ${cpus.length}`);
console.log(
  `Load:      ${os
    .loadavg()
    .map((x) => x.toFixed(2))
    .join(' ')} (1, 5, 15 min)`
);
console.log(`Rounds:    ${rounds}, ${budgetMs} ms of measuring per scenario and round\n`);

const perRound = scenarios.map(() => ({ '1.1.2': [], current: [] }));
for (let round = 0; round < rounds; round++) {
  scenarios.forEach(([, fn], s) => {
    const order = round % 2 ? implementations.slice().reverse() : implementations;
    for (const { name, rw } of order) perRound[s][name].push(measure(fn, rw));
  });
}

const rows = scenarios.map(([label], s) => {
  const legacy = median(perRound[s]['1.1.2']);
  const latest = median(perRound[s].current);
  return [label, formatTime(legacy), formatTime(latest), formatSpeedup(legacy / latest)];
});
console.log('Median time per operation, after warm-up');
console.log(table(['scenario', '1.1.2', 'current', 'speedup'], rows));

const cold = coldStart();
console.log(
  `\nFresh process, median of ${cold.runs} runs: the first call builds the tables it needs`
);
console.log(
  table(['first call of', '1.1.2 1st', 'current 1st', '1.1.2 2nd', 'current 2nd'], cold.results)
);
console.log(`require() of dist/index.js: ${formatTime(cold.load * 1000)}`);

if (sink === -1) console.log('');
