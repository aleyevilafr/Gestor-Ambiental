# Resumen de cumplimiento por organización

La migración inicial crea la función PostgreSQL `get_organization_compliance_summary(UUID)`.

Recibe el identificador de una organización y devuelve un único resumen con el total de obligaciones activas y los conteos por estado de cumplimiento. Solo considera obligaciones donde `is_active = true`.

No calcula estados a partir de fechas, controles ni evidencias: durante este incremento `compliance_status` es manual. La función deja una base reutilizable para un dashboard o reporte posterior, sin implementar ninguno de ellos.

Cuando existan datos de prueba, se podrá verificar con:

```sql
SELECT * FROM get_organization_compliance_summary('ORGANIZATION_UUID');
```
