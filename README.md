# Conversational AI Platform

Conversational AI chat platform with Gemini-powered streaming responses, structured entities/KG extraction, per-conversation memory, and user accounts.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Redux Toolkit, React Router v7, Axios
- **Backend:** Python, Flask, SQLAlchemy, Flask-JWT-Extended, LangChain / LangGraph, Gemini, Redis
- **Features:** Streaming chat (SSE), multi-user auth with JWT cookies, conversation history, memory, chat naming

## Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- Gemini API key
- Redis URL (optional — backend degrades gracefully if down)

### Environment Variables

Backend: copy `backend/.env.example` to `backend/.env` and fill your keys.

Frontend for local dev: copy `frontend/.env.example` to `frontend/.env.local` if you want a custom API URL (optional — defaults to the `/api` dev proxy).

### Development

```bash
# Terminal 1 — Backend (port 5000)
cd backend
pip install -r requirements.txt
python app.py

# Terminal 2 — Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:5000` automatically.

### Production

```bash
cd frontend && npm run build
cd ../backend && gunicorn -c gunicorn.conf.py "app:create_app()"
```

Flask serves the built frontend from `frontend/dist` and handles all API routes under `/api` — single origin, no CORS needed.

## Deployment (Render — single service)

The frontend is built by the backend's start pipeline — deploy only the backend, like the RAG chatbot:

1. Push repo to GitHub
2. Create a **Web Service** on [Render](https://render.com) (repo: `mohitnawani/conversational-ai-platform`)
3. Use the included `render.yaml` (Blueprints) or configure manually:

| Field | Value |
|-------|-------|
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r backend/requirements.txt && cd frontend && npm install && npm run build` |
| **Start Command** | `cd backend && gunicorn -c gunicorn.conf.py "app:create_app()"` |
| **Health Check** | `GET /api/health` |
| **Environment Variables** | `GOOGLE_API_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `JWT_COOKIE_SECURE=true`, `CORS_ORIGINS` (optional) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in (JWT cookie) |
| POST | `/api/auth/logout` | Log out (revokes token) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Get conversation + messages |
| POST | `/api/conversations/:id/message` | Send message (JSON) |
| POST | `/api/conversations/:id/message/stream` | Send message (SSE streaming) |
| DELETE | `/api/conversations/:id` | Delete conversation |

## Project Structure

```
conversational-ai-platform/
├── backend/
│   ├── models/            # SQLAlchemy models (User, Conversation, Message)
│   ├── routes/            # auth, conversations, messages blueprints
│   ├── schemas/           # request validation
│   ├── services/          # LLM pipeline, token blocklist
│   ├── app.py             # Flask app — serves API + built frontend
│   ├── config.py
│   ├── requirements.txt
│   └── gunicorn.conf.py   # tuned for SSE streaming
├── frontend/
│   ├── src/
│   │   ├── lib/           # axios client
│   │   ├── pages/         # Auth, Chat pages
│   │   ├── store/         # Redux slices + thunks (SSE streaming)
│   │   ├── App.tsx        # Routes
│   │   └── main.tsx
│   ├── vite.config.ts     # /api dev proxy
│   └── package.json
└── render.yaml            # single-service deploy
```