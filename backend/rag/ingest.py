from __future__ import annotations

import hashlib

from .chunker import chunk_pages
from .config import Settings
from .database import (
    connection,
    find_document_by_hash,
    insert_chunks,
    upsert_document,
)
from .embeddings import GeminiEmbedder
from .pdf_loader import find_pdfs, load_pdf
from .text_cleaner import clean_pages


# Process 40 chunks per ingestion run.
MAX_CHUNKS_PER_RUN = 40


def file_sha256(path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)

    return digest.hexdigest()


def get_stored_chunk_count(conn, document_id) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM document_chunks
            WHERE document_id = %s
            """,
            (document_id,),
        )
        return cur.fetchone()[0]


def ingest(settings: Settings) -> None:
    pdfs = find_pdfs(settings.documents_dir)

    print(f"Found {len(pdfs)} PDF files.")

    if not pdfs:
        print(
            f"Add verified Ayurveda PDFs under "
            f"{settings.documents_dir} and run again."
        )
        return

    embedder = GeminiEmbedder(settings)

    with connection(settings.database_url) as conn:

        for path in pdfs:

            # Keep the legal Patent Act document out of
            # the Ayurveda medical knowledge base.
            if not path.name.lower().startswith("approved-ayush"):
                print(f"Skipping non-Ayurveda document: {path.name}")
                continue

            print(f"\nProcessing: {path.name}")

            digest = file_sha256(path)

            existing = find_document_by_hash(conn, digest)

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

            total_chunks = len(chunks)

            # If the document already exists, resume from the
            # number of chunks already stored.
            if existing:
                document_id = existing[0]

                stored_count = get_stored_chunk_count(
                    conn,
                    document_id,
                )

                print(f"Chunks already stored: {stored_count}")

                if stored_count >= total_chunks:
                    print("All chunks are already stored.")
                    continue

                start_index = stored_count

            else:
                document_id = upsert_document(
                    conn,
                    path,
                    digest,
                    loaded.page_count,
                    loaded.metadata,
                )

                start_index = 0

            end_index = min(
                start_index + MAX_CHUNKS_PER_RUN,
                total_chunks,
            )

            chunks_to_process = chunks[start_index:end_index]

            print(f"Total chunks created: {total_chunks}")
            print(
                f"Processing chunks "
                f"{start_index + 1}-{end_index} "
                f"of {total_chunks}"
            )

            print("Generating embeddings...")

            embeddings = embedder.embed_texts(
                [chunk.content for chunk in chunks_to_process]
            )

            insert_chunks(
                conn,
                document_id,
                chunks_to_process,
                embeddings,
            )

            conn.commit()

            print(
                f"Chunks stored this run: "
                f"{len(chunks_to_process)}"
            )

            remaining = total_chunks - end_index

            print(f"Remaining chunks: {remaining}")

            if remaining == 0:
                print(
                    "\nFull Ayurveda document ingestion "
                    "completed successfully."
                )
            else:
                print(
                    "\nBatch completed successfully."
                    "\nRun the same command again to continue."
                )


if __name__ == "__main__":
    try:
        ingest(Settings.from_env())
    except Exception as exc:
        raise SystemExit(f"Ingestion failed: {exc}")