"""Explicitly prepare public ML artifacts before starting the local API.

Run from backend: python -m scripts.prepare_local_models
Downloads happen only in this operator command, never inside a request.
"""

from __future__ import annotations

import gc
import json
import os
from pathlib import Path
from typing import Any


def main() -> int:
    os.chdir(Path(__file__).resolve().parents[1])
    from transformers import (
        AutoModelForSeq2SeqLM,
        AutoModelForSequenceClassification,
        AutoTokenizer,
    )

    from app.core.config import get_settings
    from app.ml.embedding_service import EmbeddingService
    from app.ml.entity_extractor import EntityExtractor
    from app.ml.llm_client import HuggingFaceLLMClient
    from app.services.verdict.engine import nli_configuration

    if get_settings().HUGGINGFACE_API_KEY:
        raise RuntimeError("Unset HUGGINGFACE_API_KEY to prepare the local-model hosting profile.")
    models: list[dict[str, Any]] = []
    print("Preparing spaCy (must already be installed from the project dependencies)...", flush=True)
    EntityExtractor.load_model()
    print("Preparing the existing 768-dimensional embedding model...", flush=True)
    EmbeddingService.load_model()
    if len(EmbeddingService.generate_embedding("Model compatibility probe.")) != 768:
        raise RuntimeError("Configured embeddings are incompatible with the existing 768-dimensional corpus.")
    embedding = EmbeddingService._model
    assert embedding is not None
    transformer: Any = embedding[0]
    models.append({"role": "embedding", "id": EmbeddingService.model_name(), "dimensions": 768,
                   "revision": getattr(transformer.auto_model.config, "_commit_hash", None)})
    # Preparation validates models sequentially to bound peak memory.
    EmbeddingService._model = None
    del embedding, transformer
    gc.collect()
    nli = nli_configuration()
    specs = [
        ("stance", nli["model"], nli["revision"], AutoModelForSequenceClassification),
        ("claim_extraction", HuggingFaceLLMClient.MODEL_ID, None, AutoModelForSeq2SeqLM),
    ]
    for role, model_id, revision, factory in specs:
        print(f"Preparing {role}: {model_id}...", flush=True)
        options = {"revision": revision} if revision else {}
        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=False, **options)
        model = factory.from_pretrained(model_id, trust_remote_code=False, **options)
        models.append({"role": role, "id": model_id, "revision": getattr(model.config, "_commit_hash", None)})
        del tokenizer, model
        gc.collect()
    target = Path("../.local-deployment/models.json")
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps({"models": models}, indent=2) + "\n", encoding="utf-8")
    print("Models prepared. Local revision manifest saved; serving may now use the cache.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
