const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'clock.db');

const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function activeEntry() {
  return db.prepare('SELECT * FROM entries WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1').get();
}

app.get('/api/status', (req, res) => {
  res.json({ active: activeEntry() || null });
});

app.get('/api/entries', (req, res) => {
  const rows = db.prepare('SELECT * FROM entries ORDER BY started_at DESC LIMIT 200').all();
  res.json(rows);
});

app.post('/api/start', (req, res) => {
  const { task, notes } = req.body;
  if (!task || typeof task !== 'string') {
    return res.status(400).json({ error: 'task is required' });
  }

  const existing = activeEntry();
  if (existing) {
    return res.status(409).json({ error: 'another timer is active', active: existing });
  }

  const startedAt = new Date().toISOString();
  const info = db.prepare('INSERT INTO entries (task, started_at, notes) VALUES (?, ?, ?)').run(task.trim(), startedAt, notes || null);
  const created = db.prepare('SELECT * FROM entries WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.post('/api/stop', (req, res) => {
  const entry = activeEntry();
  if (!entry) {
    return res.status(404).json({ error: 'no active timer' });
  }

  const endedAt = new Date().toISOString();
  const durationSeconds = Math.max(0, Math.floor((new Date(endedAt) - new Date(entry.started_at)) / 1000));

  db.prepare('UPDATE entries SET ended_at = ?, duration_seconds = ? WHERE id = ?').run(endedAt, durationSeconds, entry.id);
  const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(entry.id);
  res.json(updated);
});

app.post('/api/manual', (req, res) => {
  const { task, started_at, ended_at, notes } = req.body;
  if (!task || !started_at || !ended_at) {
    return res.status(400).json({ error: 'task, started_at, ended_at are required' });
  }
  const start = new Date(started_at);
  const end = new Date(ended_at);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: 'invalid timestamps' });
  }
  const durationSeconds = Math.floor((end - start) / 1000);
  const info = db.prepare(
    'INSERT INTO entries (task, started_at, ended_at, duration_seconds, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(task.trim(), start.toISOString(), end.toISOString(), durationSeconds, notes || null);

  const created = db.prepare('SELECT * FROM entries WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.delete('/api/entries/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!entry) {
    return res.status(404).json({ error: 'entry not found' });
  }

  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  res.json({ success: true, deleted: id });
});

app.listen(PORT, () => {
  console.log(`clock-orchestrio listening on :${PORT}`);
});
