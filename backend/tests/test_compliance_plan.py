from datetime import date

import pytest
from fastapi import HTTPException

from app.integrations.ai_provider import AIProviderUnavailable
from app.models.obligation import Obligation
from app.schemas.compliance_plan import CompliancePlanProposal
from app.services import compliance_plan


def obligation(deadline: date | None = date(2026, 8, 30)) -> Obligation:
    return Obligation(title="Declaración", matter="Residuos", regulatory_source="D.S. 148", deadline=deadline)


def test_proposal_normalizes_empty_and_invalid_date() -> None:
    proposal = CompliancePlanProposal.model_validate({"objective": "  ", "recommended_actions": [{"title": " Consolidar registros ", "description": " ", "suggested_due_date": "fecha-invalida", "expected_evidence": " "}]})
    assert proposal.objective is None
    assert proposal.recommended_actions[0].title == "Consolidar registros"
    assert proposal.recommended_actions[0].description is None
    assert proposal.recommended_actions[0].suggested_due_date is None
    assert proposal.warnings == ["Una fecha sugerida inválida fue descartada."]


def test_plan_discards_date_after_obligation_deadline(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(compliance_plan, "generate_compliance_plan", lambda _context: CompliancePlanProposal.model_validate({"recommended_actions": [{"title": "Preparar borrador", "suggested_due_date": "2026-09-01"}]}))
    result = compliance_plan.generate(obligation())
    assert result.recommended_actions[0].suggested_due_date is None
    assert result.warnings == ["Una fecha sugerida posterior al vencimiento fue descartada."]


def test_provider_failure_is_controlled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(compliance_plan, "generate_compliance_plan", lambda _context: (_ for _ in ()).throw(AIProviderUnavailable("no configurado")))
    with pytest.raises(HTTPException) as error:
        compliance_plan.generate(obligation())
    assert error.value.status_code == 503
