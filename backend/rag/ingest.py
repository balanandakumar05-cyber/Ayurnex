from __future__ import annotations

import hashlib

from .chunker import chunk_pages
from .config import Settings
from .database import connection, find_document_by_hash, insert_chunks, upsert_document
from .embeddings import GeminiEmbedder
from .pdf_loader import find_pdfs, load_pdf
from .text_cleaner import clean_pages


# MVP: ingest only 20 Ayurveda chunks.
MAX_MVP_CHUNKS = 20


def file_sha256(path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)

    return digest.hexdigest()


def ingest(settings: Settings) -> None:
    pdfs = find_pdfs(settings.documents_dir)

    print(f"Found {len(pdfs)} PDF files.")

    if not pdfs:
        print(f"Add verified Ayurveda PDFs under {settings.documents_dir} and run again.")
        return

    embedder = GeminiEmbedder(settings)

    with connection(settings.database_url) as conn:

        for path in pdfs:

            # MVP: process only the Approved AYUSH document.
            if not path.name.lower().startswith("approved-ayush"):
                print(f"Skipping for MVP: {path.name}")
                continue

            print(f"\nProcessing: {path.name}")

            digest = file_sha256(path)

            existing = find_document_by_hash(conn, digest)

            if existing:
                print(f"Skipped duplicate document already stored as {existing[1]}.")
                continue

            loaded = load_pdf(path)

            pages = clean_pages(
                [(page.page_number, page.text) for page in loaded.pages]
            )

            chunks = chunk_pages(
                pages,
                settings.chunk_size,
                settings.chunk_overlap,
            )

            if not chunks:
                print("Failed: no non-empty chunks after extraction.")
                continue

            # MVP: keep only the first 20 chunks.
            chunks = chunks[:MAX_MVP_CHUNKS]

            print(f"Chunks selected for MVP: {len(chunks)}")

            embeddings = embedder.embed_texts(
                [chunk.content for chunk in chunks]
            )

            document_id = upsert_document(
                conn,
                path,
                digest,
                loaded.page_count,
                loaded.metadata,
            )

            insert_chunks(
                conn,
                document_id,
                chunks,
                embeddings,
            )

            conn.commit()

            print(f"Pages extracted: {loaded.page_count}")
            print(f"Chunks stored: {len(chunks)}")
            print("\nMVP ingestion completed successfully.")
            print("Stopping after 20 Ayurveda chunks.")

            return


if __name__ == "__main__":
    try:
        ingest(Settings.from_env())
    except Exception as exc:
        raise SystemExit(f"Ingestion failed: {exc}")