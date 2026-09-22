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


# Documents that should NOT be part of the Ayurveda/AYUSH
# medical knowledge base.
EXCLUDED_FILES = {
    "PATENT ACT1970.pdf",
}


def file_sha256(path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for block in iter(
            lambda: source.read(1024 * 1024),
            b"",
        ):
            digest.update(block)

    return digest.hexdigest()


def ingest(settings: Settings) -> None:

    # ---------------------------------------------------------
    # 1. Find all PDFs
    # ---------------------------------------------------------
    pdfs = find_pdfs(settings.documents_dir)

    print(f"Found {len(pdfs)} PDF files.")

    if not pdfs:
        print(
            f"No PDFs found in: "
            f"{settings.documents_dir}"
        )
        return

    embedder = GeminiEmbedder(settings)

    total_documents = 0
    total_chunks = 0
    skipped_documents = 0
    failed_documents = 0

    # ---------------------------------------------------------
    # 2. Connect to PostgreSQL
    # ---------------------------------------------------------
    with connection(settings.database_url) as conn:

        for path in pdfs:

            print("\n" + "=" * 70)
            print(f"Processing: {path.name}")
            print("=" * 70)

            # -------------------------------------------------
            # Skip excluded documents
            # -------------------------------------------------
            if path.name in EXCLUDED_FILES:
                print(
                    f"Skipping excluded document: "
                    f"{path.name}"
                )
                skipped_documents += 1
                continue

            try:

                # ---------------------------------------------
                # 3. Calculate document hash
                # ---------------------------------------------
                digest = file_sha256(path)

                # ---------------------------------------------
                # 4. Skip duplicate documents
                # ---------------------------------------------
                existing = find_document_by_hash(
                    conn,
                    digest,
                )

                if existing:
                    print(
                        "Duplicate document detected."
                    )
                    print(
                        f"Already stored as: "
                        f"{existing[1]}"
                    )

                    skipped_documents += 1
                    continue

                # ---------------------------------------------
                # 5. Extract PDF
                # ---------------------------------------------
                loaded = load_pdf(path)

                print(
                    f"Pages extracted: "
                    f"{loaded.page_count}"
                )

                # ---------------------------------------------
                # 6. Clean page text
                # ---------------------------------------------
                pages = clean_pages(
                    [
                        (
                            page.page_number,
                            page.text,
                        )
                        for page in loaded.pages
                    ]
                )

                # ---------------------------------------------
                # 7. Create chunks
                # ---------------------------------------------
                chunks = chunk_pages(
                    pages,
                    settings.chunk_size,
                    settings.chunk_overlap,
                )

                if not chunks:
                    print(
                        "Failed: no non-empty chunks "
                        "after extraction."
                    )

                    failed_documents += 1
                    continue

                print(
                    f"Chunks created: "
                    f"{len(chunks)}"
                )

                # ---------------------------------------------
                # 8. Generate local embeddings
                # ---------------------------------------------
                print(
                    "Generating embeddings..."
                )

                embeddings = embedder.embed_texts(
                    [
                        chunk.content
                        for chunk in chunks
                    ]
                )

                print(
                    f"Embeddings generated: "
                    f"{len(embeddings)}"
                )

                # ---------------------------------------------
                # 9. Store document metadata
                # ---------------------------------------------
                document_id = upsert_document(
                    conn,
                    path,
                    digest,
                    loaded.page_count,
                    loaded.metadata,
                )

                # ---------------------------------------------
                # 10. Store chunks + embeddings
                # ---------------------------------------------
                insert_chunks(
                    conn,
                    document_id,
                    chunks,
                    embeddings,
                )

                # ---------------------------------------------
                # 11. Commit this document
                # ---------------------------------------------
                conn.commit()

                total_documents += 1
                total_chunks += len(chunks)

                print(
                    f"Successfully stored: "
                    f"{path.name}"
                )

                print(
                    f"Chunks stored: "
                    f"{len(chunks)}"
                )

            except Exception as exc:

                # Roll back only the current document
                # so another PDF can still be processed.
                conn.rollback()

                failed_documents += 1

                print(
                    f"FAILED: {path.name}"
                )

                print(
                    f"Reason: {exc}"
                )

                print(
                    "Continuing with the next PDF..."
                )

    # ---------------------------------------------------------
    # 12. Final summary
    # ---------------------------------------------------------
    print("\n" + "=" * 70)
    print("AYURNEX INGESTION SUMMARY")
    print("=" * 70)

    print(
        f"New documents stored: "
        f"{total_documents}"
    )

    print(
        f"New chunks stored: "
        f"{total_chunks}"
    )

    print(
        f"Skipped documents: "
        f"{skipped_documents}"
    )

    print(
        f"Failed documents: "
        f"{failed_documents}"
    )

    print("=" * 70)


if __name__ == "__main__":
    try:
        ingest(Settings.from_env())
    except Exception as exc:
        raise SystemExit(
            f"Ingestion failed: {exc}"
        )