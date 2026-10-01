# KAN-53 — Validación end-to-end

## Entorno

- Fecha: 30 de septiembre de 2026, America/Santiago.
- Repositorio: Plataforma-Gestion-Cumplimiento-Ambiental; árbol de trabajo con cambios preexistentes de KAN-48/50/52, conservados.
- PostgreSQL 16.4 local, sin Docker Desktop.
- DEV: `127.0.0.1:5432/compliance_db`, clúster existente `work/pg-data`.
- TEST: `127.0.0.1:55441/kan48_test`, clúster independiente `kan41-pg-test` del workspace de validación.
- DEV en Alembic `20260823_0005`; `alembic upgrade head` ejecutado contra TEST antes de pytest.
- Frontend real: Next.js 16.3.1, `http://localhost:3000`, `pnpm run dev --port 3000`.
- Backend real: FastAPI/Uvicorn, `127.0.0.1:8000`; navegador usa `http://localhost:8000` para la API.
- DATABASE_URL del proceso backend usa IPv4 local; no se editaron archivos .env.
- Navegador integrado real; sesión ADMIN, READER y RESPONSIBLE. Sin API simulada para el recorrido.
- Solo se agregó este informe al repositorio durante KAN-53. No se modificó código funcional, contratos ni migraciones.

## Flujo validado

| Caso | Resultado | Observación |
| --- | --- | --- |
| 1. Login ADMIN y sesión | OK | POST /auth/login y GET /auth/me 200; dashboard accesible; sesión conservada tras recargar. |
| 2. Dashboard | OK | 12 activas, 4 cumplidas, 2 en proceso, 4 pendientes, 2 vencidas, 4 sin responsable, 0 próximas y 33.33%. Conteos por estado contrastados con SQL DEV. |
| 3. Checklist inicial | OK | Declaración anual REP: Ana Pérez, 10-08-2026, OVERDUE, 1/1 controles completados, 1/1 controles respaldados, 2 evidencias generales. |
| 4. Ver detalle desde Checklist | OK | Modal compartido, overlay y ventana centrada, sin navegación al detalle independiente. |
| 5. Control existente | OK | KAN-52 DEV — Verificar respaldo documental; COMPLETED; pertenece a la obligación; responsable del control no asignado. |
| 6. Evidencia ADMIN | OK | Creación desde UI, EXTERNAL_LINK asociado al control; POST 201 y posterior GET 200. |
| 7. Persistencia | OK | Cierre, recarga y reapertura desde Tabla muestran la evidencia; fila confirmada directamente en PostgreSQL. |
| 8. Checklist actualizado | OK | Permanece 1/1 respaldado aunque el mismo control termina con 3 evidencias. Las 2 generales siguen separadas. |
| 9. Tabla / Planner / Checklist | OK | Filtro por título conservado al cambiar las tres vistas; misma obligación y modal compartido. Sin errores de consola capturados. |
| 10. Dirty state independiente | OK | Se escribió un título local, se registró evidencia y se pulsó Cancelar: título original restaurado y evidencia conservada. Registro independiente posterior no provoca confirmación al cerrar. |
| 11. KAN-42 | OK | X y Escape con borrador abren alertdialog; Seguir editando conserva texto; Descartar y cerrar descarta y restaura foco al disparador. Shift+Tab desde X vuelve al último control dentro del diálogo. |
| 12. Saving y cierre | OK | POST real retenido brevemente por bloqueo de fila PostgreSQL: X y overlay deshabilitados, aviso de guardado, Escape no cierra. Al liberar el bloqueo se completa el registro. |
| 13. Roles | OK | ADMIN y RESPONSIBLE asignado registran; RESPONSIBLE no asignado POST 403; READER GET 200, sin botón de registro y POST 403. |
| 14. Aislamiento | OK en TEST | Suite comprueba GET/POST de evidencias ajenas 404; control de otra obligación/organización no puede asociarse. DEV no se usa para fixtures destructivos. |
| 15. Reportes | OK | Vista normal /reports carga la obligación y resumen; GET /api/v1/reports/compliance 200; conteos finales 1 control y 5 evidencias. |
| 16. Recarga completa | OK | Sesión, evidencia y Checklist reconstruidos desde API real, tanto ADMIN como RESPONSIBLE. |
| 17. Tests frontend | OK | 61 aprobados, 0 fallidos. |
| 18. Tests backend | OK | Suite completa: 78 aprobados, 0 fallidos, integraciones activadas con TEST_DATABASE_URL explícita. |
| 19. Typecheck / build | OK | Ambos exit code 0; 12 páginas generadas durante build. |
| 20. Consola / red | OK con observación | Sin errores de consola capturados ni 5xx observados. Los 403 de pruebas negativas son esperados. Se observaron GET repetidos en desarrollo; no POST duplicados ni registros duplicados. |

## Datos de prueba

### Organización, obligación y control existentes

- Organización: Dashboard Demo SpA.
- organization_id: `b6434089-7093-471b-8cb2-aa35777071be`.
- Obligación: Declaración anual REP.
- obligation_id: `6b54c574-ac32-4944-99f0-b81c74bafea5`.
- Responsable: Ana Pérez, `b1999684-50de-41b3-88ab-98e0635d04f7`.
- Estado: OVERDUE; deadline: 2026-08-10.
- Control: KAN-52 DEV — Verificar respaldo documental.
- control_id: `05d9c17d-0662-4150-8c64-a6b94f258015`.
- Control COMPLETED, responsible_user_id null; sin fecha límite.

### Evidencias creadas en KAN-53

Ambas son EXTERNAL_LINK y apuntan a la obligación y control anteriores.

| Nombre | ID persistido | uploaded_by_user_id | URL |
| --- | --- | --- | --- |
| Evidencia E2E KAN-53 | `f3152576-8124-40c7-9d71-b904055eccc3` | `97b5a995-b91a-4ed4-83e9-85e0c59094ed` (ADMIN) | https://example.com/evidencia-kan53 |
| Evidencia E2E KAN-53 - RESPONSIBLE | `fd4ea7c4-bf23-4c0e-bde2-a7405b4cad47` | `b1999684-50de-41b3-88ab-98e0635d04f7` (Ana Pérez) | https://example.com/evidencia-kan53-responsible |

Se conservan para demostración. No se borraron las tres evidencias previas. Las URLs son referencias de prueba, no documentos ambientales verificados ni archivos subidos.

## Roles y permisos

- ADMIN: recorrido UI completo y creación real de la primera evidencia.
- RESPONSIBLE (Ana Pérez): dashboard/listado restringidos a sus 3 obligaciones; responsable no reasignable en el modal; registro UI real de la segunda evidencia en su obligación.
- RESPONSIBLE no asignado: petición autenticada a la obligación `7fcb716b-af15-426e-81e7-c745644cb046` devuelve 403, `No tienes permisos para esta obligación.` No se crea evidencia.
- READER: login y GET evidencias 200; modal de solo lectura sin Registrar evidencia; POST devuelve 403, `No tienes permisos para registrar evidencias.`
- Aislamiento: `test_evidence_organization_isolation_for_read_and_create` pasa contra TEST (GET y POST 404). `test_evidence_rejects_control_of_another_obligation` cubre también control perteneciente a otra organización y rechaza asociación inconsistente con 422. No se confundieron ambos contratos.

## Persistencia

El registro ADMIN se realizó mientras existía un título de obligación sin guardar. Cancelar restauró `Declaración anual REP`; la evidencia siguió visible y sobrevivió a recarga, cambio de sesión y consultas SQL.

La evidencia RESPONSIBLE se registró sin borrador de obligación. Cerrar después no mostró alertdialog, confirmando independencia del dirty state.

Para observar saving sin mocks se ejecutó una transacción de diagnóstico con `SELECT ... FOR UPDATE` sobre la obligación demo durante 35 segundos. La transacción no escribió datos y terminó con rollback, liberando el bloqueo. El INSERT real de evidencia esperó; la UI deshabilitó X/overlay y conservó el diálogo ante Escape. La petición terminó y la evidencia quedó persistida. No se cambiaron timeouts ni código.

Tras pytest, DEV conserva la organización, 12 obligaciones, usuarios demo, control y ambas evidencias KAN-53. La obligación conserva título, estado, responsable, fecha límite y updated_at `2026-09-03 15:30:42.480412-04:00`: no hubo guardado accidental de los borradores.

## Checklist

| Indicador de Declaración anual REP | Antes | Después |
| --- | ---: | ---: |
| Controles totales | 1 | 1 |
| Controles completados | 1 | 1 |
| Controles con evidencia | 1 | 1 |
| Evidencias generales | 2 | 2 |
| Evidencias asociadas al control | 1 | 3 |
| Total de evidencias | 3 | 5 |

La UI cuenta controles distintos, no evidencias. Datos de responsable, estado y deadline permanecen iguales. El filtro por título se conservó entre Tabla, Planner y Checklist; no se exige conservar filtros tras recarga completa.

## Tests

### Frontend

Comando: `node --test tests/*.test.cjs` desde frontend.

Resultado: **61 passed, 0 failed, 0 skipped**. Incluye Checklist, Evidencias, guardados parciales, borradores, focus trap y bloqueo de cierre durante saving. Son pruebas unitarias/de componentes, complementarias al recorrido real; no se presentan como API real.

### Backend / PostgreSQL TEST

Variables de proceso: `RUN_POSTGRES_INTEGRATION_TESTS=1`, TEST_DATABASE_URL explícita hacia `127.0.0.1:55441/kan48_test`; DATABASE_URL del proceso pytest apunta a esa misma base. Sin secretos en este documento.

Comandos desde backend:

```powershell
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
```

Resultado: **78 passed en 13.29 segundos, 0 failed**. Incluye suite de Controls/Evidences (18 casos), relaciones ORM, FILE y EXTERNAL_LINK históricos, reportes, roles, aislamiento, obligaciones y pruebas restantes del repositorio.

Se revisó conftest antes de ejecutar: requiere TEST_DATABASE_URL, exige `_test` en su nombre y consulta `current_database()` antes del setup destructivo de integración. No hay fallback silencioso a DEV. No se ejecutó seed ni TRUNCATE contra DEV.

## Typecheck / Build

```powershell
pnpm run typecheck
pnpm run build
```

- Typecheck: OK, exit 0.
- Build: OK, exit 0; compilación, TypeScript, generación de 12 páginas y rutas completadas.
- Se detuvo Next dev antes del build. No se añadieron dependencias.

## Incidencias y límites

- El aviso histórico `No fue posible cargar los controles` **no se reprodujo** en este recorrido: aperturas desde Checklist, Tabla y Planner; sesiones ADMIN, READER y RESPONSIBLE. Esto no demuestra que el fallo intermitente haya sido corregido.
- No se detectó bug bloqueante y no se corrigió código.
- Se observaron pares de GET en desarrollo al montar vistas y consultas al reabrir/cerrar modal. Sin mutaciones duplicadas ni 5xx observados; no se investigó/optimizó su origen en esta tarea. No se afirma un análisis exhaustivo de tráfico o rendimiento.
- Dashboard mensual sigue identificado como datos temporales. Se validaron KPIs operativos contra datos reales, no el gráfico mensual como histórico real.
- KAN-42 saving se observó manualmente durante registro independiente de evidencia; las rutas de cierre durante guardado general de obligación también están cubiertas por pruebas automatizadas. No se forzó otro PATCH de obligación para esa comprobación.
- Print preview nativo KAN-46 no ejecutado; queda fuera del alcance solicitado. Reporte validado en vista normal y API.
- Una selección de región con nombre en mayúsculas y un intento de enfocar overlay por teclado agotaron el plazo de automatización; no fueron fallos de la app. Se usó el nombre accesible real y clic físico sobre overlay, que cerró y restauró foco.
- Captura del modal READER con la evidencia ADMIN persistida: `C:/Users/aleye/Documents/Codex/2026-08-18/qui/kan53-evidencia-persistida.png`. Captura complementaria: `kan53-modal-final.png` en el mismo directorio local.

## Conclusión

**Apto para cerrar KAN-53** con el alcance de esta validación: flujo real obligación → control → evidencia → persistencia → Checklist → reporte/dashboard completado, permisos y aislamiento comprobados, suites aprobadas y typecheck/build OK. No se cambió Jira.

La estimación de cobertura del recorrido funcional definido en esta tarea es **100% de sus 16 grupos funcionales de la tabla** (casos 1–16), usando evidencia manual, API/SQL y pruebas de integración según se indica. No equivale al 100% del MVP ni a cobertura de código. No hay un denominador de backlog/criterios ponderados del MVP completo que permita atribuirle un porcentaje global verificable; no se inventa esa cifra.
