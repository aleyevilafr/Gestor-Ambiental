from fastapi import HTTPException, status
from app.integrations.ai_provider import AIProviderUnavailable, generate_compliance_plan
from app.models.obligation import Obligation

def generate(obligation: Obligation):
    context="\n".join(f"{key}: {value}" for key,value in {"title":obligation.title,"description":obligation.description,"matter":obligation.matter,"regulatory_source":obligation.regulatory_source,"article":obligation.article,"deadline":obligation.deadline,"frequency":obligation.frequency}.items() if value is not None)
    try: proposal=generate_compliance_plan(context)
    except AIProviderUnavailable as error: raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,str(error)) from error
    for action in proposal.recommended_actions:
        if obligation.deadline and action.suggested_due_date and action.suggested_due_date>obligation.deadline:
            action.suggested_due_date=None;proposal.warnings.append("Una fecha sugerida posterior al vencimiento fue descartada.")
    proposal.warnings=proposal.warnings[:10]
    return proposal
