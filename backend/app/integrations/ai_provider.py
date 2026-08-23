import json
import httpx
from pydantic import ValidationError
from app.core.config import get_settings
from app.schemas.document_analysis import OrganizationProposal

class AIProviderError(Exception): pass
class AIProviderUnavailable(AIProviderError): pass

PROMPT = """Extrae solamente datos organizacionales explícitos del texto. No inventes información, no realices análisis jurídico, no determines obligaciones ni cumplimiento. Usa null si no está presente. Devuelve JSON con organization_name, rut, activity_description y warnings (lista de incertidumbres)."""

def extract_organization(text: str) -> OrganizationProposal:
    settings = get_settings()
    if settings.ai_provider != "gemini" or not settings.ai_api_key:
        raise AIProviderUnavailable("La integración de IA no está configurada.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent"
    payload = {"contents": [{"parts": [{"text": f"{PROMPT}\n\nTEXTO:\n{text}"}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    try:
        response = httpx.post(url, params={"key": settings.ai_api_key}, json=payload, timeout=settings.ai_timeout_seconds)
        response.raise_for_status()
        raw = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return OrganizationProposal.model_validate(json.loads(raw))
    except httpx.TimeoutException as error:
        raise AIProviderUnavailable("El servicio externo agotó el tiempo de espera.") from error
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as error:
        raise AIProviderUnavailable("El servicio externo no devolvió una respuesta válida.") from error
