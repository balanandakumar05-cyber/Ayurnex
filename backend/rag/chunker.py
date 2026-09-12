from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Chunk:
    chunk_index: int
    page_start: int
    page_end: int
    chapter_title: str | None
    section_title: str | None
    heading: str | None
    content: str
    content_hash: str
    token_count: int


def _heading_for(paragraph: str) -> str | None:
    first = paragraph.splitlines()[0].strip() if paragraph else ""
    if 2 <= len(first) <= 140 and not first.endswith((".", ",", ";", ":")):
        return first
    return None


def chunk_pages(pages: list[tuple[int, str]], chunk_size: int = 1000, overlap: int = 150) -> list[Chunk]:
    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("chunk_size must be positive and overlap must be smaller than chunk_size")
    paragraphs: list[tuple[int, str]] = []
    for page, text in pages:
        for paragraph in re.split(r"\n\s*\n", text):
            paragraph = paragraph.strip()
            if paragraph:
                paragraphs.append((page, paragraph))
    results: list[Chunk] = []
    buffer = ""
    start_page = end_page = None
    heading = None
    for page, paragraph in paragraphs:
        candidate = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
        if buffer and len(candidate) > chunk_size:
            content = buffer.strip()
            results.append(_make_chunk(len(results), start_page or page, end_page or page, heading, content))
            buffer = content[-overlap:]
            start_page = end_page
            heading = None
        if not buffer:
            start_page = page
            heading = _heading_for(paragraph)
        buffer = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
        end_page = page
    if buffer.strip():
        results.append(_make_chunk(len(results), start_page or 1, end_page or start_page or 1, heading, buffer.strip()))
    return results


def _make_chunk(index: int, page_start: int, page_end: int, heading: str | None, content: str) -> Chunk:
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    return Chunk(index, page_start, page_end, None, None, heading, content, digest, len(content.split()))
