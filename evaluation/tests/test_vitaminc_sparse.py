import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from run_vitaminc_sparse import edits


def test_edit_direction_and_controls():
    assert edits("Five people left.", "Six people left.") == "old_five new_six"
    assert edits("Six people left.", "Five people left.") == "old_six new_five"
    assert edits("A case.", "a case!") == ""
    assert edits("", "New sentence") == "new_new new_sentence"
    assert edits("Old sentence", "") == "old_old old_sentence"
