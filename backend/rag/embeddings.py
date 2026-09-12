from __future__ import annotations

from google import genai
from google.genai import types

from .config import Settings


class EmbeddingError(RuntimeError):
    pass


class GeminiEmbedder:
    # Gemini allows at most 100 embedding requests in one batch.
    MAX_BATCH_SIZE = 20

    def __init__(self, settings: Settings):
        if not settings.gemini_api_key:
            raise EmbeddingError("GEMINI_API_KEY is missing. Add it to .env.")

        self.settings = settings
        self.client = genai.Client(api_key=settings.gemini_api_key)

    def _embed_batch(
        self,
        texts: list[str],
        task_type: str,
    ) -> list[list[float]]:
        """Generate embeddings for one batch of at most 100 texts."""
        try:
            response = self.client.models.embed_content(
                model=self.settings.embedding_model,
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=self.settings.embedding_dimension,
                ),
            )
        except Exception as exc:
            raise EmbeddingError(
                f"Gemini embedding request failed: {exc}"
            ) from exc

        embeddings = [
            list(item.values)
            for item in (response.embeddings or [])
        ]

        if len(embeddings) != len(texts):
            raise EmbeddingError(
                f"Gemini returned {len(embeddings)} embeddings "
                f"for {len(texts)} inputs."
            )

        bad = [
            len(vector)
            for vector in embeddings
            if len(vector) != self.settings.embedding_dimension
        ]

        if bad:
            raise EmbeddingError(
                f"Embedding dimension mismatch: "
                f"expected {self.settings.embedding_dimension}, "
                f"got {bad[0]}."
            )

        return embeddings

    def embed_texts(
        self,
        texts: list[str],
        task_type: str = "RETRIEVAL_DOCUMENT",
    ) -> list[list[float]]:
        if not texts:
            return []

        all_embeddings: list[list[float]] = []

        # Process at most 100 texts per Gemini request.
        for start in range(0, len(texts), self.MAX_BATCH_SIZE):
            batch = texts[start:start + self.MAX_BATCH_SIZE]

            print(
                f"Generating embeddings: "
                f"{start + 1}-{start + len(batch)} of {len(texts)}"
            )

            embeddings = self._embed_batch(
                batch,
                task_type,
            )

            all_embeddings.extend(embeddings)

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