import copy
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "validate-schema.py"
SPEC = importlib.util.spec_from_file_location("atlas_schema_validator", SCRIPT)
VALIDATOR_MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR_MODULE)


class SchemaValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.validator = VALIDATOR_MODULE.build_validator()
        cls.heart = VALIDATOR_MODULE.load(ROOT / "examples" / "adult-resting-heart-rate.json")
        cls.cesium = VALIDATOR_MODULE.load(ROOT / "examples" / "cesium-133-hyperfine-transition.json")

    def failures_for(self, document):
        return VALIDATOR_MODULE.validate_document(document, self.validator)

    def test_relationship_type_requires_matching_category(self):
        document = copy.deepcopy(self.cesium)
        document["relationships"] = [
            {
                "id": "relationship.cesium.emits",
                "type": "EMITS",
                "category": "subjective",
                "source_ref": {"id": document["id"]},
                "target_ref": {"id": document["system"]["id"]},
                "evidence": {
                    "basis": "established_reference",
                    "review_status": "reviewed",
                    "source_refs": [{"id": "source.bipm.si-second"}],
                    "mechanism_status": "known"
                }
            }
        ]
        self.assertTrue(self.failures_for(document))

    def test_cross_manifest_relationship_target_is_explicit(self):
        document = copy.deepcopy(self.cesium)
        document["relationships"] = [
            {
                "id": "relationship.cesium.same-frequency-example",
                "type": "SAME_NUMERICAL_FREQUENCY_AS",
                "category": "numerical",
                "source_ref": {"id": document["id"]},
                "target_ref": {
                    "id": "biology.heart.resting-adult-rate",
                    "scope": "atlas"
                },
                "evidence": {
                    "basis": "computed_derivation",
                    "review_status": "unreviewed",
                    "source_refs": [{"id": "source.bipm.si-second"}],
                    "mechanism_status": "none"
                }
            }
        ]
        self.assertEqual(self.failures_for(document), [])

        document["relationships"][0]["source_ref"] = {
            "id": "another.external.node",
            "scope": "atlas"
        }
        failures = self.failures_for(document)
        self.assertTrue(any("anchored to at least one local endpoint" in failure for failure in failures))

    def test_unscoped_cross_manifest_relationship_is_rejected(self):
        document = copy.deepcopy(self.cesium)
        document["relationships"] = [
            {
                "id": "relationship.cesium.unresolved-target",
                "type": "SAME_NUMERICAL_FREQUENCY_AS",
                "category": "numerical",
                "source_ref": {"id": document["id"]},
                "target_ref": {"id": "biology.heart.resting-adult-rate"},
                "evidence": {
                    "basis": "computed_derivation",
                    "review_status": "unreviewed",
                    "source_refs": [{"id": "source.bipm.si-second"}],
                    "mechanism_status": "none"
                }
            }
        ]
        failures = self.failures_for(document)
        self.assertTrue(any("unresolved target_ref" in failure for failure in failures))

    def test_local_references_are_type_aware(self):
        document = copy.deepcopy(self.heart)
        document["measurements"] = [
            {
                "id": "measurement.heart.invalid-observable",
                "method": "example",
                "observable_ref": {"id": document["system"]["id"]}
            }
        ]
        failures = self.failures_for(document)
        self.assertTrue(any("unresolved observable_ref" in failure for failure in failures))

    def test_evidence_condition_references_resolve(self):
        document = copy.deepcopy(self.heart)
        document["provenance"][0]["evidence"]["condition_refs"][0]["id"] = "condition.subject.missing"
        failures = self.failures_for(document)
        self.assertTrue(any("unresolved condition_ref" in failure for failure in failures))

    def test_duplicate_source_ids_are_rejected(self):
        document = copy.deepcopy(self.heart)
        document["sources"].append(copy.deepcopy(document["sources"][0]))
        failures = self.failures_for(document)
        self.assertTrue(any("duplicate id source.aha.resting-heart-rate" in failure for failure in failures))

    def test_json_pointer_preserves_empty_leading_token(self):
        document = {"frequency_profile": {"rate": 1}}
        with self.assertRaises(KeyError):
            VALIDATOR_MODULE.resolve_pointer(document, "//frequency_profile")

        document[""] = {"frequency_profile": "empty-key-member"}
        self.assertEqual(
            VALIDATOR_MODULE.resolve_pointer(document, "//frequency_profile"),
            "empty-key-member",
        )
        self.assertEqual(VALIDATOR_MODULE.resolve_pointer({"": 3}, "/"), 3)

    def test_non_finite_json_numbers_are_rejected(self):
        for constant in ("NaN", "Infinity", "-Infinity"):
            with self.subTest(constant=constant):
                with tempfile.NamedTemporaryFile("w+", suffix=".json") as handle:
                    handle.write(f'{{"value": {constant}}}')
                    handle.flush()
                    with self.assertRaises(ValueError):
                        VALIDATOR_MODULE.load(Path(handle.name))

    def test_overflowed_json_float_is_rejected(self):
        with tempfile.NamedTemporaryFile("w+", suffix=".json") as handle:
            handle.write('{"value": 1e999}')
            handle.flush()
            with self.assertRaises(ValueError):
                VALIDATOR_MODULE.load(Path(handle.name))

    def test_condition_operator_requires_compatible_value(self):
        document = copy.deepcopy(self.heart)
        document["conditions"][0]["operator"] = "between"
        document["conditions"][0]["value"] = "resting"
        self.assertTrue(self.failures_for(document))

        document = copy.deepcopy(self.heart)
        document["conditions"][0]["operator"] = "in"
        document["conditions"][0]["value"] = "resting"
        self.assertTrue(self.failures_for(document))

    def test_structural_failure_does_not_run_semantic_checks(self):
        document = copy.deepcopy(self.heart)
        del document["provenance"][0]["target"]
        failures = self.failures_for(document)
        self.assertTrue(failures)
        self.assertTrue(any("target" in failure for failure in failures))

    def test_event_rates_must_be_nonnegative(self):
        range_document = copy.deepcopy(self.heart)
        range_document["frequency_profile"]["rate"]["lower"] = -2
        range_document["frequency_profile"]["rate"]["upper"] = -1
        self.assertTrue(self.failures_for(range_document))

        scalar_document = copy.deepcopy(self.heart)
        scalar_document["frequency_profile"]["rate"] = {
            "value": -1,
            "unit": "bpm",
            "quantity_kind": "heart-rate"
        }
        self.assertTrue(self.failures_for(scalar_document))


if __name__ == "__main__":
    unittest.main()
