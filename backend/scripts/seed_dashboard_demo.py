"""Carga el dataset visual del Dashboard V1 únicamente en desarrollo.

Ejecutar desde ``backend``: ``python scripts/seed_dashboard_demo.py``.
La organización demo es aislada e idempotente: el script solo reemplaza sus
propias obligaciones para mantener los diez registros de demostración exactos.
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

from sqlalchemy import delete, select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.obligation import ComplianceStatus, Obligation  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.role import Role, RoleCode  # noqa: E402
from app.models.user import User  # noqa: E402

ORGANIZATION_NAME = "Dashboard Demo SpA"
ORGANIZATION_RUT = "76.086.428-5"
PASSWORD = "Demo2026!"
USERS = (
    ("Administrador Demo", "admin.dashboard.demo@example.com", RoleCode.ADMIN),
    ("Ana Pérez", "ana.perez.dashboard.demo@example.com", RoleCode.RESPONSIBLE),
    ("Carlos Soto", "carlos.soto.dashboard.demo@example.com", RoleCode.RESPONSIBLE),
    ("María Díaz", "maria.diaz.dashboard.demo@example.com", RoleCode.RESPONSIBLE),
)
OBLIGATIONS = (
    ("Declaración anual REP", ComplianceStatus.OVERDUE, "Ana Pérez", date(2026, 8, 10), "REP"),
    ("Reporte de residuos peligrosos", ComplianceStatus.OVERDUE, "Carlos Soto", date(2026, 8, 18), "Residuos"),
    ("Registro de productor prioritario", ComplianceStatus.PENDING, None, date(2026, 8, 28), "REP"),
    ("Informe de valorización", ComplianceStatus.IN_PROGRESS, "María Díaz", date(2026, 9, 2), "REP"),
    ("Actualización de procedimiento interno", ComplianceStatus.PENDING, "Ana Pérez", date(2026, 9, 12), "Compliance"),
    ("Control documental proveedor", ComplianceStatus.IN_PROGRESS, "Carlos Soto", date(2026, 9, 20), "Gestión documental"),
    ("Evidencia de gestión de neumáticos", ComplianceStatus.COMPLIANT, "María Díaz", date(2026, 8, 1), "REP"),
    ("Registro de envases y embalajes", ComplianceStatus.COMPLIANT, "Ana Pérez", date(2026, 8, 5), "REP"),
    ("Revisión matriz REP", ComplianceStatus.COMPLIANT, "Carlos Soto", date(2026, 8, 15), "REP"),
    ("Declaración de cumplimiento interna", ComplianceStatus.COMPLIANT, None, date(2026, 8, 22), "Compliance"),
)


def main() -> None:
    if get_settings().app_env != "development":
        raise SystemExit("El seed de Dashboard solo puede ejecutarse con APP_ENV=development.")
    db = SessionLocal()
    try:
        roles = {role.code: role for role in db.scalars(select(Role)).all()}
        if set(RoleCode) - set(roles):
            raise SystemExit("Faltan roles base. Ejecuta alembic upgrade head.")
        organization = db.scalar(select(Organization).where(Organization.rut == ORGANIZATION_RUT))
        if organization is None:
            organization = Organization(name=ORGANIZATION_NAME, rut=ORGANIZATION_RUT)
            db.add(organization)
            db.flush()
        users: dict[str, User] = {}
        for name, email, role_code in USERS:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(organization_id=organization.id, role_id=roles[role_code].id, name=name, email=email, password_hash=hash_password(PASSWORD), is_active=True)
                db.add(user)
                db.flush()
            elif user.organization_id != organization.id:
                raise SystemExit(f"El correo demo {email} pertenece a otra organización.")
            users[name] = user
        db.execute(delete(Obligation).where(Obligation.organization_id == organization.id))
        db.flush()
        admin = users["Administrador Demo"]
        for title, status, responsible_name, deadline, matter in OBLIGATIONS:
            db.add(Obligation(organization_id=organization.id, created_by_user_id=admin.id, title=title, description="Registro ficticio para evaluación visual del Dashboard V1.", matter=matter, regulatory_source="Referencia de demostración", deadline=deadline, frequency="Anual", compliance_status=status, responsible_user_id=users[responsible_name].id if responsible_name else None, is_active=True))
        db.commit()
        print(f"Dataset Dashboard creado: {len(OBLIGATIONS)} obligaciones en {ORGANIZATION_NAME}.")
        print("Credenciales: admin.dashboard.demo@example.com / Demo2026!")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
