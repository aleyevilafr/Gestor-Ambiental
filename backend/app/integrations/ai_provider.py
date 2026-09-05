import json
import logging
import re
import httpx
from pydantic import ValidationError
from app.core.config import get_settings
from app.schemas.document_analysis import OrganizationProposal
from app.schemas.company_profile import CompanyProfileExtractionResult
from app.schemas.compliance_plan import CompliancePlanProposal
from app.schemas.ai_obligation_analysis import AIObligationAnalysisRawResponse

def _normalize_json_fence(raw: str) -> str:
    match = re.fullmatch(r"\s*```json\s*\n(.*?)\n```\s*", raw, flags=re.DOTALL)
    return match.group(1) if match else raw

class AIProviderError(Exception): pass
class AIProviderUnavailable(AIProviderError): pass
class AIProviderInvalidResponse(AIProviderError): pass
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
    prompt = OBLIGATION_ANALYSIS_PROMPT + """ Contrato de tipos obligatorio: proposals es una lista de objetos y warnings una lista de strings. title es un string no vacío. description, matter, regulatory_source, article, frequency y source_excerpt son strings o null, nunca objetos. deadline es YYYY-MM-DD o null, nunca texto natural. confidence es un número entre 0 y 1 o null, nunca etiquetas como Alta ni porcentajes como 90%. Si no puedes expresar la confianza numéricamente, devuelve null."""
    return _extract(text, prompt, AIObligationAnalysisRawResponse)


def _extract(text: str, prompt: str, schema):
    settings = get_settings()
    trace = settings.app_env == "development" and schema is AIObligationAnalysisRawResponse
    if trace:
        logging.getLogger(__name__).warning('[AI] provider called model=%s provider=%s key_loaded=%s timeout=%s', settings.ai_model, settings.ai_provider, bool(settings.ai_api_key), settings.ai_timeout_seconds)
    if settings.ai_provider != "gemini" or not settings.ai_api_key:
        raise AIProviderUnavailable("La integración de IA no está configurada.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent"
    if trace:
        logging.getLogger(__name__).warning('[AI] url=%s', url)
    payload = {"contents": [{"parts": [{"text": f"{prompt}\n\nTEXTO:\n{text}"}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    is_obligation_analysis = schema is AIObligationAnalysisRawResponse
    try:
        response = httpx.post(url, params={"key": settings.ai_api_key}, json=payload, timeout=settings.ai_timeout_seconds)
        if trace:
            logging.getLogger(__name__).warning('[AI] gemini status=%s', response.status_code)
        response.raise_for_status()
        raw = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(_normalize_json_fence(raw) if is_obligation_analysis else raw)
        if trace:
            logging.getLogger(__name__).warning('[AI] parsed response')
        return schema.model_validate(parsed)
    except httpx.TimeoutException as error:
        raise AIProviderTimeout("El servicio externo agotó el tiempo de espera.") from error
    except httpx.HTTPError as error:
        if trace:
            logging.getLogger(__name__).warning('[AI] provider unavailable exception=%s', type(error).__name__)
        raise AIProviderUnavailable("El proveedor de IA no está disponible.") from error
    except (KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as error:
        if trace:
            logging.getLogger(__name__).warning('[AI] invalid response exception=%s', type(error).__name__)
        if is_obligation_analysis:
            raise AIProviderInvalidResponse("El servicio externo no devolvió una respuesta válida.") from error
        raise AIProviderUnavailable("El servicio externo no devolvió una respuesta válida.") from error
