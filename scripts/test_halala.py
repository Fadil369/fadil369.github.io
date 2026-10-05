"""Cross-language contract test for halala -> SAR conversion.

The TypeScript `fromHalala` in src/utils/effectivePrice.ts cannot be imported by
Python, so the conversion is duplicated. These four cases are identical to the
TypeScript suite on purpose: if either side drifts, one of the two suites fails.
"""

import importlib.util
import pathlib
import unittest

_spec = importlib.util.spec_from_file_location(
    "sync_catalog_from_woocommerce",
    pathlib.Path(__file__).resolve().parent / "sync-catalog-from-woocommerce.py",
)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)

halala_to_sar = _module.halala_to_sar


class HalalaToSarTest(unittest.TestCase):
    def test_minor_units_convert_to_major_units(self):
        self.assertEqual(halala_to_sar("245000"), 2450.0)
        self.assertEqual(halala_to_sar(115423), 1154.23)

    def test_no_float_drift(self):
        self.assertEqual(str(halala_to_sar("115423")), "1154.23")

    def test_absent_values_are_zero_not_error(self):
        self.assertEqual(halala_to_sar(None), 0.0)
        self.assertEqual(halala_to_sar(""), 0.0)


if __name__ == "__main__":
    unittest.main()