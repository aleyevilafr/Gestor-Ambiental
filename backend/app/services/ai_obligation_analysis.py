from pathlib import PurePath
import logging
from app.core.config import get_settings

from fastapi import HTTPException, status
from pydantic import ValidationError

from app.integrations.ai_provider import AIProviderTimeout, AIProviderUnavailable, AIProviderInvalidResponse, analyze_obligations
from app.schemas.ai_obligation_analysis import (
    AIObligationAnalysisResponse,
    AIObligationProposal,
)
from app.services.pdf_text_extraction import MAX_EXTRACTED_CHARACTERS, MAX_PDF_BYTES, extract_pdf_text


SUPPORTED_CONTENT_TYPES = {"application/pdf", "text/plain"}


def analyze_document(content: bytes, content_type: str, document_name: str | None) -> AIObligationAnalysisResponse:
    normalized_content_type = content_type.split(";", 1)[0].strip().lower()
    if normalized_content_type not in SUPPORTED_CONTENT_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solo se aceptan documentos PDF o TXT.")

    text = _extract_text(content, normalized_content_type)
    if get_settings().app_env == "development":
        logging.getLogger(__name__).warning('[AI] file validated; text extracted length=%s', len(text))
    try:
        raw = analyze_obligations(text)
    except AIProviderTimeout as error:
        raise HTTPException(status.HTTP_504_GATEWAY_TIMEOUT, str(error)) from error
    except AIProviderUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    except AIProviderInvalidResponse as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(error)) from error

    warnings = [warning.strip() for warning in raw.warnings if warning.strip()][:20]
    proposals: list[AIObligationProposal] = []
    for position, candidate in enumerate(raw.proposals, start=1):
        try:
            proposals.append(AIObligationProposal.model_validate(candidate))
        except ValidationError:
            warnings.append(f"La propuesta {position} no contiene los datos mínimos y fue descartada.")

    if get_settings().app_env == "development":
        logging.getLogger(__name__).warning('[AI] proposals valid=%s', len(proposals))
    return AIObligationAnalysisResponse(
        document_name=_document_name(document_name, normalized_content_type),
        proposals=proposals,
        warnings=warnings[:20],
    )


def _extract_text(content: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        return extract_pdf_text(content)
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "El TXT supera el tamaño máximo de 5 MB.")
    try:
        text = content.decode("utf-8-sig").strip()
    except UnicodeDecodeError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El TXT debe usar codificación UTF-8.") from error
    if not text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El TXT no contiene texto procesable.")
    return text[:MAX_EXTRACTED_CHARACTERS]


def _document_name(value: str | None, content_type: str) -> str:
    fallback = "documento.pdf" if content_type == "application/pdf" else "documento.txt"
    if not value:
        return fallback
    name = PurePath(value).name.strip()
    return name[:255] or fallback
