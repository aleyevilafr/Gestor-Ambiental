import pytest
from fastapi import HTTPException

from app.models.organization import CompanyType
from app.schemas.company_profile import CompanyProfileExtractionResult
from app.services import document_analysis
from app.services.pdf_text_extraction import MAX_PDF_BYTES, extract_pdf_text


def test_company_profile_normalizes_invalid_rut_and_dates(monkeypatch):
    monkeypatch.setattr(document_analysis, "extract_company_profile", lambda text: CompanyProfileExtractionResult(legal_name="Demo", rut="12.345.678-0", incorporation_date="fecha", document_date="2026-99-01", legal_representatives=["Representante"] ))
    result = document_analysis.analyze_company_profile("texto")
    assert result.rut is None
    assert result.incorporation_date is None
    assert result.document_date is None
    assert any("vigencia" in warning for warning in result.warnings)


def test_company_profile_accepts_unknown_type_and_null_fields(monkeypatch):
    monkeypatch.setattr(document_analysis, "extract_company_profile", lambda text: CompanyProfileExtractionResult(company_type=CompanyType.UNKNOWN))
    result = document_analysis.analyze_company_profile("texto")
    assert result.company_type is CompanyType.UNKNOWN
    assert result.legal_name is None


def test_pdf_rejects_invalid_signature_and_oversized_content():
    with pytest.raises(HTTPException) as invalid:
        extract_pdf_text(b"not a pdf")
    assert invalid.value.status_code == 422
    with pytest.raises(HTTPException) as oversized:
        extract_pdf_text(b"%PDF-" + b"x" * MAX_PDF_BYTES)
    assert oversized.value.status_code == 413
