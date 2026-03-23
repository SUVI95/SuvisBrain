# 🧠 Knuut AI Brain (SuvisBrain)

> A living knowledge graph and agent dashboard for the Knuut AI voice assistant platform.

Built with D3-force, vanilla JS, and **Neon** serverless Postgres for persistent AI memory.

## 🚀 What this is

Visual brain layer for Knuut AI — a Finnish voice AI for businesses and schools.

- **Brain Graph** (`public/index.html`) — D3-force knowledge graph, drag nodes, zoom, hover
- **Dashboard** (`public/dashboard.html`) — Agent fleet with EP/ENT/FIND/DS metrics
- **API** (`/api/brain`, `/api/agents`) — Neon-backed CRUD for nodes and agents

## 📁 Structure

```
SuvisBrain/
├── public/
│   ├── index.html        ← Brain graph (D3-force)
│   └── dashboard.html    ← Agent fleet dashboard
├── api/
│   ├── brain.js          ← GET/POST brain graph (Neon)
│   └── agents.js         ← GET agents (Neon)
├── src/
│   ├── api/memory.js     ← Brain graph helpers
│   ├── lib/db.js         ← Neon client
│   └── data/schema.sql   ← Neon schema
├── vercel.json
├── package.json
└── README.md
```

## 🛠 Setup

### 1. Create a Neon database

1. Go to [neon.tech](https://neon.tech) and create a project
2. Copy the connection string from the dashboard

### 2. Run the schema

1. In [Neon Console](https://console.neon.tech), open your project → SQL Editor
2. Enable the `vector` extension in your branch if needed (Extensions tab)
3. Paste and run `src/data/schema.sql`

### 3. Install and run locally

```bash
npm install
cp .env.example .env
# Edit .env and add your DATABASE_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API is at `/api/brain` and `/api/agents`.

### 4. Static-only (no DB)

If you want to run the UI without Neon:

```bash
cd public && python3 -m http.server 8080
# open http://localhost:8080
```

The graph uses in-memory demo data when not connected to the API.

## 🔌 API

| Endpoint       | Method | Description                         |
|----------------|--------|-------------------------------------|
| `/api/brain`   | GET    | Returns `{ nodes, links }`          |
| `/api/brain`   | POST   | Create node `{ label, type, ... }`  |
| `/api/agents`  | GET    | Returns list of agents              |

## 🗺️ Roadmap

- [x] Phase 1: D3-force brain graph + agent dashboard
- [x] Phase 2: Neon database — schema and API
- [ ] Phase 3: Wire frontend to fetch from `/api/brain`
- [ ] Phase 4: OpenAI Realtime API voice integration
- [ ] Phase 5: Multi-agent system with deep sleep/memory
- [ ] Phase 6: Multi-tenant commercialization for schools & businesses

## Tech Stack

D3-force · **Neon** (serverless Postgres) · Vercel · OpenAI Realtime API · n8n

Built by HSBridge AI — Kajaani, Finland
