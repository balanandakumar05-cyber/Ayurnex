from __future__ import annotations

import re
from collections import Counter


def _common_edge_lines(texts: list[str]) -> set[str]:
    candidates: list[str] = []
    for text in texts:
        lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]
        candidates.extend(lines[:2] + lines[-2:])
    counts = Counter(candidates)
    threshold = max(3, len(texts) // 3)
    return {line for line, count in counts.items() if len(line) > 2 and count >= threshold}


def clean_page_text(text: str, repeated_lines: set[str] | None = None) -> str:
    text = text.replace("\u00ad", "")
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
    lines = []
    for raw in text.splitlines():
        line = re.sub(r"[ \t]+", " ", raw).strip()
        if line and line not in (repeated_lines or set()):
            lines.append(line)
    result = "\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()

def clean_pages(pages: list[tuple[int, str]]) -> list[tuple[int, str]]:
    repeated = _common_edge_lines([text for _, text in pages])
    return [(number, clean_page_text(text, repeated)) for number, text in pages]
