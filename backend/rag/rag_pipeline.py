from __future__ import annotations

import time

from google import genai
from google.genai import types

from .config import Settings
from .prompts import SYSTEM_PROMPT, build_prompt
from .retriever import retrieve


def answer_question(
    question: str,
    settings: Settings | None = None,
    country: str = "IN",
    language: str = "en",
) -> dict:
    settings = settings or Settings.from_env()

    # ---------------------------------------------------------
    # 1. Measure RAG retrieval time
    # ---------------------------------------------------------
    retrieve_start = time.perf_counter()

    rows = retrieve(question, settings)

    retrieve_time = time.perf_counter() - retrieve_start

    print(f"⏱ Retrieval time: {retrieve_time:.2f} seconds")
    print(f"📚 Retrieved chunks: {len(rows)}")

    if not rows:
        return {
            "answer": (
                "The current AYURNEX knowledge base does not contain "
                "enough relevant information to answer this question."
            ),
            "sources": [],
        }

    # ---------------------------------------------------------
    # 2. Create Gemini client
    # ---------------------------------------------------------
    client = genai.Client(api_key=settings.gemini_api_key)

    # ---------------------------------------------------------
    # 3. Measure Gemini generation time
    # ---------------------------------------------------------
    try:
        gemini_start = time.perf_counter()

        response = client.models.generate_content(
            model=settings.generation_model,
            contents=build_prompt(
                question,
                rows,
                country=country,
                language=language,
            ),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
            ),
        )

        gemini_time = time.perf_counter() - gemini_start

        print(
            f"⏱ Gemini generation time: "
            f"{gemini_time:.2f} seconds"
        )

        answer = (response.text or "").strip()

    except Exception as exc:
        raise RuntimeError(
            f"Gemini answer generation failed: {exc}"
        ) from exc

    if not answer:
        raise RuntimeError(
            "Gemini returned an empty answer."
        )

    # ---------------------------------------------------------
    # 4. Prepare source information
    # ---------------------------------------------------------
    sources = [
        {
            "document_name": row["filename"],
            "page_start": row["page_start"],
            "page_end": row["page_end"],
            "heading": row.get("heading"),
            "similarity": row["similarity"],
            "chunk_id": str(row["chunk_id"]),
            "content": row["content"],
        }
        for row in rows
    ]

    # ---------------------------------------------------------
    # 5. Return final result
    # ---------------------------------------------------------
    return {
        "answer": answer,
        "sources": sources,
    }


if __name__ == "__main__":
    import json
    import sys

    question = (
        " ".join(sys.argv[1:])
        or "What are the traditional uses of Ashwagandha?"
    )

    print(
        json.dumps(
            answer_question(question),
            indent=2,
            ensure_ascii=False,
            default=str,
        )
    )