from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    country: str
    language: str
    question: str


class Source(BaseModel):
    title: str
    url: Optional[str] = None


class ChatResponse(BaseModel):
    country: str
    question: str
    answer: str
    sources: list[Source] = Field(default_factory=list)