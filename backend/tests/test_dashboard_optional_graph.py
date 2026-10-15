from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.v1 import dashboard


@pytest.mark.asyncio
async def test_missing_driver_keeps_corpus_counts_available():
    with patch.object(dashboard, "get_neo4j_driver", AsyncMock(side_effect=RuntimeError("disabled"))):
        assert await dashboard._optional_graph_driver() is None
    with patch.object(dashboard, "_postgres_metrics", AsyncMock(return_value={"articles_total": 500})), \
         patch.object(dashboard, "_redis_metrics", AsyncMock(return_value={"available": True})):
        result = await dashboard.dashboard_snapshot(db=MagicMock(), neo4j_driver=None, redis_client=MagicMock())
    assert result["articles_total"] == 500
    assert result["services"]["postgres"] == "ok"
    assert result["graph"] is None
    assert result["cache"]["available"]
