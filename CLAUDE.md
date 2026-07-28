# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

错题收集重做系统 — A wrong-answer review system with FastAPI backend + React frontend. Features: question bank management, AI-powered OCR entry, AI chat for problem solving, spaced repetition review, and data export.

## Development Commands

### Backend (FastAPI + MySQL)

```bash
cd backend
.venv\Scripts\activate                          # Activate virtual environment
pip install -r requirements.txt                  # Core deps
pip install -r requirements-ocr.txt              # OCR deps (PaddleOCR, PyMuPDF)
alembic upgrade head                             # Run DB migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000  # Start dev server
```

Requires MySQL running with database `wrong_questions` (utf8mb4). Create `.env` in `backend/`:
```
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/wrong_questions
JWT_SECRET=<random>
ENCRYPTION_KEY=<fernet-key>
```

### Frontend (React + Vite + Ant Design)

```bash
cd frontend
npm install
npm run dev       # Dev server at localhost:5173, proxies /api → localhost:8000
npm run build     # Production build
npm run lint      # Oxlint
```

## Architecture

```
backend/
  app/
    main.py           # App entry: CORS middleware (origin_regex), rate limiter, static mount /uploads, router registration
    config.py         # pydantic-settings, reads .env
    database.py       # SQLAlchemy engine, SessionLocal, Base
    dependencies.py   # get_current_user (JWT Bearer → user from DB, validates token_version)
    models/           # SQLAlchemy ORM models (13 tables)
    schemas/          # Pydantic request/response schemas
    routers/          # FastAPI routers: auth, subjects, tags, questions, ocr, draft, review, ai_chat, stats, export, settings
    services/         # Business logic: auth, question, review, subject, tag, ocr, ai
    utils/security.py # bcrypt hashing, JWT create/decode, Fernet encrypt/decrypt
  migrations/         # Alembic migrations
  uploads/            # User-uploaded files (images, avatars, exports)
  logs/               # Loguru log files

frontend/
  src/
    api/              # Axios API clients (client.ts has token refresh interceptor)
    store/AuthContext.tsx  # Auth state: useReducer, localStorage for tokens+user, /me on init
    components/       # Shared: TiptapEditor, TiptapViewer (rich text), AiChatPanel, ImageCropper, AppLayout, ProtectedRoute
    pages/            # Route pages: Dashboard, Questions, QuestionAdd, QuestionDetail, ReviewCenter, ReviewSession, ReviewResult, Stats, Settings, Profile, AIChat, OCR, PDFImport, DraftBox
    types/index.ts    # TypeScript interfaces
```

### Key Design Decisions

- **Answer storage**: Always a JSON string in `question.answer`. Structure varies by answer type: `{options, correct}` for choice, `{blanks}` for fill, `{reference}` for subjective. No server-side validation of answer shape — enforced by UI.
- **JWT token_version**: Included in JWT payload (`ver` claim). On refresh, `token_version` is bumped → all existing tokens invalidated. This prevents refresh token reuse.
- **Question codes**: Generated dynamically as `YYYYMMDD_seqTYPE_ABBR` (e.g., `20260728_01CT`). Computed via `compute_question_codes()` using SQL window functions. Type abbreviations: CT=选择, FT=填空, SA=简答, QA=问答, SB=主观, TF=判断, ES=论述.
- **AI streaming**: Uses `httpx.AsyncClient.stream()` context manager (NOT `client.post()` or `client.send()`). KaTeX renders LaTeX formulas in chat responses (`\(inline\)` and `\[display\]`).
- **Spaced repetition**: Intervals configurable per-user (default: 20m, 1h, 1d, 2d, 6d, 31d). `_get_due_question_ids` returns questions with `sr_next_review <= now` + never-reviewed questions.
- **Frontend routing** (`react-router-dom v7`): `ProtectedRoute` wrapper checks auth state. Paths: `/login`, `/register`, `/dashboard`, `/questions`, `/questions/add`, `/questions/:id`, `/questions/ocr`, `/questions/pdf`, `/review`, `/review/session`, `/review/result`, `/stats`, `/chat`, `/settings`, `/profile`, `/drafts`.
