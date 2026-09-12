from __future__ import annotations

import argparse

from .config import Settings
from .retriever import retrieve


def main() -> None:
    parser = argparse.ArgumentParser(description="Test AYURNEX vector retrieval")
    parser.add_argument("question", nargs="*", default=["What are the traditional uses of Ashwagandha?"])
    args = parser.parse_args()
    question = " ".join(args.question)
    rows = retrieve(question, Settings.from_env())
    if not rows:
        print("No relevant chunks found.")
        return
    for number, row in enumerate(rows, 1):
        print(f"{number}. {row['filename']} | pages {row['page_start']}-{row['page_end']} | similarity={row['similarity']:.4f}")
        print(row["content"][:600].replace("\n", " "))
        print()


if __name__ == "__main__":
    main()
