#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples"

LOCAL_COLLECTIONS = (
    "conditions",
    "mechanisms",
    "detectors",
    "transformations",
    "measurements",
    "relationships",
    "claims",
)


def manifest_ids(document):
    identifiers = {document["id"], document["system"]["id"], document["observable"]["id"]}
    for collection in LOCAL_COLLECTIONS:
        for value in document.get(collection, []):
            identifiers.add(value["id"])
    return identifiers


def main():
    files = sorted(EXAMPLES.glob("*.json"))
    documents = []
    atlas_ids = set()

    for path in files:
        with path.open() as handle:
            document = json.load(handle)
        documents.append((path, document))
        atlas_ids.update(manifest_ids(document))

    failures = []
    checked = 0
    for path, document in documents:
        for index, relationship in enumerate(document.get("relationships", [])):
            for field in ("source_ref", "target_ref"):
                reference = relationship[field]
                if reference.get("scope") != "atlas":
                    continue
                checked += 1
                if reference["id"] not in atlas_ids:
                    failures.append(
                        f"{path.relative_to(ROOT)}/relationships/{index}/{field}: "
                        f"unresolved atlas reference {reference['id']}"
                    )

    if failures:
        print("Corpus validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(f"Validated {checked} Atlas-scoped relationship reference(s) across {len(files)} manifest(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
