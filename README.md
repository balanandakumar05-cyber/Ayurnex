# AYURNEX

AYURNEX is an AI-powered Ayurveda knowledge assistant. The project contains a React/Vite frontend, a FastAPI backend, a PostgreSQL + pgvector knowledge base, and a Gemini-powered RAG pipeline.

## Architecture

```text
React / Vite
    |
    | POST /chat
    v
FastAPI
    |
    v
RAG pipeline
    |
    +--> Gemini embeddings --> PostgreSQL + pgvector
    |
    +--> Gemini generation
    |
    v
Answer + source metadata
```

## Run the database

From the project root:

```bash
docker compose up -d
```

The database is exposed on `localhost:5432` and initialized from `sql/init.sql` on first creation of the volume.

## Configure the backend

Create `backend/.env` (or copy the values from `.env.example`) and set:

```env
DATABASE_URL=postgresql://raguser:change-me@localhost:5432/ragdb
GEMINI_API_KEY=your_gemini_api_key_here
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

## Start the backend API

From the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

Useful endpoints:

- `GET /` — backend information
- `GET /health` — health check
- `POST /chat` — ask AYURNEX a question
- `GET /docs` — interactive FastAPI documentation

Example request body:

```json
{
  "country": "IN",
  "language": "en",
  "question": "What are the traditional uses of Ashwagandha?"
}
```

## Start the frontend

In a second terminal:

```bash
npm install
npm run dev
```

The frontend calls `http://localhost:8000` by default. To change it, create a root `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

## RAG ingestion

PDFs are stored in `data/documents/`. The existing ingestion code can process the project documents and store their chunks and embeddings in PostgreSQL + pgvector.

Before the SIH final build, review the MVP ingestion limit in `backend/rag/ingest.py` and confirm which documents should be included in the authoritative knowledge base.

## Important

Never commit real API keys or passwords. Keep `backend/.env` local and use the example environment files as templates.
