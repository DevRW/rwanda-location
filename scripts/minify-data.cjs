// tsc re-emits dist/db/locations.json with 4-space indentation (~6.8 MB). Rewriting it without
// whitespace keeps the parsed content identical while cutting the installed size by ~2 MB and
// speeding up require(). Runs after tsc as part of `npm run build`.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'db', 'locations.json');
const before = fs.readFileSync(file, 'utf8');
const after = JSON.stringify(JSON.parse(before));

fs.writeFileSync(file, after);
