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


def manifest_id_entries(document):
    yield document["id"], "/id"
    yield document["system"]["id"], "/system/id"
    yield document["observable"]["id"], "/observable/id"
    for collection in LOCAL_COLLECTIONS:
        for index, value in enumerate(document.get(collection, [])):
            yield value["id"], f"/{collection}/{index}/id"


def validate_corpus(files):
    documents = []
    owners = {}
    failures = []

    for path in files:
        with path.open() as handle:
            document = json.load(handle)
        documents.append((path, document))

        for identifier, pointer in manifest_id_entries(document):
            if identifier in owners:
                first_path, first_pointer = owners[identifier]
                failures.append(
                    f"{path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}{pointer}: "
                    f"duplicate Atlas id {identifier}; first declared at "
                    f"{first_path.relative_to(ROOT) if first_path.is_relative_to(ROOT) else first_path}{first_pointer}"
                )
            else:
                owners[identifier] = (path, pointer)

    # Atlas-scoped references are meaningful only when every graph-node ID has
    # exactly one owner. Do not resolve against an ambiguous global index.
    if failures:
        return failures, 0

    atlas_ids = set(owners)
    checked = 0
    for path, document in documents:
        display_path = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
        for index, relationship in enumerate(document.get("relationships", [])):
            for field in ("source_ref", "target_ref"):
                reference = relationship[field]
                if reference.get("scope") != "atlas":
                    continue
                checked += 1
                if reference["id"] not in atlas_ids:
                    failures.append(
                        f"{display_path}/relationships/{index}/{field}: "
                        f"unresolved atlas reference {reference['id']}"
                    )

    return failures, checked


def main():
    files = sorted(EXAMPLES.glob("*.json"))
    failures, checked = validate_corpus(files)

    if failures:
        print("Corpus validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(f"Validated {checked} Atlas-scoped relationship reference(s) across {len(files)} manifest(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
