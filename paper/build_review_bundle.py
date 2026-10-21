"""Curate an explicitly allowlisted, local-only component-study review bundle.

Default/--check validates selection and provenance without creating a ZIP.
--build requires every planned file and reviewed aggregate to be present.
This stdlib-only curator does not run experiments or acquire any input data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import zipfile

ROOT = Path(__file__).absolute().parents[1]
BASELINE_HEAD = "aa0056c3e81a012b942c4a1fc9cb278feaa5c3f8"
OUTPUT = "output/paper/gmee_component_review_bundle_v3.zip"
MAX_FILE_BYTES = 25 * 1024 * 1024
# Exact paths only. Neither directory recursion nor broad repository globbing is used.
FILES = (
    "LICENSE",
    "backend/app/__init__.py",
    "backend/app/services/__init__.py",
    "backend/app/services/evolution/__init__.py",
    "backend/app/services/evolution/text_changes.py",
    "backend/app/services/evolution/quantities.py",
    "evaluation/config/vitaminc_anchor.json",
    "evaluation/scripts/run_vitaminc_pilot.py",
    "evaluation/scripts/run_vitaminc_locked.py",
    "evaluation/scripts/run_vitaminc_sparse.py",
    "evaluation/scripts/run_vitaminc_anchor.py",
    "evaluation/scripts/run_vitaminc_mechanism.py",
    "evaluation/scripts/reconstruct_vitaminc_mechanism.py",
    "evaluation/scripts/verify_vitaminc_reconstruction.py",
    "evaluation/scripts/vitaminc_groups.py",
    "evaluation/scripts/vitaminc_statistics.py",
    "evaluation/scripts/build_vitaminc_figures.py",
    "evaluation/scripts/select_vitaminc_errors.py",
    "evaluation/scripts/summarize_vitaminc_anchor.py",
    "evaluation/tests/test_vitaminc_groups.py",
    "evaluation/tests/test_vitaminc_locked.py",
    "evaluation/tests/test_vitaminc_pilot.py",
    "evaluation/tests/test_vitaminc_sparse.py",
    "evaluation/tests/test_vitaminc_statistics.py",
    "evaluation/tests/test_vitaminc_mechanism.py",
    "evaluation/tests/test_vitaminc_reconstruction.py",
    "evaluation/tests/test_vitaminc_reconstruction_verifier.py",
    "docs/PUBLIC_BENCHMARK_AUDIT.md",
    "docs/EXTERNAL_CONFIRMATION_ACCESS_REVIEW.md",
    "docs/VITAMINC_RECONSTRUCTION_PLAN_V1.md",
    "docs/VITAMINC_RECONSTRUCTION_REVIEW.md",
    "docs/VITAMINC_ANALYSIS_PLAN_V1.md",
    "docs/VITAMINC_ANCHOR_FEASIBILITY.md",
    "docs/VITAMINC_ANCHOR_SUPPLEMENT.md",
    "docs/VITAMINC_COMPONENT_RESULT_RECEIPT.md",
    "docs/VITAMINC_DATA_AUDIT.md",
    "docs/VITAMINC_PILOT_PROTOCOL.md",
    "docs/VITAMINC_POSTTEST_REVIEW.md",
    "docs/VITAMINC_PRETEST_REVIEW.md",
    "docs/VITAMINC_QUALITATIVE_ERROR_REVIEW.md",
    "docs/VITAMINC_SUPPLEMENT_RECEIPT.md",
    "docs/VITAMINC_TEXT_BASELINE_SUPPLEMENT.md",
    "docs/VITAMINC_MECHANISM_SUPPLEMENT.md",
    "docs/VITAMINC_MECHANISM_RECEIPT.md",
    "paper/README.md",
    "paper/AUTHOR_DECLARATIONS.md",
    "paper/environments/README.md",
    "paper/environments/primary-linux.txt",
    "paper/environments/supplement-windows.txt",
    "paper/environments/anchor-windows.txt",
    "paper/reconstruction_comparison.json",
    "paper/ARTIFACT_CONTENTS.md",
    "paper/INTERNAL_REVIEW.md",
    "paper/CLAIM_EVIDENCE_MAP.md",
    "paper/QA_RECEIPT.md",
    "paper/REVIEW_GAPS.md",
    "paper/VENUE_OPTIONS.md",
    "paper/manuscript.md",
    "paper/references.bib",
    "paper/build_manuscript_pdf.py",
    "paper/build_review_bundle.py",
    "paper/figures/figures_manifest.json",
    "paper/figures/vitaminc_discrimination.pdf",
    "paper/figures/vitaminc_discrimination.png",
    "paper/figures/vitaminc_discrimination.svg",
    "paper/figures/vitaminc_primary_contrast.pdf",
    "paper/figures/vitaminc_primary_contrast.png",
    "paper/figures/vitaminc_primary_contrast.svg",
    "output/pdf/gmee_vitaminc_manuscript.pdf",
    "output/pdf/manuscript_build.json",
)

# These exact aggregate files have been inspected: no raw text or row/group IDs.
# A changed digest must cause a new content review, not automatic acceptance.
# Add the mechanism digest only after its completed report has been reviewed.
AGGREGATES = (
    ("vitaminc-score-v1-20261019", "primary_results.json",
     "15e18b6290e6bccc71a83f3fdde4f9f93a6732964ed7a6498ec5a20260b718fd"),
    ("vitaminc-sparse-score-v1", "sparse_results.json",
     "29bb3d50f0621c3e38ad23206ec75c4ece827d3fca32e78dd3d53dfe8cdb0a03"),
    ("vitaminc-anchor-score-v1", "anchor_results.json",
     "90faaf3520ce9e9b701c7c46b59d40db0408f333fe5b9ddc70d84a49d87f63fb"),
    ("vitaminc-mechanism-score-v1", "mechanism_results.json",
     "f44bb6bc4a16f3fe081ad07c36e62d0e0ba45e70675f0d6fb194492c9beee300"),
)

# Transcribed from the original primary/supplement source locks. They bind the
# included historical implementation; mutable writing/presentation is separate.
FROZEN_SOURCE_HASHES = {
    'docs/VITAMINC_MECHANISM_SUPPLEMENT.md': '8a6a1129ed45c95debe06918427aa521ebfba0423a216f53c9eafd5f8ed6b3e1',
    'evaluation/scripts/run_vitaminc_mechanism.py': '14afe18d38c5154b31f26ad505af7ea5eee857e61f797daae7b7b7949f876a85',
    'evaluation/tests/test_vitaminc_mechanism.py': '0a74dc923601bf32631a896ee22228198aa00cd7bb909feeb4dbbc77d9eef018',
    "backend/app/services/evolution/quantities.py": "6cee8a570c170912d48f1d4c099aea032fdc6c896e9648c95af0f6a7e0eb9174",
    "backend/app/services/evolution/text_changes.py": "fa3b978c2216a179bdd877c7dfb986034d1cad6b44224d053d2e67b4722d29b2",
    "docs/VITAMINC_ANALYSIS_PLAN_V1.md": "d2d3af48a494926babd9be84af4aed88d80c24cd9f72baff1b5ab263083104c3",
    "docs/VITAMINC_ANCHOR_SUPPLEMENT.md": "413b2f5d83f885af521c62b88e81252b390887dca48f56c03bada8f310691313",
    "docs/VITAMINC_TEXT_BASELINE_SUPPLEMENT.md": "78ae5dd4d4c5415b2978dad979f77079f2821349285dadb494f0cf478f0f21b1",
    "evaluation/config/vitaminc_anchor.json": "f82874d134795a8658eafa13d9a1ee43487c650d8049098835120be5c3bcd8aa",
    "evaluation/scripts/run_vitaminc_anchor.py": "2ec9fb0973053f0e536935e922d6cb33d7725e53e78da8981617753f900c5bc2",
    "evaluation/scripts/run_vitaminc_locked.py": "60a5d187b168ef8798a977179e8c1457109400beea2b12960206551b3bf73eb3",
    "evaluation/scripts/run_vitaminc_pilot.py": "aef497ae1d932ef5cb7a84ad1c61cea6522a48e850eb3e44b5900ade56ce95b8",
    "evaluation/scripts/run_vitaminc_sparse.py": "e560c64e62e17e611bbe7ca8c9fc180da13c73a7d86030ca0e7209d337569dc4",
    "evaluation/scripts/vitaminc_groups.py": "b663b74c6afabca71bc7d7440159dd8084fcd01e0ef104e7d34697c6540e8704",
    "evaluation/scripts/vitaminc_statistics.py": "a68a3f4a23e6add527607e035275a119a1e095c1a931f9e3c991aafc608a3038",
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n").encode("utf-8")


def safe_path(relative: str) -> Path:
    """Reject traversal, alternate drives, symlinks, and Windows junctions."""
    rel = PurePosixPath(relative)
    if (not relative or rel.is_absolute() or "\\" in relative or ":" in relative
            or any(part in (".", "..") for part in relative.split("/"))):
        raise ValueError(f"Unsafe relative path: {relative!r}")
    candidate = ROOT.joinpath(*rel.parts)
    for part in [*reversed(candidate.parents), candidate]:
        if part.exists() or part.is_symlink():
            info = part.lstat()
            if (stat.S_ISLNK(info.st_mode)
                    or getattr(info, "st_file_attributes", 0) & 0x400):
                raise ValueError(f"Symlink/reparse point not permitted: {part}")
    if not candidate.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError(f"Path escaped source root: {relative}")
    return candidate


def read_file(relative: str) -> bytes:
    path = safe_path(relative)
    if not path.is_file() or path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError(f"Missing, nonregular or unexpectedly large file: {relative}")
    return path.read_bytes()


def git_state():
    def git(*args):
        return subprocess.check_output(["git", "-c", "core.safecrlf=false", *args], cwd=ROOT).decode("utf-8").strip()

    # Only counts/booleans are retained. Unrelated dirty path names are omitted.
    tracked = git("diff", "--name-only", "HEAD", "-z")
    untracked = git("ls-files", "--others", "--exclude-standard", "-z")
    tracked_count = len([p for p in tracked.split("\0") if p])
    untracked_count = len([p for p in untracked.split("\0") if p])
    return {
        "historical_baseline_head": BASELINE_HEAD,
        "current_head": git("rev-parse", "HEAD"),
        "working_tree_dirty": bool(tracked_count or untracked_count),
        "tracked_changed_path_count": tracked_count,
        "untracked_path_count": untracked_count,
        "note": "Current selected bytes are inventoried; HEAD alone cannot reconstruct uncommitted research work. Counts describe the local checkout, not bundled files.",
    }


def collect():
    contents, pending = {}, []
    if len(FILES) != len(set(FILES)):
        raise ValueError("Duplicate allowlist entry")
    for name in FILES:
        if not safe_path(name).exists():
            pending.append(f"Missing selected file: {name}")
            continue
        contents[name] = read_file(name)
        expected = FROZEN_SOURCE_HASHES.get(name)
        if expected and digest(contents[name]) != expected:
            raise ValueError(f"Historical frozen source differs: {name}")
    origins = {}
    for run, filename, expected in AGGREGATES:
        source = f".local-deployment/research-runs/{run}/results.json"
        target = f"evidence/aggregate/{filename}"
        if expected is None:
            pending.append(f"Aggregate not yet reviewed and digest-pinned: {source}")
            continue
        data = read_file(source)
        if digest(data) != expected:
            raise ValueError(f"Aggregate changed since content review: {source}")
        json.loads(data)  # Reject accidental non-JSON payloads even at pinned paths.
        if target in contents:
            raise ValueError(f"Duplicate target: {target}")
        contents[target] = data
        origins[target] = {"source": source, "source_sha256": expected,
                           "transformation": "none; exact aggregate bytes, renamed in archive"}
    comparison_path = "paper/reconstruction_comparison.json"
    if comparison_path in contents:
        if digest(contents[comparison_path]) != "64fd78d1700ab6a3d95722a390bcb18fa7e0e6fd53360be27e5a76e886366723":
            raise ValueError("Reconstruction receipt changed since content review")
        comparison = json.loads(contents[comparison_path])
        if (not comparison["passed"] or comparison["checks"] != 1491 or comparison["failures"]
                or any(v != 0 for v in comparison["max_absolute_errors"].values())):
            raise ValueError("Reconstruction comparison does not match reviewed result")
        for field, name in (("plan_sha256", "docs/VITAMINC_RECONSTRUCTION_PLAN_V1.md"),
                            ("verifier_sha256", "evaluation/scripts/verify_vitaminc_reconstruction.py")):
            if name not in contents or comparison[field] != digest(contents[name]):
                raise ValueError(f"Reconstruction provenance changed: {name}")
    # Check that the included PDF and plots correspond to the current writing.
    pdf_manifest_name = "output/pdf/manuscript_build.json"
    if pdf_manifest_name in contents:
        manifest = json.loads(contents[pdf_manifest_name])
        for key, name in (("source_sha256", "paper/manuscript.md"),
                          ("script_sha256", "paper/build_manuscript_pdf.py"),
                          ("pdf_sha256", "output/pdf/gmee_vitaminc_manuscript.pdf")):
            if name in contents and manifest[key] != digest(contents[name]):
                pending.append(f"PDF needs rebuilding: {name}")
        for filename, expected in manifest.get("figures_sha256", {}).items():
            name = f"paper/figures/{filename}"
            if name not in contents or digest(contents[name]) != expected:
                pending.append(f"PDF figure needs rebuilding: {name}")
    figure_manifest = "paper/figures/figures_manifest.json"
    if figure_manifest in contents:
        manifest = json.loads(contents[figure_manifest])
        if manifest["script_sha256"] != digest(contents["evaluation/scripts/build_vitaminc_figures.py"]):
            pending.append("Figure source changed since rendering")
        for filename, expected in manifest["outputs_sha256"].items():
            name = f"paper/figures/{filename}"
            if name not in contents or digest(contents[name]) != expected:
                pending.append(f"Figure missing or changed since manifest: {name}")
    contents["SOURCE_STATE.json"] = json_bytes(git_state())
    inventory = {
        "schema": "gmee-local-review-bundle-v1",
        "status": "local_working_draft_not_publicly_released_or_venue_formatted",
        "scope": "Selected VitaminC component-study sources and aggregate evidence; not the whole GMEE project or an independent replication.",
        "excluded": ["raw dataset rows/text", "real case/page/revision identifiers", "row-level predictions", "model weights and fitted models", "databases and human votes", "credentials, .env files and installed environments", "logs, backups, Git history and unselected project files"],
        "aggregate_origins": origins,
        "files": [{"path": name, "bytes": len(data), "sha256": digest(data)}
                  for name, data in sorted(contents.items())],
        "integrity_note": "Inventory covers every payload entry except itself. ZIP digest is outside the ZIP. Hashes support byte integrity, not empirical validity or author/rights approval.",
        "zip_recipe": "Sorted entries; ZIP_STORED; timestamp 1980-01-01 00:00:00; Unix regular-file mode 0644; no archive comment. Fixed selected bytes and Git state give identical ZIP bytes.",
    }
    contents["BUNDLE_INVENTORY.json"] = json_bytes(inventory)
    return contents, pending


def build(contents):
    destination = safe_path(OUTPUT)
    sidecar = safe_path(OUTPUT + ".sha256")
    temporary = safe_path(OUTPUT + ".tmp")
    if any(p.exists() for p in (destination, sidecar, temporary)):
        raise ValueError("Bundle or sidecar already exists; preserve it and select an explicit new output name in source after review")
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        with temporary.open("xb") as stream, zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_STORED) as archive:
            for name, data in sorted(contents.items()):
                entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                entry.create_system = 3
                entry.external_attr = (stat.S_IFREG | 0o644) << 16
                entry.compress_type = zipfile.ZIP_STORED
                archive.writestr(entry, data)
        archive_hash = digest(temporary.read_bytes())
        # Hard-link publication is atomic and fails if the destination exists,
        # unlike os.rename's overwrite behavior on some platforms. Both paths
        # are on the same local filesystem. The temporary link is removed below.
        with sidecar.open("x", encoding="ascii", newline="\n") as stream:
            stream.write(f"{archive_hash}  {destination.name}\n")
        os.link(temporary, destination)
    finally:
        if temporary.exists():
            temporary.unlink()  # Only this builder's fixed, validated temporary file.
    return {"path": str(destination), "sha256": archive_hash, "files": len(contents)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--check", action="store_true", help="Validate without writing files (default)")
    modes.add_argument("--build", action="store_true", help="Create the local ZIP only when all checks pass")
    args = parser.parse_args()
    contents, pending = collect()
    if args.build:
        if pending:
            raise ValueError("Bundle is not ready:\n" + "\n".join(pending))
        print(json.dumps(build(contents), indent=2))
    else:
        print(json.dumps({"mode": "check_only_no_files_written", "ready_to_build": not pending,
                          "selected_entries": len(contents), "selected_bytes": sum(map(len, contents.values())),
                          "pending": pending, "entries": sorted(contents)}, indent=2))


if __name__ == "__main__":
    main()
