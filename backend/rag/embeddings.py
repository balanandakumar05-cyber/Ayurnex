from __future__ import annotations

from sentence_transformers import SentenceTransformer

from .config import Settings


class EmbeddingError(RuntimeError):
    pass


class LocalEmbedder:
    """
    Local embedding model for AYURNEX.

    Uses Sentence Transformers instead of Gemini, so embedding
    documents does not consume Gemini API quota.
    """

    MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIMENSION = 384
    MAX_BATCH_SIZE = 20

    def __init__(self, settings: Settings):
        self.settings = settings

        try:
            print(f"Loading local embedding model: {self.MODEL_NAME}")
            self.model = SentenceTransformer(self.MODEL_NAME)
            print("Local embedding model loaded successfully.")
        except Exception as exc:
            raise EmbeddingError(
                f"Could not load local embedding model: {exc}"
            ) from exc

    def embed_texts(
        self,
        texts: list[str],
        task_type: str = "RETRIEVAL_DOCUMENT",
    ) -> list[list[float]]:

        if not texts:
            return []

        all_embeddings: list[list[float]] = []

        for start in range(0, len(texts), self.MAX_BATCH_SIZE):

            batch = texts[start:start + self.MAX_BATCH_SIZE]

            print(
                f"Generating local embeddings: "
                f"{start + 1}-{start + len(batch)} of {len(texts)}"
            )

            try:
                embeddings = self.model.encode(
                    batch,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                )
            except Exception as exc:
                raise EmbeddingError(
                    f"Local embedding generation failed: {exc}"
                ) from exc

            batch_embeddings = [
                vector.tolist()
                for vector in embeddings
            ]

            all_embeddings.extend(batch_embeddings)

        for vector in all_embeddings:
            if len(vector) != self.EMBEDDING_DIMENSION:
                raise EmbeddingError(
                    f"Embedding dimension mismatch: "
                    f"expected {self.EMBEDDING_DIMENSION}, "
                    f"got {len(vector)}."
                )

        return all_embeddings

    def embed_text(
        self,
        text: str,
        task_type: str = "RETRIEVAL_QUERY",
    ) -> list[float]:

        vectors = self.embed_texts(
            [text],
            task_type=task_type,
        )

        return vectors[0]


# Keep this name so the rest of the AYURNEX RAG code
# does not need to be changed immediately.
GeminiEmbedder = LocalEmbedder