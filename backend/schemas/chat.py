from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    country: str = Field(min_length=2, max_length=10)
    language: str = Field(min_length=2, max_length=10)
    question: str = Field(min_length=1, max_length=4000)


class Source(BaseModel):
    title: str
    url: str | None = None
    page_start: int | None = None
    page_end: int | None = None
    heading: str | None = None
    similarity: float | None = None
    content: str | None = None


class ChatResponse(BaseModel):
    country: str
    language: str
    question: str
    answer: str
    sources: list[Source] = Field(default_factory=list)
