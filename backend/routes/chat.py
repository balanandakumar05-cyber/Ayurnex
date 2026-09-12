from fastapi import APIRouter

from schemas.chat import ChatRequest, ChatResponse
from services.rag_service import get_answer


router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):

    return get_answer(
        question=request.question,
        country=request.country,
        language=request.language
    )