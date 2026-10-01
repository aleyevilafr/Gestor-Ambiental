# KAN-48 — Auditoría compatible de Evidencias

Fecha: 2026-09-29. Alcance: modelo existente, relaciones, seguridad y pruebas.
No se cambian contratos REST, frontend, migraciones históricas ni almacenamiento.

## Decisión de dominio

Una evidencia respalda una obligación y opcionalmente uno de sus controles.
`obligation_id` sigue siendo obligatorio y `control_id` opcional. Si se informa
un control, debe pertenecer a esa misma obligación.

Se conservan `name`, `uploaded_by_user_id` y los tipos `FILE` / `EXTERNAL_LINK`.
No se incorpora `evidence_category`: no existe todavía un consumidor UI/checklist
que necesite esa clasificación. No se infiere cumplimiento desde las evidencias.

## Mapa de implementación existente

| Capa | Archivo | Comportamiento |
| --- | --- | --- |
| Modelo | `backend/app/models/evidence.py` | Tabla `evidences`, UUID generado en Python, nombre, descripción, tipo, URLs, creador y fecha de creación con zona horaria |
| Relaciones | `models/evidence.py`, `control.py`, `obligation.py`, `user.py` | `Evidence.obligation`, `Evidence.control`, `Evidence.uploaded_by_user`; inversas `Obligation.evidences`, `Control.evidences`, `User.uploaded_evidences` |
| Schemas | `backend/app/schemas/evidence.py` | `CreateEvidenceRequest`, `EvidenceResponse`, `UploadedByUserResponse`; URLs HTTP(S), longitud máxima y exclusión mutua según tipo |
| API | `backend/app/api/v1/routes/evidences.py` | GET y POST `/api/v1/obligations/{obligation_id}/evidences`, router registrado en `app/main.py` |
| Servicio | `backend/app/services/evidences.py` | Autorización sobre la obligación, prohibición de creación para READER, validación control/obligación, commit y serialización |
| Repositorio | `backend/app/repositories/evidences.py` | Lista todas las evidencias de una obligación por fecha descendente, cargando al creador |
| Migración | `backend/alembic/versions/20260822_0002_controls_evidences.py` | Tabla, enum PostgreSQL y FKs; índices por obligación y control; downgrade elimina tabla, índices y enum |
| Reportes | `backend/app/repositories/reports.py` | Cuenta por `Evidence.obligation_id`, incluyendo generales y específicas sin doble conteo |
| Cliente API | `frontend/lib/api.ts` | Tipo `Evidence` y funciones `getEvidences` / `createEvidence` con credenciales |
| Detalle independiente | `frontend/app/obligations/[id]/page.tsx` | Consulta y muestra nombre, enlace externo y creador; no ofrece formulario de creación de evidencia |
| Modal compartido | `frontend/features/obligations/detail/obligation-detail-content.tsx` | Sección de evidencias todavía placeholder, botón deshabilitado |

`FILE` representa una referencia HTTP(S) en `file_url`, no carga binaria ni
almacenamiento físico. `EXTERNAL_LINK` exige `external_url`. El contrato actual
no admite una evidencia sin ubicación. No se modifica ese comportamiento.

No hay `updated_at`, fecha de evidencia, nombre de archivo ni clasificación
semántica en el modelo histórico. No son necesarios para los vínculos de KAN-48.

## Integridad y autorización

- PostgreSQL: PK UUID; NOT NULL en `obligation_id`, `name`, `evidence_type`,
  `uploaded_by_user_id`, `created_at`; `control_id` nullable; tres FKs simples.
- No hay `ON DELETE CASCADE` ni `delete-orphan`. Se conserva la política existente
  de FKs con NO ACTION. La relación opcional con Control no implica borrar sus
  evidencias; no se añade ningún endpoint de eliminación.
- El servicio valida la obligación mediante `services.obligations.get`: otra
  organización recibe 404; RESPONSIBLE no asignado recibe 403; ADMIN y READER
  pueden consultar dentro de su organización. READER no puede crear.
- `repositories.controls.get_for_obligation` filtra simultáneamente por ID del
  control y de la obligación. Un control ajeno o inexistente produce 422 antes
  de añadir/confirmar la evidencia. No revela datos del control ajeno.
- `obligation_id` se deriva de la ruta autorizada; `uploaded_by_user_id`, de la
  sesión. El schema no permite asignarlos: campos extra se ignoran conforme al
  comportamiento Pydantic existente. Tests verifican que no se puede suplantarlos.
- `Control.evidences` permite recuperar las específicas mediante ORM. No es un
  punto de autorización: futuros servicios deben autorizar antes de usarlo.
- Límite explícito: las FKs simples no impiden un vínculo cruzado introducido por
  SQL/ORM directo fuera del servicio. No se garantiza aislamiento mediante RLS.
  Todas las escrituras API actuales pasan por la validación del servicio. Cualquier
  futuro PATCH, importador o cambio de pertenencia de un control debe preservarla.

## Cambios KAN-48

Solo documentación y ocho casos de integración adicionales en
`backend/tests/test_controls_evidences_integration.py`:

1. Evidencias general/específica: relaciones ORM bidireccionales, creador, filtro
   de generales desde listado y conteo conjunto en Reportes.
2. Control de otra obligación de la misma organización: 422 sin persistencia.
3. Control de otra organización: 422 sin persistencia.
4. Lectura/creación contra obligación de otra organización: 404.
5. RESPONSIBLE asignado/no asignado y READER.
6. FILE válido, recuperación y campos de servidor no suplantables.
7. EXTERNAL_LINK válido, recuperación y campos de servidor no suplantables.
8. Acceso sin autenticación: 401.

No fue necesaria una nueva migración. Head permanece `20260823_0005`.

## Validación ejecutada

PostgreSQL local aislado en `127.0.0.1:55441`, base nueva `kan48_test`. No se usa
DEV ni su DATABASE_URL como fallback. Se mantienen las protecciones del conftest
que exigen TEST_DATABASE_URL y verifican el nombre real antes de los TRUNCATE.

- `alembic upgrade head`: OK desde base vacía.
- Inspección `\d evidences`: columnas, FKs e índices confirmados; enum FILE y EXTERNAL_LINK.
- `alembic downgrade base` y nuevamente `alembic upgrade head`: OK, solo en la
  base desechable de esta tarea; este ciclo elimina los datos de prueba.
- Suite focalizada Controls/Evidences + Reportes: **23 aprobadas**.
- Suite completa, integraciones habilitadas: **78 aprobadas, 0 fallidas**.

Comandos desde backend, definiendo TEST_DATABASE_URL a una base aislada `_test`:

```powershell
$env:RUN_POSTGRES_INTEGRATION_TESTS = '1'
.\.venv\Scripts\python.exe -m pytest tests/test_controls_evidences_integration.py tests/test_reports_integration.py -q -p no:cacheprovider
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
```

Se utilizó `python -m pytest` porque el ejecutable directo no resolvía `app` en
este entorno. Se deshabilitó únicamente la caché pytest para evitar warnings de
escritura del sandbox; no se deshabilitaron tests ni protecciones de la base.

## KAN-49: API disponible y decisiones pendientes

Ya existen **Create y Read-list**, no un CRUD completo:

- POST crea evidencia general o específica con validación, permisos y creador.
- GET lista las dos clases y devuelve sus datos completos y `control_id`.
- No existe GET individual, PATCH ni DELETE/archivo de evidencia.
- No existe listado REST dedicado por control; hoy se puede filtrar la respuesta
  del GET por `control_id`. No hace falta inventar otro endpoint para esa UI inicial.

Antes de completar CRUD: acordar política de eliminación/archivo, quién puede
editar/eliminar, si se permite cambiar de control y si se necesita `updated_at`.
Reaplicar autorización y consistencia en cada escritura. También revisar el
nombre solo con espacios: actualmente se valida longitud antes del `.strip()`
del servicio. No se ha cambiado esa validación histórica en esta auditoría.

## KAN-50: qué falta para UI utilizable

Para una primera UI de **consulta + registro de enlaces**, el backend ya alcanza.
Falta reemplazar el placeholder con carga/error/vacío, listado real, formulario
de nombre/descripción/tipo/URL y selección opcional de un control perteneciente
a la obligación; mostrar agrupación general/específica, creador y fecha; refrescar
lista/contador al guardar y reflejar permisos. Mantener guardado independiente y
protección de borradores del modal. En la página independiente, el listado actual
es parcial y no representa `file_url` ni todos los metadatos.

Para una UI de **CRUD completo**, primero completar las operaciones acordadas en
KAN-49. Para archivos reales, hace falta diseñar su almacenamiento/upload en otra
tarea: no simular carga ni presentar una URL registrada como archivo subido.
