const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clock-reimpl-'));
  const db = createDb(path.join(dir, 'clock.db'));
  const app = createApp(db);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

test('req1: app serves backend API and frontend', async () => {
  const ctx = await startServer();
  try {
    const health = await fetch(`${ctx.base}/api/health`).then((r) => r.json());
    assert.equal(health.ok, true);
    const html = await fetch(`${ctx.base}/`).then((r) => r.text());
    assert.match(html, /Clock Orchestrio/);
  } finally {
    await ctx.close();
  }
});

test('req2: app supports creating and managing entries including manual entries', async () => {
  const ctx = await startServer();
  try {
    const manualRes = await fetch(`${ctx.base}/api/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'Manual',
        started_at: '2026-03-05T09:00:00.000Z',
        ended_at: '2026-03-05T09:30:00.000Z',
        notes: 'block'
      })
    });
    assert.equal(manualRes.status, 201);

    const startRes = await fetch(`${ctx.base}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'Active task' })
    });
    assert.equal(startRes.status, 201);

    const status = await fetch(`${ctx.base}/api/status`).then((r) => r.json());
    assert.equal(status.active.task, 'Active task');

    const stopRes = await fetch(`${ctx.base}/api/stop`, { method: 'POST' });
    assert.equal(stopRes.status, 200);

    const entries = await fetch(`${ctx.base}/api/entries`).then((r) => r.json());
    assert.ok(entries.length >= 2);
  } finally {
    await ctx.close();
  }
});

test('req3: app supports deleting entries', async () => {
  const ctx = await startServer();
  try {
    const created = await fetch(`${ctx.base}/api/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'Delete',
        started_at: '2026-03-05T09:00:00.000Z',
        ended_at: '2026-03-05T09:30:00.000Z'
      })
    }).then((r) => r.json());

    const del = await fetch(`${ctx.base}/api/entries/${created.id}`, { method: 'DELETE' });
    assert.equal(del.status, 200);

    const entries = await fetch(`${ctx.base}/api/entries`).then((r) => r.json());
    assert.equal(entries.find((e) => e.id === created.id), undefined);
  } finally {
    await ctx.close();
  }
});
