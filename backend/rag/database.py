from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import psycopg
from pgvector.psycopg import register_vector
from psycopg.types.json import Jsonb

from .chunker import Chunk


class DatabaseError(RuntimeError):
    pass


@contextmanager
def connection(database_url: str) -> Iterator[psycopg.Connection]:
    try:
        with psycopg.connect(database_url) as conn:
            register_vector(conn)
            yield conn
    except Exception as exc:
        raise DatabaseError(f"Could not connect to PostgreSQL or use pgvector: {exc}") from exc


def check_connection(database_url: str) -> bool:
    with connection(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            if cur.fetchone() is None:
                raise DatabaseError("The pgvector extension is not enabled in the existing database.")
            cur.execute("SELECT to_regclass('public.documents'), to_regclass('public.document_chunks')")
            tables = cur.fetchone()
            if not all(tables):
                raise DatabaseError("Existing AYURNEX tables documents/document_chunks were not found.")
    return True


def find_document_by_hash(conn: psycopg.Connection, file_hash: str):
    with conn.cursor() as cur:
        cur.execute("SELECT id, filename, file_sha256 FROM documents WHERE file_sha256 = %s", (file_hash,))
        return cur.fetchone()


def upsert_document(conn: psycopg.Connection, path: Path, file_hash: str, page_count: int, pdf_metadata: dict[str, str]):
    metadata = {"pdf_metadata": pdf_metadata, "ingestion": "ayurnex-rag"}
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO documents(source_path, filename, title, language, file_sha256,
              file_size_bytes, page_count, metadata)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT(source_path) DO UPDATE SET
              filename=EXCLUDED.filename, title=EXCLUDED.title,
              file_sha256=EXCLUDED.file_sha256, file_size_bytes=EXCLUDED.file_size_bytes,
              page_count=EXCLUDED.page_count, metadata=EXCLUDED.metadata, updated_at=now()
            RETURNING id
        """, (str(path), path.name, path.stem, "en", file_hash, path.stat().st_size, page_count, Jsonb(metadata)))
        return cur.fetchone()[0]


def insert_chunks(conn: psycopg.Connection, document_id, chunks: list[Chunk], embeddings: list[list[float]]):
    if len(chunks) != len(embeddings):
        raise DatabaseError("Chunk and embedding counts do not match.")
    with conn.cursor() as cur:
        for chunk, embedding in zip(chunks, embeddings):
            cur.execute("""
                INSERT INTO document_chunks(document_id, chunk_index, page_start, page_end,
                  chapter_title, section_title, heading, content, content_hash, token_count,
                  embedding, metadata)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(document_id, chunk_index) DO UPDATE SET
                  page_start=EXCLUDED.page_start, page_end=EXCLUDED.page_end,
                  chapter_title=EXCLUDED.chapter_title, section_title=EXCLUDED.section_title,
                  heading=EXCLUDED.heading, content=EXCLUDED.content,
                  content_hash=EXCLUDED.content_hash, token_count=EXCLUDED.token_count,
                  embedding=EXCLUDED.embedding, metadata=EXCLUDED.metadata
            """, (document_id, chunk.chunk_index, chunk.page_start, chunk.page_end,
                  chunk.chapter_title, chunk.section_title, chunk.heading, chunk.content,
                  chunk.content_hash, chunk.token_count, embedding,
                  Jsonb({"source": "pdf", "content_hash": chunk.content_hash})))


def match_chunks(
    conn: psycopg.Connection,
    query_embedding: list[float],
    top_k: int,
    metadata_filter: dict | None = None,
):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT * FROM match_chunks(
                %s::vector,
                %s,
                %s
            )
            """,
            (
                query_embedding,
                top_k,
                Jsonb(metadata_filter or {}),
            ),
        )
        columns = [desc.name for desc in cur.description]
        return [dict(zip(columns, row)) for row in cur.fetchall()]