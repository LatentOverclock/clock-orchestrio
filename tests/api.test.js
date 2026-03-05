const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

async function startTestServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clock-test-'));
  const dbPath = path.join(dir, 'clock.db');
  const db = createDb(dbPath);
  const app = createApp(db);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

test('requirement 1: web app provides backend API and frontend page', async () => {
  const ctx = await startTestServer();
  try {
    const healthRes = await fetch(`${ctx.baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);

    const pageRes = await fetch(`${ctx.baseUrl}/`);
    assert.equal(pageRes.status, 200);
    const html = await pageRes.text();
    assert.match(html, /<title>Clock Orchestrio<\/title>/i);
  } finally {
    await ctx.close();
  }
});

test('requirement 2: supports manual entries and timer-managed entries', async () => {
  const ctx = await startTestServer();
  try {
    const manualRes = await fetch(`${ctx.baseUrl}/api/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'Write docs',
        started_at: '2026-03-05T08:00:00.000Z',
        ended_at: '2026-03-05T08:30:00.000Z',
        notes: 'Manual block'
      })
    });
    assert.equal(manualRes.status, 201);
    const manual = await manualRes.json();
    assert.equal(manual.task, 'Write docs');
    assert.equal(manual.duration_seconds, 1800);

    const startRes = await fetch(`${ctx.baseUrl}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'Active task', notes: 'Timer mode' })
    });
    assert.equal(startRes.status, 201);

    const statusRes = await fetch(`${ctx.baseUrl}/api/status`);
    const status = await statusRes.json();
    assert.equal(status.active.task, 'Active task');

    const stopRes = await fetch(`${ctx.baseUrl}/api/stop`, { method: 'POST' });
    assert.equal(stopRes.status, 200);
    const stopped = await stopRes.json();
    assert.equal(typeof stopped.duration_seconds, 'number');

    const listRes = await fetch(`${ctx.baseUrl}/api/entries`);
    assert.equal(listRes.status, 200);
    const entries = await listRes.json();
    assert.ok(entries.length >= 2);
  } finally {
    await ctx.close();
  }
});

test('requirement 3: supports deleting entries', async () => {
  const ctx = await startTestServer();
  try {
    const createRes = await fetch(`${ctx.baseUrl}/api/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'Delete me',
        started_at: '2026-03-05T08:00:00.000Z',
        ended_at: '2026-03-05T09:00:00.000Z'
      })
    });
    const created = await createRes.json();

    const delRes = await fetch(`${ctx.baseUrl}/api/entries/${created.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);

    const listRes = await fetch(`${ctx.baseUrl}/api/entries`);
    const entries = await listRes.json();
    assert.equal(entries.find((e) => e.id === created.id), undefined);
  } finally {
    await ctx.close();
  }
});
