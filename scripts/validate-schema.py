#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "schema" / "v0"
SCHEMA_PATH = SCHEMA_DIR / "phenomenon.schema.json"
EXAMPLES = ROOT / "examples"

LOCAL_COLLECTIONS = {
    "conditions": "condition",
    "mechanisms": "mechanism",
    "detectors": "detector",
    "transformations": "transformation",
    "measurements": "measurement",
    "relationships": "relationship",
    "claims": "claim",
}


def reject_non_finite(value):
    raise ValueError(f"non-finite JSON number is not allowed: {value}")


def load(path):
    with path.open() as f:
        return json.load(f, parse_constant=reject_non_finite)


def schema_registry():
    resources = []
    for path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        schema = load(path)
        Draft202012Validator.check_schema(schema)
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


def build_validator():
    return Draft202012Validator(
        load(SCHEMA_PATH),
        registry=schema_registry(),
        format_checker=FormatChecker(),
    )


def decode_pointer_token(token):
    if re.search(r"~(?:[^01]|$)", token):
        raise ValueError(f"invalid JSON Pointer escape in token: {token}")
    return token.replace("~1", "/").replace("~0", "~")


def resolve_pointer(document, pointer):
    if pointer == "":
        return document
    if not pointer.startswith("/"):
        raise ValueError("JSON Pointer must be empty or start with '/'")

    current = document
    for raw_token in pointer[1:].split("/"):
        token = decode_pointer_token(raw_token)
        if isinstance(current, list):
            if not (token == "0" or (token.isdigit() and not token.startswith("0"))):
                raise ValueError(f"invalid array index in JSON Pointer: {token}")
            current = current[int(token)]
        elif isinstance(current, dict):
            current = current[token]
        else:
            raise TypeError(f"cannot dereference JSON Pointer token {token!r}")
    return current


def id_indexes(document):
    typed = {
        "phenomenon": set(),
        "system": set(),
        "observable": set(),
        "condition": set(),
        "mechanism": set(),
        "detector": set(),
        "transformation": set(),
        "measurement": set(),
        "relationship": set(),
        "claim": set(),
        "source": set(),
    }
    locations = {}
    duplicates = []

    def add(kind, value, pointer):
        if not isinstance(value, dict) or "id" not in value:
            return
        identifier = value["id"]
        if identifier in locations:
            duplicates.append(
                f"{pointer}/id: duplicate id {identifier}; first declared at {locations[identifier]}"
            )
        else:
            locations[identifier] = f"{pointer}/id" if pointer else "/id"
        typed[kind].add(identifier)

    add("phenomenon", document, "")
    add("system", document.get("system"), "/system")
    add("observable", document.get("observable"), "/observable")

    for collection, kind in LOCAL_COLLECTIONS.items():
        for index, value in enumerate(document.get(collection, [])):
            add(kind, value, f"/{collection}/{index}")

    for index, value in enumerate(document.get("sources", [])):
        add("source", value, f"/sources/{index}")

    local = set().union(*(values for kind, values in typed.items() if kind != "source"))
    return typed, local, duplicates


def semantic_checks(document):
    problems = []
    typed_ids, local_ids, duplicate_problems = id_indexes(document)
    problems.extend(duplicate_problems)

    def check_reference(reference, allowed, pointer, kind):
        identifier = reference.get("id") if isinstance(reference, dict) else None
        if identifier not in allowed:
            problems.append(f"{pointer}: unresolved {kind} {identifier}")

    def visit(value, pointer=""):
        if isinstance(value, dict):
            if {"lower", "upper", "unit"}.issubset(value) and value["lower"] > value["upper"]:
                problems.append(f"{pointer or '/'}: lower must be <= upper")
            if "source_refs" in value:
                for index, source_ref in enumerate(value["source_refs"]):
                    check_reference(
                        source_ref,
                        typed_ids["source"],
                        f"{pointer}/source_refs/{index}",
                        "source_ref",
                    )
            if "condition_refs" in value:
                for index, condition_ref in enumerate(value["condition_refs"]):
                    check_reference(
                        condition_ref,
                        typed_ids["condition"],
                        f"{pointer}/condition_refs/{index}",
                        "condition_ref",
                    )
            for key, child in value.items():
                escaped = key.replace("~", "~0").replace("/", "~1")
                visit(child, f"{pointer}/{escaped}")
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, f"{pointer}/{index}")

    visit(document)

    for detector_index, detector in enumerate(document.get("detectors", [])):
        for ref_index, reference in enumerate(detector.get("observes", [])):
            check_reference(
                reference,
                typed_ids["observable"],
                f"/detectors/{detector_index}/observes/{ref_index}",
                "observable_ref",
            )

    for index, transformation in enumerate(document.get("transformations", [])):
        for field in ("input_ref", "output_ref"):
            check_reference(
                transformation[field],
                local_ids,
                f"/transformations/{index}/{field}",
                field,
            )

    for index, measurement in enumerate(document.get("measurements", [])):
        check_reference(
            measurement["observable_ref"],
            typed_ids["observable"],
            f"/measurements/{index}/observable_ref",
            "observable_ref",
        )
        if "detector_ref" in measurement:
            check_reference(
                measurement["detector_ref"],
                typed_ids["detector"],
                f"/measurements/{index}/detector_ref",
                "detector_ref",
            )

    for index, relationship in enumerate(document.get("relationships", [])):
        for field in ("source_ref", "target_ref"):
            check_reference(
                relationship[field],
                local_ids,
                f"/relationships/{index}/{field}",
                field,
            )

    for index, claim in enumerate(document.get("claims", [])):
        check_reference(
            claim["subject_ref"],
            local_ids,
            f"/claims/{index}/subject_ref",
            "subject_ref",
        )
        object_value = claim.get("object")
        if isinstance(object_value, dict) and "id" in object_value:
            check_reference(
                object_value,
                local_ids,
                f"/claims/{index}/object",
                "object reference",
            )

    for index, provenance in enumerate(document.get("provenance", [])):
        target = provenance["target"]
        try:
            resolve_pointer(document, target)
        except (KeyError, IndexError, ValueError, TypeError):
            problems.append(f"/provenance/{index}/target: JSON pointer does not resolve: {target}")

    return problems


def structural_errors(document, validator):
    failures = []
    for error in sorted(validator.iter_errors(document), key=lambda e: list(e.absolute_path)):
        where = "/" + "/".join(str(part) for part in error.absolute_path)
        failures.append(f"{where}: {error.message}")
    return failures


def validate_document(document, validator):
    failures = structural_errors(document, validator)
    if failures:
        return failures
    return semantic_checks(document)


def main():
    validator = build_validator()
    failures = []
    files = sorted(EXAMPLES.glob("*.json"))
    if not files:
        failures.append("no example manifests found")

    for path in files:
        try:
            document = load(path)
        except (json.JSONDecodeError, ValueError) as error:
            failures.append(f"{path.relative_to(ROOT)}: invalid JSON: {error}")
            continue

        failures.extend(
            f"{path.relative_to(ROOT)}{problem}"
            for problem in validate_document(document, validator)
        )

    if failures:
        print("Schema validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(
        f"Validated {len(list(SCHEMA_DIR.glob('*.schema.json')))} schema files "
        f"and {len(files)} example manifest(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
