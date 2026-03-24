# Agent Fleet — How AI Answers Work

## Connection Flow

```
Dashboard (browser)
    │
    │  POST /api/agents/:id/prompt
    │  Body: { message: "What did we discuss?" }
    │  Headers: Authorization: Bearer <JWT>
    │
    ▼
server.js / api/index.js (Vercel)
    │  Route: /api/agents/:id/prompt
    │
    ▼
api/agent-prompt.js
    │  1. Load agent from DB (agents table)
    │  2. Get persona from agent-personas.js
    │  3. Build memory from recent episodes
    │
    ▼
OpenRouter API (https://openrouter.ai/api/v1/chat/completions)
    │  Model: meta-llama/llama-3.3-70b-instruct:free
    │  Auth: OPENROUTER_API_KEY
    │
    ▼
Response → episode saved → reply shown in Dashboard
```

## Requirements

| What | Where |
|------|-------|
| **OPENROUTER_API_KEY** | `.env` (local) or **Vercel → Project Settings → Environment Variables** |
| **Login** | Must be logged in (teacher or learner). Token in `sb_token` or `knuut_token`. |
| **Agents in DB** | Seed data in `src/data/schema.sql` inserts Hank, Jules, Cleo, Atlas, Adrian, Nelli, Nova. |

## If Agents Don't Work

1. **"OPENROUTER_API_KEY not set"** → Add the key to Vercel env vars and redeploy.
2. **"AI service error: ..."** → Check the full message. Common causes:
   - Invalid/expired API key
   - OpenRouter rate limit
   - Model unavailable (try a different model in `api/agent-prompt.js`)
3. **401 Unauthorized** → Log in again. Token may have expired.
4. **Empty response** → OpenRouter may have returned an error; check server logs.

## Vercel Deployment

Ensure these are set in **Vercel → Project → Settings → Environment Variables**:

- `OPENROUTER_API_KEY` (or `OPENROUTER_API_KEY_2`)
- `DATABASE_URL`
- `JWT_SECRET`
