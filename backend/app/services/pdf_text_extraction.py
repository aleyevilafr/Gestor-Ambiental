from io import BytesIO

from fastapi import HTTPException, status
from pypdf import PdfReader

MAX_PDF_BYTES = 5 * 1024 * 1024
MAX_PDF_PAGES = 20
MAX_EXTRACTED_CHARACTERS = 20_000


def extract_pdf_text(content: bytes) -> str:
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "El PDF supera el tamaño máximo de 5 MB.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El archivo no tiene una firma PDF válida.")
    try:
        reader = PdfReader(BytesIO(content))
        if reader.is_encrypted:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No se admiten PDFs cifrados.")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El PDF supera el máximo de 20 páginas.")
        text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No fue posible leer el PDF.") from error
    if not text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "El PDF no contiene texto extraíble.")
    return text[:MAX_EXTRACTED_CHARACTERS]
