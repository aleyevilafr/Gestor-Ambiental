"""Protecciones para las pruebas de integración PostgreSQL.

La suite jamás usa DATABASE_URL de desarrollo: al activar las integraciones se
requiere una URL explícita de test y se vuelve a comprobar la base conectada
antes de ejecutar cada caso de integración destructivo.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url


RUN_INTEGRATION = "RUN_POSTGRES_INTEGRATION_TESTS"
TEST_DATABASE_URL = "TEST_DATABASE_URL"


def _require_test_database_url() -> str:
    value = os.getenv(TEST_DATABASE_URL)
    if not value:
        raise pytest.UsageError(
            "Las pruebas de integración requieren TEST_DATABASE_URL; DATABASE_URL de DEV nunca se usará.",
        )

    database_name = make_url(value).database or ""
    if "_test" not in database_name.lower():
        raise pytest.UsageError(
            "TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga '_test'.",
        )
    return value


def pytest_configure() -> None:
    if os.getenv(RUN_INTEGRATION) != "1":
        return

    # Los módulos de la aplicación se importan después de conftest, por lo que
    # SessionLocal y FastAPI quedan ligados solo a la base de pruebas.
    os.environ["DATABASE_URL"] = _require_test_database_url()
    from app.core.config import get_settings

    get_settings.cache_clear()


def pytest_runtest_setup(item: pytest.Item) -> None:
    if os.getenv(RUN_INTEGRATION) != "1" or not item.path.name.endswith("_integration.py"):
        return

    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        database_name = db.execute(text("SELECT current_database()")).scalar_one()
    finally:
        db.close()

    if "_test" not in database_name.lower():
        raise RuntimeError(
            f"Refusing to run destructive integration setup against non-test database '{database_name}'.",
        )
