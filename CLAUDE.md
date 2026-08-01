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
pip install -r requirements-ocr.txt              # OCR deps (PaddleOCR, PyMuPDF, torch+CUDA for HunyuanOCR)
alembic upgrade head                             # Run DB migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000  # Start dev server
```

Requires MySQL running with database `wrong_questions` (utf8mb4). Create `.env` in `backend/`:
```
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/wrong_questions
JWT_SECRET=<random>
ENCRYPTION_KEY=<fernet-key>
HUNYUAN_MODEL_DIR=D:/AI_code/hunyuanOCR/HunyuanOCR   # 可选，HunyuanOCR 本地模型目录
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
    main.py           # App entry: CORS middleware (allow_origins list), rate limiter, static mount /uploads, router registration
    config.py         # pydantic-settings, reads .env, startup validation of required secrets
    database.py       # SQLAlchemy engine, SessionLocal, Base
    dependencies.py   # get_current_user (JWT Bearer → user from DB, validates token_version + token_family)
    models/           # SQLAlchemy ORM models (16 tables)
    schemas/          # Pydantic request/response schemas
    routers/          # FastAPI routers: auth, subjects, tags, questions, ocr, draft, review, ai_chat, stats, export, notes, settings
    services/         # Business logic: auth, question, review, subject, tag, ocr, ai, fsrs, hunyuan_ocr
    utils/security.py # bcrypt hashing, JWT create/decode, Fernet encrypt/decrypt
  migrations/         # Alembic migrations
  uploads/            # User-uploaded files (images, avatars, exports)
  logs/               # Loguru log files

frontend/
  src/
    api/              # Axios API clients (client.ts has token refresh interceptor)
    store/AuthContext.tsx  # Auth state: useReducer, localStorage for tokens+user, /me on init
    components/       # Shared: MarkdownEditor, MarkdownViewer (rich text), ImageCropper, AppLayout, ProtectedRoute, game24/ (Game24Provider, FloatingButton, Modal)
    game24/           # 算24游戏纯逻辑引擎 (engine.ts: token/有理数求值/求解器/难度判定/出题)
    pages/            # Route pages: Dashboard, Questions, QuestionAdd, QuestionDetail, BatchEdit, ReviewCenter, ReviewSession, ReviewResult, SelectQuestions, Stats, Settings, Profile, AIChat, OCR, PDFImport, DraftBox
    types/index.ts    # TypeScript interfaces
```

### Key Design Decisions

- **Answer storage**: Always a JSON string in `question.answer`. Structure varies by answer type: `{options, correct}` for choice, `{blanks}` for fill, `{reference}` for subjective. No server-side validation of answer shape — enforced by UI.
- **JWT token_version + token_family**: Both claims in JWT payload (`ver`, `fam`). On refresh, `token_version` is bumped → all existing tokens invalidated (prevents refresh reuse). On logout, `token_family` is regenerated → all tokens revoked.
- **Question codes**: Generated dynamically as `YYYYMMDD_seqTYPE_ABBR` (e.g., `20260728_01CT`). Computed via `compute_question_codes()` using SQL window functions. Type abbreviations: CT=选择, FT=填空, SA=简答, QA=问答, SB=主观, TF=判断, ES=论述.
- **AI streaming**: Uses `httpx.AsyncClient.stream()` context manager (NOT `client.post()` or `client.send()`). KaTeX renders LaTeX formulas in chat responses (`\(inline\)` and `\[display\]`).
- **OCR engines**: Two engines behind `ocr_recognize(engine=...)` — `paddle` (local PaddleOCR, CPU) and `hunyuan` (local HunyuanOCR model inference, requires NVIDIA GPU, model dir from `HUNYUAN_MODEL_DIR`, lazy-loaded singleton in `services/hunyuan_ocr.py`). Default is `hunyuan`. PDF import renders at most 30 pages.
- **Spaced repetition**: Self-implemented FSRS in `services/fsrs.py` — stability/difficulty/retrievability math, target retention configurable per-user (default 0.90, settings range 0.70–0.99). `_get_due_question_ids` returns questions with `next_review_at <= now` (fsrs_state) + never-reviewed questions. Rating scale: 1=Again 2=Hard 3=Good 4=Easy.
- **Frontend routing** (`react-router-dom v7`): `ProtectedRoute` wrapper checks auth state. Paths: `/login`, `/register`, `/`, `/questions`, `/questions/add`, `/questions/ocr`, `/questions/pdf`, `/questions/batch-edit`, `/questions/:id`, `/review`, `/review/session`, `/review/select`, `/review/result`, `/stats`, `/settings`, `/profile`, `/drafts`, `/ai-chat`.
- **算24小游戏**: Per-account toggle stored in `UserConfig` (`game24_enabled`, endpoints `GET/PUT /api/settings/game24-enabled`). When on, a draggable floating button (position persisted in localStorage) shows on every page bottom-left; clicking opens a Modal with two modes (practice / 60s challenge). Difficulty by solution complexity: easy=1-9 integer-only solutions, medium=1-10, hard=1-13 fraction-only solutions. All logic is pure frontend in `game24/engine.ts` (token-based expression, Fraction arithmetic, exhaustive solver) — no backend solving.
