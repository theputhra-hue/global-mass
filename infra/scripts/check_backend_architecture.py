"""Static dependency direction checks; does not import the app or contact stores."""
from __future__ import annotations

import ast
import sys
from importlib.util import resolve_name
from pathlib import Path

PURE_MODULES = {
    "app.services.evolution.quantities",
    "app.services.evolution.text_changes",
    "app.services.verdict.mutation_diff",
}
LOWER_LAYERS = ("core", "db", "models", "schemas", "ml", "services")
# Existing compatibility methods on HuggingFaceLLMClient use these helpers.
# Keep this debt explicit; new adapters may not acquire service dependencies.
LEGACY_ADAPTER_HELPERS = {
    "app.services.evolution.text_changes",
    "app.services.verdict.engine",
}


def beneath(module: str, prefix: str) -> bool:
    return module == prefix or module.startswith(prefix + ".")


def violations(source: str, module: str) -> list[str]:
    """Inspect nested and type-only imports too: these are conservative boundaries."""
    errors = []
    package = module.rsplit(".", 1)[0]
    for node in ast.walk(ast.parse(source)):
        dependencies: list[str] = []
        if isinstance(node, ast.Import):
            dependencies = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            dependency = node.module or ""
            if node.level:
                dependency = resolve_name("." * node.level + dependency, package)
            dependencies = [dependency]
            # Catch 'from app import api' as well as 'from app.api import ...'.
            dependencies += [dependency + "." + alias.name for alias in node.names]
        for dependency in dependencies:
            forbidden = False
            if any(beneath(module, "app." + layer) for layer in LOWER_LAYERS):
                forbidden = any(beneath(dependency, prefix) for prefix in (
                    "app.api", "app.runtime", "app.main", "app.cloud",
                ))
            if beneath(module, "app.ml"):
                legacy_helper = module == "app.ml.llm_client" and any(
                    beneath(dependency, prefix) for prefix in LEGACY_ADAPTER_HELPERS
                )
                forbidden |= not legacy_helper and any(beneath(dependency, prefix) for prefix in (
                    "app.services", "app.db", "app.models",
                ))
            if any(beneath(module, prefix) for prefix in ("app.models", "app.db", "app.schemas")):
                forbidden |= any(beneath(dependency, prefix) for prefix in ("app.services", "app.ml"))
            if module in PURE_MODULES:
                allowed = dependency.split(".")[0] in sys.stdlib_module_names or any(
                    beneath(dependency, prefix) for prefix in PURE_MODULES
                )
                forbidden |= not allowed
            if forbidden:
                errors.append(f"{module}:{node.lineno}: forbidden dependency {dependency}")
    return sorted(set(errors))


def check(root: Path) -> list[str]:
    errors = []
    for path in sorted((root / "backend/app").rglob("*.py")):
        parts = path.relative_to(root / "backend").with_suffix("").parts
        module = ".".join(parts)
        errors.extend(violations(path.read_text(encoding="utf8"), module))
    return errors


def main() -> int:
    errors = check(Path(__file__).resolve().parents[2])
    if errors:
        print("\n".join(errors))
        return 1
    print("PASS backend dependency directions and pure comparison boundaries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
