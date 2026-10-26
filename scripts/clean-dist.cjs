// Removes dist/ before a build so stale files can never end up in the published tarball.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');

if (fs.rmSync) {
  fs.rmSync(dist, { recursive: true, force: true });
} else if (fs.existsSync(dist)) {
  // Node < 14.14 has no fs.rmSync.
  fs.rmdirSync(dist, { recursive: true });
}
