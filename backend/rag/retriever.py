from __future__ import annotations

from .config import Settings
from .database import connection, match_chunks
from .embeddings import GeminiEmbedder


def retrieve(question: str, settings: Settings, metadata_filter: dict | None = None) -> list[dict]:
    if not question.strip():
        return []
    query_vector = GeminiEmbedder(settings).embed_text(question, task_type="RETRIEVAL_QUERY")
    with connection(settings.database_url) as conn:
        return match_chunks(conn, query_vector, settings.top_k, metadata_filter)


if __name__ == "__main__":
    import sys
    settings = Settings.from_env()
    question = " ".join(sys.argv[1:]) or "What are the traditional uses of Ashwagandha?"
    rows = retrieve(question, settings)
    if not rows:
        print("No relevant chunks found in the AYURNEX knowledge base.")
    for index, row in enumerate(rows, 1):
        print(f"\n{index}. {row['filename']} pages {row['page_start']}-{row['page_end']} similarity={row['similarity']:.4f}")
        print(row['content'][:500])
