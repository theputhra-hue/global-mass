"""Evidence-bearing RAM price observations. Validation is not source verification."""

from decimal import Decimal
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, model_validator


class RAMPriceObservation(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, str_strip_whitespace=True)

    # Device prices and market-average estimates must not masquerade as a RAM SKU.
    product_kind: Literal["ram_module", "ram_kit"]
    manufacturer: str = Field(min_length=1, max_length=100)
    part_number: str = Field(min_length=1, max_length=120)
    memory_type: Literal["DDR3", "DDR4", "DDR5", "LPDDR4", "LPDDR5"]
    total_capacity_gb: int = Field(strict=True, ge=1, le=8192)
    module_count: int = Field(strict=True, ge=1, le=64)
    speed_mt_s: int = Field(strict=True, ge=1, le=50000)
    condition: Literal["new", "used", "refurbished"]
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=4)
    currency: Literal["USD", "INR", "EUR", "GBP", "CAD", "AUD", "JPY"]
    # Market and seller are explicit; comparing different shops needs a different estimand.
    market: str = Field(min_length=1, max_length=100)
    seller: str = Field(min_length=1, max_length=200)
    tax_basis: Literal["included", "excluded", "unknown"]
    shipping_basis: Literal["included", "excluded", "unknown"]
    offer_basis: Literal["regular", "sale", "coupon", "membership", "unknown"]
    observed_at: AwareDatetime
    source_url: HttpUrl
    source_quote: str = Field(min_length=1, max_length=1500)
    source_revision: str = Field(min_length=1, max_length=200)
    review_status: Literal["pending", "accepted", "rejected"] = "pending"
    reviewer_id: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode="after")
    def consistent_product(self) -> "RAMPriceObservation":
        if self.source_url.username or self.source_url.password:
            raise ValueError("Source URLs must not contain credentials")
        if self.total_capacity_gb % self.module_count:
            raise ValueError("Total kit capacity must be divisible by module count")
        if self.product_kind == "ram_module" and self.module_count != 1:
            raise ValueError("A single RAM module must have module_count=1")
        if self.review_status != "pending" and not self.reviewer_id:
            raise ValueError("A review decision requires an attributable reviewer")
        return self


def compare_ram_prices(older: RAMPriceObservation, newer: RAMPriceObservation) -> dict[str, str]:
    """Only same-offer comparisons; no currency conversion, extrapolation or truth verdict."""
    if older.review_status != "accepted" or newer.review_status != "accepted":
        raise ValueError("Both source observations require review before comparison")
    if newer.observed_at <= older.observed_at:
        raise ValueError("The newer observation must have a later timestamp")
    keys = ("product_kind", "manufacturer", "part_number", "memory_type", "total_capacity_gb",
            "module_count", "speed_mt_s", "condition", "currency", "market", "seller",
            "tax_basis", "shipping_basis", "offer_basis")
    for key in keys:
        if getattr(older, key) != getattr(newer, key):
            raise ValueError(f"Non-comparable observations: {key} differs")
    if "unknown" in (older.tax_basis, older.shipping_basis, older.offer_basis):
        raise ValueError("Tax, shipping and offer conditions must be known")
    if older.source_revision == newer.source_revision:
        raise ValueError("Distinct source revision or capture identities are required")
    delta = newer.amount - older.amount
    return {"currency": older.currency, "older_amount": str(older.amount), "newer_amount": str(newer.amount),
            "absolute_change": str(delta), "percent_change": str(delta / older.amount * 100),
            "interpretation": "Change between two reviewed, comparable quoted offers; not a market-wide trend or misinformation verdict."}
