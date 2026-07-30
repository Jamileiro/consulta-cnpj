import unittest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app


class AppValidationTests(unittest.TestCase):
    def test_normalize_cnpj_removes_non_digits(self):
        self.assertEqual(app.normalize_cnpj("19.131.243/0001-97"), "19131243000197")

    def test_validate_cnpj_digits_rejects_invalid(self):
        self.assertFalse(app.validate_cnpj_digits("12345678000195"))

    def test_validate_cnpj_digits_accepts_known_valid(self):
        self.assertTrue(app.validate_cnpj_digits("19131243000197"))

    def test_is_safe_path_rejects_traversal(self):
        self.assertFalse(app.is_safe_path("/../secret.txt"))


if __name__ == "__main__":
    unittest.main()
