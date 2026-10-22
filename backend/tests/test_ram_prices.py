from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.ram_prices import RAMPriceObservation, compare_ram_prices


def observation(**changes: object) -> RAMPriceObservation:
    return RAMPriceObservation.model_validate({
        "product_kind": "ram_kit", "manufacturer": "Fixture", "part_number": "TEST-2X16-DDR5",
        "memory_type": "DDR5", "total_capacity_gb": 32, "module_count": 2, "speed_mt_s": 6000,
        "form_factor": "DIMM", "ecc": "non_ecc", "timings": "30-36-36-76",
        "condition": "new", "amount": "100.00", "currency": "USD", "market": "US", "seller": "Fixture shop",
        "tax_basis": "excluded", "shipping_basis": "included", "offer_basis": "regular",
        "observed_at": "2026-10-01T00:00:00Z", "source_url": "https://example.org/ram",
        "source_quote": "Synthetic test quote: this 32 GB kit is listed at USD 100.",
        "source_revision": "fixture-capture-1", "review_status": "accepted", "reviewer_id": "test-reviewer",
        **changes,
    })


def test_same_offer_comparison_uses_decimal_arithmetic_without_claiming_market_truth():
    result = compare_ram_prices(observation(), observation(amount="125.00", observed_at="2026-10-02T00:00:00Z", source_revision="fixture-capture-2"))
    assert Decimal(result["percent_change"]) == Decimal(25)
    assert "not a market-wide trend" in result["interpretation"]


@pytest.mark.parametrize("changes", [{"currency": "INR"}, {"module_count": 1}, {"memory_type": "DDR4"},
    {"seller": "Another shop"}, {"offer_basis": "coupon"}, {"tax_basis": "included"}, {"total_capacity_gb": 64},
    {"form_factor": "SO-DIMM"}, {"ecc": "ecc_registered"}, {"timings": "36-36-36-76"}])
def test_comparison_refuses_unmatched_conditions(changes):
    with pytest.raises(ValueError, match="Non-comparable"):
        compare_ram_prices(observation(), observation(observed_at="2026-10-02T00:00:00Z", source_revision="fixture-capture-2", **changes))


@pytest.mark.parametrize("changes", [{"review_status": "pending"}, {"shipping_basis": "unknown"},
    {"observed_at": "2026-09-01T00:00:00Z"}, {"source_revision": "fixture-capture-1"}])
def test_incomplete_or_reversed_observations_do_not_produce_findings(changes):
    with pytest.raises(ValueError):
        compare_ram_prices(observation(), observation(**{"observed_at": "2026-10-02T00:00:00Z", "source_revision": "fixture-capture-2", **changes}))


@pytest.mark.parametrize("changes", [{"product_kind": "laptop"}, {"amount": "NaN"}, {"amount": "-1"},
    {"source_url": "javascript:alert(1)"}, {"source_url": "https://user:secret@example.org"}, {"reviewer_id": None}])
def test_invalid_or_unattributed_observations_are_rejected(changes):
    with pytest.raises(ValidationError):
        observation(**changes)


@pytest.mark.parametrize("changes", [{"form_factor": "unknown"}, {"ecc": "unknown"}, {"timings": None}])
def test_unknown_product_details_do_not_make_two_offers_comparable(changes):
    first = observation(**changes)
    second = observation(**{"observed_at": "2026-10-02T00:00:00Z", "source_revision": "fixture-capture-2", **changes})
    with pytest.raises(ValueError, match="must be known"):
        compare_ram_prices(first, second)
