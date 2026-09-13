from __future__ import annotations

import os
import time
from threading import Lock

import torch
from sentence_transformers import SentenceTransformer

from .config import Settings


class EmbeddingError(RuntimeError):
    pass


class LocalEmbedder:
    """
    Local embedding model for AYURNEX.

    The model is loaded once and reused for all requests.
    CPU settings are optimized for faster inference.
    """

    MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIMENSION = 384
    MAX_BATCH_SIZE = 20

    # Shared model between all LocalEmbedder instances.
    _shared_model: SentenceTransformer | None = None
    _model_lock = Lock()

    def __init__(self, settings: Settings):
        self.settings = settings

        # -----------------------------------------------------
        # CPU optimization
        # -----------------------------------------------------
        cpu_count = os.cpu_count() or 4

        # Avoid creating too many CPU threads.
        torch.set_num_threads(max(1, min(cpu_count, 8)))

        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            # This can only be set once in some PyTorch versions.
            pass

        # -----------------------------------------------------
        # Load model only once
        # -----------------------------------------------------
        if LocalEmbedder._shared_model is None:
            with LocalEmbedder._model_lock:

                # Check again after acquiring the lock.
                if LocalEmbedder._shared_model is None:
                    try:
                        print(
                            f"Loading local embedding model: "
                            f"{self.MODEL_NAME}"
                        )

                        LocalEmbedder._shared_model = (
                            SentenceTransformer(
                                self.MODEL_NAME,
                                device="cpu",
                            )
                        )

                        # Put the model into inference mode.
                        LocalEmbedder._shared_model.eval()

                        print(
                            "Local embedding model loaded successfully."
                        )

                    except Exception as exc:
                        raise EmbeddingError(
                            f"Could not load local embedding model: {exc}"
                        ) from exc

        self.model = LocalEmbedder._shared_model

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

            start_time = time.perf_counter()

            try:
                embeddings = self.model.encode(
                    batch,
                    batch_size=self.MAX_BATCH_SIZE,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                    device="cpu",
                )

            except Exception as exc:
                raise EmbeddingError(
                    f"Local embedding generation failed: {exc}"
                ) from exc

            elapsed = time.perf_counter() - start_time

            print(
                f"Embedding generation time: "
                f"{elapsed:.2f} seconds"
            )

            batch_embeddings = [
                vector.tolist()
                for vector in embeddings
            ]

            all_embeddings.extend(batch_embeddings)

        # -----------------------------------------------------
        # Verify dimensions
        # -----------------------------------------------------
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


# Keep the old name so the existing AYURNEX RAG code
# continues to work without changes.
GeminiEmbedder = LocalEmbedder