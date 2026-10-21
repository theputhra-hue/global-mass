import sys
from pathlib import Path

import numpy as np
import pytest
from scipy.sparse import csr_matrix
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from run_vitaminc_mechanism import (ALL_NAMES, FEATURES, GMEE_NAMES, LEXICAL_NAMES,
    SUMMARY_NAMES, dense_columns, design_matrix, sha256_file, verify_hashes)


def test_feature_partition_and_order():
    assert {k: len(v) for k, v in FEATURES.items()} == {"A": 13, "B": 28, "C": 8, "D": 33}
    assert set(FEATURES["A"]) & set(FEATURES["B"]) == set(LEXICAL_NAMES)
    assert set(FEATURES["A"]) | set(FEATURES["B"]) == set(ALL_NAMES)
    assert set(SUMMARY_NAMES) <= set(GMEE_NAMES)
    matrix = np.arange(66).reshape(2, 33)
    for name, columns in FEATURES.items():
        assert np.array_equal(dense_columns(matrix, name), matrix[:, [ALL_NAMES.index(n) for n in columns]])


def test_development_transform_does_not_refit_or_renormalize():
    scaler = StandardScaler()
    dense_train = np.array([[0., 1.], [2., 3.]])
    sparse_train = csr_matrix([[0.6, 0.8], [0., 1.]])
    train = design_matrix(scaler, dense_train, sparse_train, fit=True)
    mean, scale = scaler.mean_.copy(), scaler.scale_.copy()
    heldout_sparse = csr_matrix([[0.6, 0.8]])
    heldout = design_matrix(scaler, np.array([[101., 202.]]), heldout_sparse)
    assert np.array_equal(scaler.mean_, mean) and np.array_equal(scaler.scale_, scale)
    assert scaler.n_samples_seen_ == 2
    assert np.allclose(train.toarray()[:, :2], sparse_train.toarray())
    assert np.allclose(heldout.toarray(), [[0.6, 0.8, 100., 200.]])
    assert np.linalg.norm(heldout.toarray()) > 200


def test_frozen_artifact_mutation_is_rejected(tmp_path):
    target = tmp_path / "artifact"
    target.write_bytes(b"frozen")
    digest = {"artifact": sha256_file(target)}
    verify_hashes(tmp_path, digest)
    target.write_bytes(b"changed")
    with pytest.raises(ValueError, match="Frozen artifact changed"):
        verify_hashes(tmp_path, digest)
