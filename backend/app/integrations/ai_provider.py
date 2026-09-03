import json
import httpx
from pydantic import ValidationError
from app.core.config import get_settings
from app.schemas.document_analysis import OrganizationProposal
from app.schemas.company_profile import CompanyProfileExtractionResult
from app.schemas.compliance_plan import CompliancePlanProposal
from app.schemas.ai_obligation_analysis import AIObligationAnalysisRawResponse

class AIProviderError(Exception): pass
class AIProviderUnavailable(AIProviderError): pass
class AIProviderTimeout(AIProviderUnavailable): pass

PROMPT = """Extrae solamente datos organizacionales explícitos del texto. No inventes información, no realices análisis jurídico, no determines obligaciones ni cumplimiento. Usa null si no está presente. Devuelve JSON con organization_name, rut, activity_description y warnings (lista de incertidumbres)."""
COMPANY_PROFILE_PROMPT = """Extrae únicamente hechos explícitos de un documento societario chileno. No inventes información, no determines vigencia jurídica, no emitas asesoría jurídica y usa null cuando falten datos. No infieras normativa. Devuelve JSON con legal_name, trade_name, rut, company_type (SPA, LIMITADA, SA_CERRADA, SA_ABIERTA, EIRL, OTHER o UNKNOWN), incorporation_date, address, commune, region, business_purpose, legal_representatives, document_date y warnings. Separa hechos detectados de advertencias."""
COMPLIANCE_PLAN_PROMPT = """Propón un plan operativo concreto usando exclusivamente el contexto proporcionado. No inventes normativa, requisitos ni obligaciones. No declares cumplimiento o incumplimiento jurídico ni afirmes que una acción garantiza cumplimiento. Devuelve JSON con objective, assessment, recommended_actions (máximo 5: title, description, suggested_due_date, expected_evidence) y warnings. Evita recomendaciones genéricas; si falta información, indícalo en warnings."""
OBLIGATION_ANALYSIS_PROMPT = """Analiza el documento exclusivamente para identificar disposiciones ambientales que puedan representar obligaciones de cumplimiento respaldadas por el texto. No inventes obligaciones ni determines cumplimiento o incumplimiento. No asignes responsables internos, organización ni estados. No infieras fechas, artículos o fuentes que no estén respaldados. Devuelve exclusivamente JSON con proposals y warnings. Cada propuesta puede contener title, description, matter, regulatory_source, article, deadline, frequency, confidence y source_excerpt. Usa null cuando falte información. confidence solo representa confianza de extracción, no una conclusión jurídica. source_excerpt debe ser un fragmento breve del documento."""

def extract_organization(text: str) -> OrganizationProposal:
    return _extract(text, PROMPT, OrganizationProposal)


def extract_company_profile(text: str) -> CompanyProfileExtractionResult:
    return _extract(text, COMPANY_PROFILE_PROMPT, CompanyProfileExtractionResult)

def generate_compliance_plan(context: str) -> CompliancePlanProposal:
    return _extract(context, COMPLIANCE_PLAN_PROMPT, CompliancePlanProposal)


def analyze_obligations(text: str) -> AIObligationAnalysisRawResponse:
    return _extract(text, OBLIGATION_ANALYSIS_PROMPT, AIObligationAnalysisRawResponse)


def _extract(text: str, prompt: str, schema):
    settings = get_settings()
    if settings.ai_provider != "gemini" or not settings.ai_api_key:
        raise AIProviderUnavailable("La integración de IA no está configurada.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent"
    payload = {"contents": [{"parts": [{"text": f"{prompt}\n\nTEXTO:\n{text}"}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    try:
        response = httpx.post(url, params={"key": settings.ai_api_key}, json=payload, timeout=settings.ai_timeout_seconds)
        response.raise_for_status()
        raw = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return schema.model_validate(json.loads(raw))
    except httpx.TimeoutException as error:
        raise AIProviderTimeout("El servicio externo agotó el tiempo de espera.") from error
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as error:
        raise AIProviderUnavailable("El servicio externo no devolvió una respuesta válida.") from error
