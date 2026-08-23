import pytest
from fastapi import HTTPException
from app.schemas.document_analysis import DocumentAnalysisRequest, OrganizationProposal
from app.services import document_analysis

def test_valid_proposal_and_invalid_rut(monkeypatch):
    monkeypatch.setattr(document_analysis,"extract_organization",lambda text:OrganizationProposal(organization_name="Empresa",rut="12.345.678-0"))
    result=document_analysis.analyze(DocumentAnalysisRequest(text="Empresa"))
    assert result.rut is None and result.warnings
def test_empty_content_rejected():
    with pytest.raises(HTTPException): document_analysis.analyze(DocumentAnalysisRequest(text="   "))
def test_provider_failure_is_controlled(monkeypatch):
    from app.integrations.ai_provider import AIProviderUnavailable
    monkeypatch.setattr(document_analysis,"extract_organization",lambda text:(_ for _ in ()).throw(AIProviderUnavailable("no disponible")))
    with pytest.raises(HTTPException) as error: document_analysis.analyze(DocumentAnalysisRequest(text="contenido"))
    assert error.value.status_code==503
