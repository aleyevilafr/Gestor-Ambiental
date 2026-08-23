# Integración documental con Gemini

`POST /api/v1/document-analysis/extract-organization` usa Gemini Developer API vía REST. Solo envía el texto pegado por un ADMIN y devuelve una propuesta de nombre, RUT y actividad. Variables: `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_SECONDS`. No se almacenan documentos, texto ni propuestas; la respuesta se valida con Pydantic y RUT chileno. No analiza normativa, obligaciones, cumplimiento ni riesgos. La revisión humana es obligatoria y aplicar datos permanece deshabilitado.
