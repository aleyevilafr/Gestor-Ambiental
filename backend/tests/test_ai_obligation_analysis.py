from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.integrations.ai_provider import AIProviderTimeout, AIProviderUnavailable
from app.schemas.ai_obligation_analysis import AIObligationAnalysisRawResponse
from app.services import ai_obligation_analysis as service


def raw_response(*proposals: dict) -> AIObligationAnalysisRawResponse:
    return AIObligationAnalysisRawResponse(proposals=list(proposals), warnings=["Revisar las fechas extraídas."])


def test_analyze_txt_returns_validated_proposals_without_persisting(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        service,
        "analyze_obligations",
        lambda text: raw_response(
            {
                "title": "Declaración anual REP",
                "matter": "REP",
                "regulatory_source": "Ley 20.920",
                "deadline": "2026-08-31",
                "confidence": 0.85,
            },
        ),
    )

    result = service.analyze_document(b"Texto de una obligacion", "text/plain", "normativa.txt")

    assert result.document_name == "normativa.txt"
    assert result.proposals[0].title == "Declaración anual REP"
    assert result.proposals[0].deadline.isoformat() == "2026-08-31"
    assert result.warnings == ["Revisar las fechas extraídas."]


def test_analyze_pdf_uses_existing_text_extractor(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service, "extract_pdf_text", lambda content: "Contenido PDF")
    monkeypatch.setattr(service, "analyze_obligations", lambda text: raw_response({"title": "Reporte"}))

    result = service.analyze_document(b"%PDF-sample", "application/pdf", "archivo.pdf")

    assert result.document_name == "archivo.pdf"
    assert [proposal.title for proposal in result.proposals] == ["Reporte"]


@pytest.mark.parametrize(
    ("content", "content_type", "expected_status"),
    [
        (b"contenido", "application/msword", 400),
        (b"", "text/plain", 422),
        (b"x" * (service.MAX_PDF_BYTES + 1), "text/plain", 413),
    ],
    ids=["unsupported-mime", "empty-text", "oversized-text"],
)
def test_document_validation_rejects_invalid_payloads(content: bytes, content_type: str, expected_status: int) -> None:
    with pytest.raises(HTTPException) as caught:
        service.analyze_document(content, content_type, "documento.txt")

    assert caught.value.status_code == expected_status


def test_invalid_external_proposal_is_discarded_with_warning(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service, "analyze_obligations", lambda text: raw_response({"title": " "}, {"title": "Válida"}))

    result = service.analyze_document(b"texto", "text/plain", "documento.txt")

    assert [proposal.title for proposal in result.proposals] == ["Válida"]
    assert any("propuesta 1" in warning.lower() for warning in result.warnings)


@pytest.mark.parametrize(
    ("error", "expected_status"),
    [
        (AIProviderTimeout("Tiempo agotado"), 504),
        (AIProviderUnavailable("Sin API key"), 503),
    ],
)
def test_external_provider_errors_are_controlled(monkeypatch: pytest.MonkeyPatch, error: Exception, expected_status: int) -> None:
    def raise_error(text: str):
        raise error

    monkeypatch.setattr(service, "analyze_obligations", raise_error)
    with pytest.raises(HTTPException) as caught:
        service.analyze_document(b"texto", "text/plain", "documento.txt")

    assert caught.value.status_code == expected_status
