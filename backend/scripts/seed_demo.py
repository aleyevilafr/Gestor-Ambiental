"""Carga datos ficticios SOLO en una base local de desarrollo.

Ejecutar manualmente desde backend: ``python scripts/seed_demo.py``.
El script nunca se invoca al iniciar FastAPI y rechaza cualquier APP_ENV distinto
de ``development``.
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.control import Control, ControlStatus  # noqa: E402
from app.models.evidence import Evidence, EvidenceType  # noqa: E402
from app.models.obligation import ComplianceStatus, Obligation  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.role import Role, RoleCode  # noqa: E402
from app.models.user import User  # noqa: E402


DEMO_ORGANIZATION = "EcoGestión Industrial SpA"
DEMO_RUT = "12.345.678-5"  # RUT de ejemplo, técnicamente válido y ficticio.
DEMO_PASSWORD = "Demo2026!"
DEMO_USERS = (
    ("Andrea Morales", "admin.demo@example.com", RoleCode.ADMIN),
    ("Felipe Rojas", "responsable.demo@example.com", RoleCode.RESPONSIBLE),
    ("Camila Soto", "lector.demo@example.com", RoleCode.READER),
)


def main() -> None:
    settings = get_settings()
    if settings.app_env != "development":
        raise SystemExit("El seed demo solo puede ejecutarse con APP_ENV=development.")

    db = SessionLocal()
    try:
        if db.scalar(select(Organization).where(Organization.name == DEMO_ORGANIZATION)):
            print("La organización demo ya existe. No se insertaron datos duplicados.")
            return
        emails = [email for _, email, _ in DEMO_USERS]
        if db.scalar(select(User).where(User.email.in_(emails))):
            print("Ya existe uno de los correos demo. No se insertaron datos duplicados.")
            return

        roles = {role.code: role for role in db.scalars(select(Role)).all()}
        missing_roles = [code.value for code in RoleCode if code not in roles]
        if missing_roles:
            raise SystemExit(f"Faltan roles base ({', '.join(missing_roles)}). Ejecuta alembic upgrade head.")

        organization = Organization(name=DEMO_ORGANIZATION, rut=DEMO_RUT)
        db.add(organization)
        db.flush()

        users: dict[RoleCode, User] = {}
        for name, email, role_code in DEMO_USERS:
            user = User(
                organization_id=organization.id,
                role_id=roles[role_code].id,
                name=name,
                email=email,
                password_hash=hash_password(DEMO_PASSWORD),
                is_active=True,
            )
            db.add(user)
            users[role_code] = user
        db.flush()

        today = date.today()
        obligations = [
            ("Registro mensual de residuos industriales", "Ejemplo ficticio para fines de demostración.", "Residuos", "Referencia regulatoria ambiental genérica", "Art. 12", today - timedelta(days=6), "Mensual", ComplianceStatus.OVERDUE, RoleCode.RESPONSIBLE),
            ("Revisión de vigencia de permiso ambiental", "Ejemplo ficticio para fines de demostración.", "Permisos ambientales", "Referencia regulatoria ambiental genérica", None, today - timedelta(days=2), "Anual", ComplianceStatus.OVERDUE, RoleCode.ADMIN),
            ("Declaración de envases y embalajes", "Ejemplo ficticio para fines de demostración.", "REP", "Referencia regulatoria ambiental genérica", "Sección 4", today + timedelta(days=5), "Anual", ComplianceStatus.PENDING, RoleCode.RESPONSIBLE),
            ("Actualización de inventario de sustancias peligrosas", "Ejemplo ficticio para fines de demostración.", "Sustancias peligrosas", "Referencia regulatoria ambiental genérica", None, today + timedelta(days=25), "Semestral", ComplianceStatus.PENDING, RoleCode.ADMIN),
            ("Preparación de reporte de emisiones", "Ejemplo ficticio para fines de demostración.", "Emisiones", "Referencia regulatoria ambiental genérica", "Art. 8", today + timedelta(days=7), "Anual", ComplianceStatus.IN_PROGRESS, RoleCode.RESPONSIBLE),
            ("Monitoreo de consumo de agua", "Ejemplo ficticio para fines de demostración.", "Agua", "Referencia regulatoria ambiental genérica", None, today + timedelta(days=20), "Mensual", ComplianceStatus.IN_PROGRESS, RoleCode.ADMIN),
            ("Presentación de reporte ambiental anual", "Ejemplo ficticio para fines de demostración.", "Reportabilidad ambiental", "Referencia regulatoria ambiental genérica", None, today + timedelta(days=60), "Anual", ComplianceStatus.COMPLIANT, RoleCode.ADMIN),
            ("Verificación de programa de monitoreo", "Ejemplo ficticio para fines de demostración.", "Monitoreo", "Referencia regulatoria ambiental genérica", "Anexo B", today + timedelta(days=45), "Trimestral", ComplianceStatus.COMPLIANT, RoleCode.RESPONSIBLE),
        ]
        seeded_obligations: list[Obligation] = []
        for title, description, matter, source, article, deadline, frequency, status, responsible_role in obligations:
            obligation = Obligation(
                organization_id=organization.id,
                created_by_user_id=users[RoleCode.ADMIN].id,
                title=title,
                description=description,
                matter=matter,
                regulatory_source=source,
                article=article,
                deadline=deadline,
                frequency=frequency,
                compliance_status=status,
                responsible_user_id=users[responsible_role].id,
                is_active=True,
            )
            db.add(obligation)
            seeded_obligations.append(obligation)
        db.flush()

        controls: list[Control] = []
        control_specs = (
            (0, "Validar gestor autorizado", today - timedelta(days=8), ControlStatus.PENDING),
            (0, "Revisar registros mensuales", today - timedelta(days=6), ControlStatus.IN_PROGRESS),
            (1, "Revisar vencimiento de permiso", today - timedelta(days=3), ControlStatus.PENDING),
            (2, "Preparar declaración", today + timedelta(days=3), ControlStatus.IN_PROGRESS),
            (3, "Verificar respaldo documental", today + timedelta(days=15), ControlStatus.PENDING),
            (4, "Coordinar medición", today + timedelta(days=4), ControlStatus.IN_PROGRESS),
            (4, "Validar datos de emisiones", today + timedelta(days=6), ControlStatus.COMPLETED),
            (5, "Revisar medidores internos", today + timedelta(days=10), ControlStatus.COMPLETED),
            (6, "Revisar borrador del reporte", today + timedelta(days=45), ControlStatus.COMPLETED),
            (7, "Actualizar plan de monitoreo", today + timedelta(days=35), ControlStatus.PENDING),
        )
        for obligation_index, title, due_date, status in control_specs:
            control = Control(obligation_id=seeded_obligations[obligation_index].id, title=title, due_date=due_date, status=status)
            db.add(control)
            controls.append(control)
        db.flush()

        evidence_specs = (
            (0, None, "Registro de retiro", "Respaldo ficticio de retiro de residuos."),
            (2, controls[3], "Comprobante de declaración", "Enlace ficticio de declaración."),
            (4, controls[5], "Certificado de medición", "Respaldo ficticio de medición."),
            (5, None, "Informe mensual", "Informe de consumo ficticio."),
            (6, controls[8], "Acta de revisión", "Acta ficticia de revisión."),
        )
        for obligation_index, control, name, description in evidence_specs:
            db.add(Evidence(
                obligation_id=seeded_obligations[obligation_index].id,
                control_id=control.id if control else None,
                name=name,
                description=description,
                evidence_type=EvidenceType.EXTERNAL_LINK,
                external_url=f"https://example.com/evidencias/{obligation_index + 1}",
                uploaded_by_user_id=users[RoleCode.ADMIN].id,
            ))

        db.commit()
        print("Datos demo creados: 1 organización, 3 usuarios, 8 obligaciones, 10 controles y 5 evidencias.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
