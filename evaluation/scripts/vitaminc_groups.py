"""Input-only dependence groups for VitaminC sensitivity analysis.

Call with rows containing `page_sha256` (the hash of the normalized page title),
`wiki_revision_id`, and `input_pair_sha256` (the unordered exact sentence pair).
Rows sharing any key, including through a chain, form one component. Labels and
model scores are neither required nor inspected. Use these components as a
secondary bootstrap unit; the protocol's primary unit remains page.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from typing import Any


def connected_input_groups(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Return deterministic component IDs aligned with the input row order."""
    if not rows:
        raise ValueError("At least one input row is required")
    parent = list(range(len(rows)))

    def root(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def connect(left: int, right: int) -> None:
        a, b = root(left), root(right)
        if a != b:
            parent[max(a, b)] = min(a, b)

    seen_cases: set[str] = set()
    owner: dict[tuple[str, str], int] = {}
    keys = ("page_sha256", "wiki_revision_id", "input_pair_sha256")
    for index, row in enumerate(rows):
        case_id = row.get("case_id")
        if not isinstance(case_id, str) or not case_id or case_id in seen_cases:
            raise ValueError("Case IDs must be unique nonempty strings")
        seen_cases.add(case_id)
        for field in keys:
            value = row.get(field)
            if not isinstance(value, str):
                raise ValueError(f"{field} must be a string")
            if not value.strip():
                # Empty metadata is missing, not a shared identity. The exact
                # pair hash produced by the runner is always nonempty.
                continue
            token = (field, value)
            if token in owner:
                connect(index, owner[token])
            else:
                owner[token] = index

    components: dict[int, list[int]] = {}
    for index in range(len(rows)):
        components.setdefault(root(index), []).append(index)
    ids = [""] * len(rows)
    for members in components.values():
        names = sorted(rows[index]["case_id"] for index in members)
        payload = json.dumps(names, ensure_ascii=False, separators=(",", ":"))
        group_id = "input-component:" + hashlib.sha256(payload.encode()).hexdigest()
        for index in members:
            ids[index] = group_id
    sizes = Counter(ids)
    return {
        "group_ids": ids,
        "component_count": len(sizes),
        "largest_component_rows": max(sizes.values()),
        "components_over_one_row": sum(size > 1 for size in sizes.values()),
        "rows_in_nontrivial_components": sum(
            size for size in sizes.values() if size > 1
        ),
        "grouping_rule": (
            "connected components of normalized page-title hash, "
            "nonempty wiki_revision_id, and exact unordered sentence-pair hash"
        ),
    }
