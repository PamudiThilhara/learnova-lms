const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
process.chdir(require('node:path').resolve(__dirname, '..'));
const baseline = JSON.parse(fs.readFileSync('scripts/design-baseline.json', 'utf8'));
for (const [file, hash] of Object.entries(baseline.hashes)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, `${file} changed`);
for (const [file, original] of Object.entries(baseline.classes)) {
  const actual = [...fs.readFileSync(file, 'utf8').matchAll(/className=("[^"]*"|\{`[^`]*`\})/g)].map(x => x[0]);
  let position = 0;
  for (const value of actual) if (value === original[position]) position++;
  assert.equal(position, original.length, `${file}: existing styles or visual elements changed`);
}
console.log('PASS: all original CSS, images, icons and existing JSX class declarations preserved.');
