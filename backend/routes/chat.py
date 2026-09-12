from fastapi import APIRouter, HTTPException

from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.rag_service import get_answer


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    try:
        return get_answer(
            question=request.question.strip(),
            country=request.country,
            language=request.language,
        )
    except Exception as exc:
        # Do not expose stack traces or secrets to the browser.
        raise HTTPException(
            status_code=500,
            detail="AYURNEX could not generate an answer. Check the backend, database, and Gemini configuration.",
        ) from exc