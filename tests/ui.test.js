const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('requirement 4: UI includes mobile-friendly responsive setup', () => {
  assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1\.0"\s*\/?\s*>/i);
  assert.match(html, /@media\s*\(max-width:\s*700px\)/i);
});

test('requirement 5: UI includes a GitHub repository link', () => {
  assert.match(html, /href="https:\/\/github\.com\/LatentOverclock\/clock-orchestrio"/i);
});
