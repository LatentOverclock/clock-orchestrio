# clock-orchestrio

Simple time-tracking tool (frontend + backend) for `clock.orchestrio.li`.

## Stack
- Node.js + Express
- SQLite (`better-sqlite3`)
- Plain HTML/CSS/JS frontend
- Docker + Traefik deployment

## Features
- Start/stop live timer
- Manual time entries
- Delete entries
- Mobile-friendly input sizing (prevents iOS zoom-on-focus)

## Local run
```bash
npm install
npm start
```

Open: `http://localhost:3000`

## Docker deploy
```bash
docker compose up -d --build
```

The compose file includes Traefik labels for `clock.orchestrio.li`.
