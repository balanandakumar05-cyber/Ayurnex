from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


# Project structure:
#
# Ayurnex/
# ├── backend/
# │   ├── .env
# │   └── rag/
# │       └── config.py
# └── data/
#
# config.py -> rag -> backend -> Ayurnex

PROJECT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]

# The real .env is inside backend/
load_dotenv(BACKEND_DIR / ".env")


class ConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class Settings:
    database_url: str
    gemini_api_key: str
    embedding_model: str
    generation_model: str
    embedding_dimension: int
    top_k: int
    chunk_size: int
    chunk_overlap: int
    documents_dir: Path

    @classmethod
    def from_env(cls, require_api_key: bool = True) -> "Settings":
        database_url = os.getenv("DATABASE_URL", "").strip()
        api_key = os.getenv("GEMINI_API_KEY", "").strip()

        if not database_url:
            raise ConfigurationError(
                "DATABASE_URL is missing. Add it to backend/.env."
            )

        if require_api_key and not api_key:
            raise ConfigurationError(
                "GEMINI_API_KEY is missing. Add it to backend/.env."
            )

        # Local Sentence Transformer produces 384-dimensional vectors.
        dimension = int(
            os.getenv("EMBEDDING_DIMENSION", "384")
        )

        if dimension != 384:
            raise ConfigurationError(
                f"EMBEDDING_DIMENSION must be exactly 384 "
                f"for the local embedding model, got {dimension}."
            )

        overlap = int(
            os.getenv("CHUNK_OVERLAP", "150")
        )

        size = int(
            os.getenv("CHUNK_SIZE", "1000")
        )

        if size <= 0 or overlap < 0 or overlap >= size:
            raise ConfigurationError(
                "CHUNK_SIZE must be positive and "
                "CHUNK_OVERLAP must be >= 0 and "
                "smaller than CHUNK_SIZE."
            )

        return cls(
            database_url=database_url,

            # Gemini is still used for answer generation.
            gemini_api_key=api_key,

            # Local embedding model.
            embedding_model=os.getenv(
                "EMBEDDING_MODEL",
                "paraphrase-multilingual-MiniLM-L12-v2",
            ),

            # Gemini answer-generation model.
            generation_model=os.getenv(
                "GENERATION_MODEL",
                "gemini-3.6-flash",
            ),

            # Local model produces 384 dimensions.
            embedding_dimension=dimension,

            top_k=int(
                os.getenv("TOP_K", "8")
            ),

            chunk_size=size,
            chunk_overlap=overlap,

            # data/ is at the AYURNEX project root.
            documents_dir=Path(
                os.getenv(
                    "DOCUMENTS_DIR",
                    str(
                        PROJECT_DIR
                        / "data"
                        / "documents"
                    ),
                )
            ),
        )