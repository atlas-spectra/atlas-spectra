"""Presentation shape checks; semantic graph checks also run in the Astro build."""
import copy
import json
from pathlib import Path
import unittest
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]


class JourneySchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = json.loads((ROOT / "schema/journey.schema.json").read_text())
        Draft202012Validator.check_schema(cls.schema)
        cls.validator = Draft202012Validator(cls.schema)
        cls.document = json.loads((ROOT / "presentation/journeys.json").read_text())

    def test_presentation_manifest_matches_schema(self):
        self.validator.validate(self.document)

    def test_scientific_quantities_cannot_be_duplicated_in_presentation(self):
        for field, value in [("frequency", 440), ("evidence", {}), ("sources", [])]:
            document = copy.deepcopy(self.document)
            document["journeys"][0]["steps"][0][field] = value
            self.assertTrue(list(self.validator.iter_errors(document)), field)

    def test_missing_blank_and_malformed_values_fail(self):
        variants = []
        document = copy.deepcopy(self.document)
        document["journeys"][0]["steps"][0]["label"] = "   "
        variants.append(document)
        document = copy.deepcopy(self.document)
        del document["journeys"][0]["edgeIds"]
        variants.append(document)
        document = copy.deepcopy(self.document)
        document["journeys"][0]["steps"] = []
        variants.append(document)
        document = copy.deepcopy(self.document)
        document["version"] = "future"
        variants.append(document)
        for document in variants:
            self.assertTrue(list(self.validator.iter_errors(document)))

    def test_all_hops_resolve_to_exact_directed_physical_edges_and_owner_sources(self):
        records = [json.loads(path.read_text()) for path in (ROOT / "examples").glob("*.json")]
        by_id = {record["id"]: record for record in records}
        edges = {edge["id"]: (record, edge) for record in records for edge in record.get("relationships", [])}
        seen = set()
        for journey in self.document["journeys"]:
            self.assertNotIn(journey["id"], seen)
            seen.add(journey["id"])
            ids = [step["recordId"] for step in journey["steps"]]
            self.assertEqual(len(ids), len(set(ids)))
            self.assertEqual(len(journey["edgeIds"]), len(ids) - 1)
            for identifier in ids:
                self.assertIn(identifier, by_id)
            for index, edge_id in enumerate(journey["edgeIds"]):
                owner, edge = edges[edge_id]
                self.assertEqual(edge["source_ref"]["id"], ids[index])
                self.assertEqual(edge["target_ref"]["id"], ids[index + 1])
                self.assertEqual(edge["category"], "physical")
                self.assertTrue(edge.get("description", "").strip())
                sources = {source["id"] for source in owner.get("sources", [])}
                refs = edge.get("evidence", {}).get("source_refs", [])
                self.assertTrue(refs)
                for ref in refs:
                    self.assertIn(ref["id"], sources)


if __name__ == "__main__":
    unittest.main()
