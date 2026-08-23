from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.models.organization import CompanyType


class CompanyProfileExtractionResult(BaseModel):
    legal_name: str | None = None
    trade_name: str | None = None
    rut: str | None = None
    company_type: CompanyType = CompanyType.UNKNOWN
    incorporation_date: str | None = None
    address: str | None = None
    commune: str | None = None
    region: str | None = None
    business_purpose: str | None = None
    legal_representatives: list[str] = Field(default_factory=list, max_length=5)
    document_date: str | None = None
    warnings: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("legal_name", "trade_name", "rut", "address", "commune", "region", "business_purpose", "incorporation_date", "document_date", mode="before")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        return value.strip() or None if isinstance(value, str) else value


class CompanyProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    rut: str = Field(min_length=2, max_length=20)
    company_type: CompanyType = CompanyType.UNKNOWN
    business_purpose: str | None = Field(default=None, max_length=5000)
    address: str | None = Field(default=None, max_length=500)

    @field_validator("name", "business_purpose", "address", mode="before")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class CompanyProfileResponse(BaseModel):
    name: str
    rut: str
    company_type: CompanyType
    business_purpose: str | None
    address: str | None
