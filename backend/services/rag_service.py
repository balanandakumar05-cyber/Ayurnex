from rag.rag_pipeline import answer_question
from schemas.chat import ChatResponse, Source


def get_answer(
    question: str,
    country: str,
    language: str
) -> ChatResponse:

    result = answer_question(question)

    sources = [
        Source(
            title=source["document_name"],
            url=None
        )
        for source in result.get("sources", [])
    ]

    return ChatResponse(
        country=country,
        question=question,
        answer=result["answer"],
        sources=sources
    )