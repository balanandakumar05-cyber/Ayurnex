from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from pypdf import PdfReader


class PDFLoadError(RuntimeError):
    pass


@dataclass(frozen=True)
class Page:
    page_number: int
    text: str


@dataclass(frozen=True)
class LoadedPDF:
    path: Path
    pages: list[Page]
    metadata: dict[str, str]

    @property
    def page_count(self) -> int:
        return len(self.pages)

    @property
    def extracted_characters(self) -> int:
        return sum(len(p.text.strip()) for p in self.pages)


def load_pdf(path: Path) -> LoadedPDF:
    if not path.exists():
        raise PDFLoadError(f"PDF does not exist: {path}")
    if path.suffix.lower() != ".pdf":
        raise PDFLoadError(f"Only PDF files are supported: {path.name}")
    try:
        reader = PdfReader(str(path))
        pages = [Page(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]
    except Exception as exc:
        raise PDFLoadError(f"Could not read PDF {path.name}: {exc}") from exc
    if not pages:
        raise PDFLoadError(f"PDF has no pages: {path.name}")
    metadata = {}
    for key, value in (reader.metadata or {}).items():
        if value is not None:
            metadata[str(key).lstrip("/")] = str(value)
    if sum(len(p.text.strip()) for p in pages) == 0:
        raise PDFLoadError(f"PDF contains no extractable text: {path.name}. OCR is not enabled by this pipeline.")
    return LoadedPDF(path=path, pages=pages, metadata=metadata)


def find_pdfs(documents_dir: Path) -> list[Path]:
    return sorted(p for p in documents_dir.rglob("*.pdf") if p.is_file())
