# Multi-Agent Scheduling Assistant

AI-powered appointment scheduling system built with **LangGraph**, **FastAPI**, **React**, **SQLite**, and **Groq**. The application uses a multi-agent workflow to understand user intent, manage appointment bookings, validate scheduling requests through tools, persist conversation state, and send booking confirmation notifications.

---

# Features

- Multi-agent architecture using LangGraph
- Triage Agent for intent classification
- Booking Specialist Agent for appointment scheduling
- Tool-based booking validation
- Persistent conversation memory using LangGraph Checkpointer
- SQLite database for bookings and availability
- Mock email notifications
- FastAPI REST API
- React + TypeScript frontend
- Responsive chat interface
- Deployable on Render and Vercel
- Uses Groq Free Tier LLM

---

# Technology Stack

| Layer | Technology |
|--------|------------|
| LLM | Groq (`llama-3.3-70b-versatile`) |
| AI Framework | LangGraph |
| Backend | FastAPI |
| ORM | SQLAlchemy Async |
| Database | SQLite |
| Checkpoint Storage | AsyncSqliteSaver |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Deployment | Render + Vercel |

---

# System Architecture

```text
┌─────────────────────────────────────────────────────┐
│                   React SPA (Vercel)                │
│              Chat UI + Bookings Page                │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ POST /api/v1/chat/messages
                       │ X-API-Key Header
                       ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI (Render)                   │
│         CORS • Authentication • Rate Limiting       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              LangGraph StateGraph                   │
│                                                     │
│  START                                              │
│    │                                                │
│    ▼                                                │
│  Triage Agent                                       │
│    │                                                │
│    ├──────────────► General Response                │
│    │                                                │
│    ▼                                                │
│ Booking Specialist                                  │
│    │                                                │
│    ▼                                                │
│ ToolNode                                            │
│   ├── check_availability()                          │
│   ├── reserve_slot()                                │
│   └── send_booking_notification()                   │
│    │                                                │
│    ▼                                                │
│   END                                               │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 SQLite Database                     │
│                                                     │
│  Bookings                                           │
│  Availability                                       │
│  LangGraph Checkpoints                              │
└─────────────────────────────────────────────────────┘
```

---

# Agent Workflow

## Triage Agent

Responsibilities

- Understand user intent
- Respond to general questions
- Detect booking requests
- Route booking requests to the Booking Specialist

---

## Booking Specialist

Responsibilities

- Collect booking information
- Validate requested date and time
- Check slot availability
- Reserve appointments
- Trigger confirmation notifications

---

# Tool Functions

## check_availability()

Checks whether a requested appointment slot is available.

---

## reserve_slot()

Creates a booking in the database after validation.

---

## send_booking_notification()

Sends a confirmation email (mock implementation).

---

# Project Structure

```text
.
├── backend
│   ├── app
│   │   ├── agents
│   │   ├── api
│   │   ├── core
│   │   ├── database
│   │   ├── graph
│   │   ├── models
│   │   ├── schemas
│   │   ├── services
│   │   ├── tools
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
└── README.md
```

---

# Quick Start

## Clone Repository

```bash
git clone https://github.com/yourusername/multi-agent-scheduling-assistant.git

cd multi-agent-scheduling-assistant
```

---

# Backend Setup

```bash
cd backend

cp .env.example .env

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

The application automatically:

- Creates database tables
- Initializes LangGraph checkpoint database
- Seeds availability slots

Backend runs at

```
http://localhost:8000
```

---

# Frontend Setup

```bash
cd frontend

cp .env.example .env.local

npm install

npm run dev
```

Frontend runs at

```
http://localhost:8080
```

---

# Environment Variables

## Backend

| Variable | Description |
|----------|-------------|
| GROQ_API_KEY | Groq API Key |
| DATABASE_URL | SQLite database URL |
| CHECKPOINT_DB_URL | LangGraph checkpoint database |
| SMTP_HOST | SMTP server |
| SMTP_PORT | SMTP port |
| SMTP_USER | Email address |
| SMTP_PASSWORD | Gmail App Password |
| ALLOWED_ORIGINS | Frontend URL |

Example

```env
GROQ_API_KEY=xxxxxxxxxxxxxxxx

DATABASE_URL=sqlite+aiosqlite:///./scheduling.db

CHECKPOINT_DB_URL=./checkpoints.db

SMTP_HOST=smtp.gmail.com

SMTP_PORT=587

SMTP_USER=example@gmail.com

SMTP_PASSWORD=xxxxxxxxxxxxxxxx

ALLOWED_ORIGINS=http://localhost:8080

VITE_BOOKINGS_API_KEY= generate a random secrect key
```

---

## Frontend

```env
VITE_API_URL=http://localhost:8000
SUPABASE_PROJECT_ID=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
```

---

# API Endpoints

## Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/messages` | Send message |
| POST | `/api/v1/chat/threads` | Create conversation |
| GET | `/api/v1/chat/threads/{id}/history` | Conversation history |

---

## Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/bookings` | List bookings |
| GET | `/api/v1/bookings/{id}` | Booking details |
| DELETE | `/api/v1/bookings/{id}` | Cancel booking |

---

## Availability

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/availability` | Available slots |
| POST | `/api/v1/availability/seed` | Seed slots |

---

## Health

| Method | Endpoint |
|--------|----------|
| GET | `/health` |
| GET | `/health/db` |

---

# Request Flow

```text
User

      │

      ▼

React Frontend

      │

      ▼

FastAPI

      │

      ▼

LangGraph

      │

      ▼

Triage Agent

      │

 ┌────┴─────┐

 │          │

 ▼          ▼

General   Booking

 Reply    Specialist

             │

             ▼

         ToolNode

             │

             ├── Check Availability

             ├── Reserve Slot

             └── Send Notification

             │

             ▼

          SQLite

             │

             ▼

      Response Returned
```

---

# Deployment

## Backend

Deploy on Render.

Build Command

```bash
pip install -r requirements.txt
```

Start Command

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## Frontend

Deploy on Vercel.

Build Command

```bash
npm run build
```

Output Directory

```
dist
```

Set

```
VITE_API_URL=https://your-render-service.onrender.com
```

---

# Security

- API Key Authentication
- CORS Protection
- Input Validation
- Rate Limiting
- Environment Variable Configuration
- SQLAlchemy Parameterized Queries

---

# Future Improvements

- Google Calendar Integration
- Outlook Calendar Integration
- PostgreSQL Support
- Docker Deployment
- JWT Authentication
- OAuth Login
- Admin Dashboard
- SMS Notifications
- Calendar Synchronization

---

# License

This project is licensed under the MIT License.
