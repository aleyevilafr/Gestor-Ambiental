import json
import httpx
from pydantic import ValidationError
from app.core.config import get_settings
from app.schemas.document_analysis import OrganizationProposal
from app.schemas.company_profile import CompanyProfileExtractionResult

class AIProviderError(Exception): pass
class AIProviderUnavailable(AIProviderError): pass

PROMPT = """Extrae solamente datos organizacionales explícitos del texto. No inventes información, no realices análisis jurídico, no determines obligaciones ni cumplimiento. Usa null si no está presente. Devuelve JSON con organization_name, rut, activity_description y warnings (lista de incertidumbres)."""
COMPANY_PROFILE_PROMPT = """Extrae únicamente hechos explícitos de un documento societario chileno. No inventes información, no determines vigencia jurídica, no emitas asesoría jurídica y usa null cuando falten datos. No infieras normativa. Devuelve JSON con legal_name, trade_name, rut, company_type (SPA, LIMITADA, SA_CERRADA, SA_ABIERTA, EIRL, OTHER o UNKNOWN), incorporation_date, address, commune, region, business_purpose, legal_representatives, document_date y warnings. Separa hechos detectados de advertencias."""

def extract_organization(text: str) -> OrganizationProposal:
    return _extract(text, PROMPT, OrganizationProposal)


def extract_company_profile(text: str) -> CompanyProfileExtractionResult:
    return _extract(text, COMPANY_PROFILE_PROMPT, CompanyProfileExtractionResult)


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
        raise AIProviderUnavailable("El servicio externo agotó el tiempo de espera.") from error
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as error:
        raise AIProviderUnavailable("El servicio externo no devolvió una respuesta válida.") from error
