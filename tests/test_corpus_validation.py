import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "validate-corpus.py"
SPEC = importlib.util.spec_from_file_location("atlas_corpus_validator", SCRIPT)
CORPUS_VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CORPUS_VALIDATOR)


def minimal_manifest(identifier, system_id, observable_id):
    return {
        "id": identifier,
        "system": {"id": system_id},
        "observable": {"id": observable_id},
    }


class CorpusValidationTests(unittest.TestCase):
    def test_duplicate_ids_across_manifests_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = root / "first.json"
            second = root / "second.json"

            first.write_text(
                json.dumps(
                    minimal_manifest(
                        "test.first.phenomenon",
                        "system.shared.example",
                        "observable.first.example",
                    )
                )
            )
            second.write_text(
                json.dumps(
                    minimal_manifest(
                        "test.second.phenomenon",
                        "system.shared.example",
                        "observable.second.example",
                    )
                )
            )

            failures, checked = CORPUS_VALIDATOR.validate_corpus([first, second])

            self.assertEqual(checked, 0)
            self.assertEqual(len(failures), 1)
            self.assertIn("duplicate Atlas id system.shared.example", failures[0])
            self.assertIn("first.json/system/id", failures[0])
            self.assertIn("second.json/system/id", failures[0])


if __name__ == "__main__":
    unittest.main()
