const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('req4: UI is mobile-friendly and responsive', () => {
  assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1\.0"/i);
  assert.match(html, /@media\s*\(max-width:\s*700px\)/i);
});

test('req5: UI includes link to project GitHub repository', () => {
  assert.match(html, /https:\/\/github\.com\/LatentOverclock\/clock-orchestrio/);
});
