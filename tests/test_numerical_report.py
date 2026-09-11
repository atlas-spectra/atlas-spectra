import copy
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]


class NumericalReportTests(unittest.TestCase):
    def setUp(self):
        self.schema = json.loads((ROOT / "schema/numerical-neighbor-report.schema.json").read_text())
        self.fixture = json.loads((ROOT / "tests/fixtures/numerical-neighbor-report.json").read_text())
        self.validator = Draft202012Validator(self.schema)

    def test_schema_and_shared_typescript_fixture(self):
        Draft202012Validator.check_schema(self.schema)
        self.validator.validate(self.fixture)

    def test_computation_cannot_masquerade_as_a_reviewed_physical_edge(self):
        for key, value in [("interpretation", "physical"), ("reviewStatus", "reviewed"), ("confidence", 0.99), ("method", "harmonic-guess")]:
            with self.subTest(key=key):
                changed = copy.deepcopy(self.fixture)
                changed[key] = value
                self.assertFalse(self.validator.is_valid(changed))

    def test_match_requires_original_inputs_and_nonempty_intersections(self):
        for change in ["empty", "nonpositive", "missing_target", "null_coordinate"]:
            with self.subTest(change=change):
                changed = copy.deepcopy(self.fixture)
                if change == "empty":
                    changed["matches"][0]["intersections"] = []
                elif change == "nonpositive":
                    changed["matches"][0]["intersections"][0]["sharedHz"][0] = 0
                elif change == "missing_target":
                    changed["anchor"]["quantityTargets"] = []
                else:
                    changed["anchor"]["segmentsHz"][0][0] = None
                self.assertFalse(self.validator.is_valid(changed))

    def test_incomplete_reports_cannot_silently_carry_a_partial_match_list(self):
        changed = copy.deepcopy(self.fixture)
        changed.update(status="catalog-limit", reason="No search performed")
        self.assertFalse(self.validator.is_valid(changed))
        changed.update(matches=[], exclusions=[])
        self.validator.validate(changed)

    def test_fixture_calculation_and_counts_are_semantically_consistent(self):
        fixture = self.fixture
        self.assertEqual(fixture["counts"]["matches"], len(fixture["matches"]))
        self.assertEqual(fixture["counts"]["excludedPeers"], len(fixture["exclusions"]))
        self.assertEqual(fixture["counts"]["comparedPeers"] + fixture["counts"]["excludedPeers"], fixture["counts"]["catalogRecords"] - 1)
        for match in fixture["matches"]:
            for step in match["intersections"]:
                a, b = step["anchorHz"], step["peerHz"]
                self.assertEqual(step["sharedHz"], [max(a[0], b[0]), min(a[1], b[1])])


if __name__ == "__main__":
    unittest.main()
