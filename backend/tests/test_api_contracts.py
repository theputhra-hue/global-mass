"""Public interface snapshots survive internal module reorganisation."""
import json

import pytest

from scripts.check_contracts import ROOT, contract


@pytest.mark.parametrize("mode", ["local", "cloud", "publication"])
def test_committed_interface_contract(mode: str) -> None:
    name = "publication-v2.schema.json" if mode == "publication" else f"{mode}-api-v1.routes.json"
    expected = json.loads((ROOT / "contracts" / name).read_text(encoding="utf8"))
    assert contract(mode) == expected
