#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "schema" / "v0"
SCHEMA_PATH = SCHEMA_DIR / "phenomenon.schema.json"
EXAMPLES = ROOT / "examples"


def load(path):
    with path.open() as f:
        return json.load(f)


def schema_registry():
    resources = []
    for path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        schema = load(path)
        Draft202012Validator.check_schema(schema)
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


def resolve_pointer(document, pointer):
    current = document
    for token in pointer.lstrip("/").split("/") if pointer != "/" else []:
        token = token.replace("~1", "/").replace("~0", "~")
        current = current[int(token)] if isinstance(current, list) else current[token]
    return current


def semantic_checks(document):
    problems = []
    source_ids = {source["id"] for source in document.get("sources", [])}

    def visit(value, pointer=""):
        if isinstance(value, dict):
            if {"lower", "upper", "unit"}.issubset(value) and value["lower"] > value["upper"]:
                problems.append(f"{pointer or '/'}: lower must be <= upper")
            if "source_refs" in value:
                for source_ref in value["source_refs"]:
                    if source_ref["id"] not in source_ids:
                        problems.append(f"{pointer or '/'}: unresolved source_ref {source_ref['id']}")
            for key, child in value.items():
                escaped = key.replace("~", "~0").replace("/", "~1")
                visit(child, f"{pointer}/{escaped}")
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, f"{pointer}/{index}")

    visit(document)

    for index, provenance in enumerate(document.get("provenance", [])):
        target = provenance["target"]
        try:
            resolve_pointer(document, target)
        except (KeyError, IndexError, ValueError, TypeError):
            problems.append(f"/provenance/{index}/target: JSON pointer does not resolve: {target}")

    return problems


def main():
    schema = load(SCHEMA_PATH)
    validator = Draft202012Validator(
        schema,
        registry=schema_registry(),
        format_checker=FormatChecker(),
    )
    failures = []
    files = sorted(EXAMPLES.glob("*.json"))
    if not files:
        failures.append("no example manifests found")

    for path in files:
        document = load(path)
        for error in sorted(validator.iter_errors(document), key=lambda e: list(e.absolute_path)):
            where = "/" + "/".join(str(part) for part in error.absolute_path)
            failures.append(f"{path.relative_to(ROOT)}{where}: {error.message}")
        failures.extend(
            f"{path.relative_to(ROOT)}{problem}" for problem in semantic_checks(document)
        )

    if failures:
        print("Schema validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(f"Validated {len(list(SCHEMA_DIR.glob('*.schema.json')))} schema files and {len(files)} example manifest(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
