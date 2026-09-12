from backend.rag.rag_pipeline import answer_question
from backend.schemas.chat import ChatResponse, Source


def get_answer(
    question: str,
    country: str,
    language: str,
) -> ChatResponse:
    result = answer_question(
        question=question,
        country=country,
        language=language,
    )

    sources = [
        Source(
            title=source["document_name"],
            page_start=source.get("page_start"),
            page_end=source.get("page_end"),
            heading=source.get("heading"),
            similarity=source.get("similarity"),
            content=source.get("content"),
        )
        for source in result.get("sources", [])
    ]

    return ChatResponse(
        country=country,
        language=language,
        question=question,
        answer=result["answer"],
        sources=sources,
    )
