# Multi-Agent Scheduling Assistant

AI-powered appointment scheduling via natural conversation. Built with LangGraph, FastAPI, React, and Groq (free tier).

## Stack

| Layer | Tech |
|---|---|
| LLM | Groq (`llama-3.3-70b-versatile`) — free tier |
| Agent Framework | LangGraph 1.x — triage + booking specialist |
| Backend | FastAPI + SQLAlchemy async + SQLite |
| State Persistence | `AsyncSqliteSaver` (LangGraph checkpoint) |
| Frontend | React 18 + Vite + TypeScript + Tailwind |
| Deploy Backend | Render free tier |
| Deploy Frontend | Vercel free tier |

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env        # then edit .env — see note below
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> **`GROQ_API_KEY` is required** — the app will fail to start without it. Get a free
> key at https://console.groq.com. `SMTP_USER`/`SMTP_PASSWORD` are **optional**: if
> left blank, `send_booking_notification` simulates the email (logs it, returns
> success) instead of actually sending one, so the full booking flow still works
> without a Gmail App Password.

The server auto-creates all tables and seeds 30 days of availability slots on first start.

### Frontend

```bash
cd frontend
cp .env.example .env.local  # Set VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

### Backend (`.env`)

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | From https://console.groq.com — free account |
| `DATABASE_URL` | SQLite path, e.g. `sqlite+aiosqlite:///./scheduling.db` |
| `CHECKPOINT_DB_URL` | LangGraph checkpoint DB, e.g. `./checkpoints.db` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASSWORD` | Gmail App Password (16-char, from Google Account → Security → App Passwords) |
| `ALLOWED_ORIGINS` | Frontend URL, e.g. `https://your-app.vercel.app` |

### Frontend (`.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL, e.g. `https://your-api.onrender.com` |

## Deployment

### Render (Backend)

1. Push to GitHub
2. New Web Service → connect repo → set Root Directory: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
5. Add Disk: mount `/data`, 1 GB
6. Set env vars (see `render.yaml`)

### Vercel (Frontend)

1. Import GitHub repo → set Root Directory: `frontend`
2. Framework: Vite | Build: `npm run build` | Output: `dist`
3. Add `VITE_API_URL` env var pointing to your Render URL

## Architecture

```
User ──▶ React SPA (Vercel)
           │  POST /api/v1/chat/messages
           ▼
         FastAPI (Render)
           │
           ▼
         LangGraph StateGraph
         ┌─────────────────────────┐
         │  START → triage         │
         │    ↓ (booking intent)   │
         │  booking_specialist     │
         │    ↕ (tool calls)       │
         │  tools (ToolNode)       │
         │    • check_availability │
         │    • reserve_slot       │
         │    • send_notification  │
         │  → END                  │
         └─────────────────────────┘
           │
           ▼
         SQLite (app data + LangGraph checkpoints)
```

## API Endpoints

```
POST   /api/v1/chat/messages                 Send message, get agent response
GET    /api/v1/chat/threads/:id/history      Restore conversation
POST   /api/v1/chat/threads                  Create thread

GET    /api/v1/bookings                      List bookings (?page&email&status)
GET    /api/v1/bookings/:id                  Get booking
DELETE /api/v1/bookings/:id                  Cancel booking

GET    /api/v1/availability?date=tomorrow    Check open slots
POST   /api/v1/availability/seed             Seed slots (admin)

GET    /health                               Liveness
GET    /health/db                            DB readiness
```
