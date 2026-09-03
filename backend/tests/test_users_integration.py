from collections.abc import Generator
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import SessionLocal
from app.main import app
from app.models.user import User


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_POSTGRES_INTEGRATION_TESTS") != "1",
    reason="Define RUN_POSTGRES_INTEGRATION_TESTS=1 y TEST_DATABASE_URL para ejecutar pruebas PostgreSQL.",
)


@pytest.fixture(autouse=True)
def clean_users_data() -> Generator[None, None, None]:
    db = SessionLocal()
    db.execute(text("TRUNCATE TABLE obligations, users, organizations CASCADE"))
    db.commit()
    db.close()
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def register_admin(client: TestClient, email: str = "admin@empresa.cl", rut: str = "12.345.678-5") -> dict:
    response = client.post(
        "/auth/register",
        json={
            "organization_name": "Empresa de Prueba SpA",
            "rut": rut,
            "name": "Administrador",
            "email": email,
            "password": "ClaveSegura2026!",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_user(client: TestClient, email: str, role: str = "RESPONSIBLE") -> dict:
    response = client.post(
        "/api/v1/users",
        json={"name": "Usuario de Prueba", "email": email, "password": "ClaveSegura2026!", "role": role},
    )
    assert response.status_code == 201, response.text
    return response.json()


def login_client(email: str) -> TestClient:
    test_client = TestClient(app)
    response = test_client.post("/auth/login", json={"email": email, "password": "ClaveSegura2026!"})
    assert response.status_code == 200, response.text
    return test_client


def test_admin_lists_organization_users(client: TestClient) -> None:
    register_admin(client)
    create_user(client, "responsable@empresa.cl")

    response = client.get("/api/v1/users")

    assert response.status_code == 200
    assert {user["email"] for user in response.json()} == {"admin@empresa.cl", "responsable@empresa.cl"}
    assert "password_hash" not in response.text


@pytest.mark.parametrize("role", ["RESPONSIBLE", "READER"])
def test_non_admin_roles_cannot_manage_users(client: TestClient, role: str) -> None:
    register_admin(client)
    create_user(client, f"{role.lower()}@empresa.cl", role)
    role_client = login_client(f"{role.lower()}@empresa.cl")

    response = role_client.get("/api/v1/users")

    assert response.status_code == 403
    role_client.close()


def test_admin_creates_user_with_argon2_hash(client: TestClient) -> None:
    register_admin(client)

    response = client.post(
        "/api/v1/users",
        json={"name": "Nuevo Usuario", "email": "nuevo@empresa.cl", "password": "ClaveSegura2026!", "role": "READER"},
    )

    assert response.status_code == 201
    assert response.json()["role"] == "READER"
    db = SessionLocal()
    persisted_user = db.query(User).filter_by(email="nuevo@empresa.cl").one()
    assert persisted_user.password_hash != "ClaveSegura2026!"
    assert persisted_user.password_hash.startswith("$argon2")
    db.close()


def test_duplicate_email_is_rejected_within_organization(client: TestClient) -> None:
    register_admin(client)
    create_user(client, "duplicado@empresa.cl")

    response = client.post(
        "/api/v1/users",
        json={"name": "Duplicado", "email": "duplicado@empresa.cl", "password": "ClaveSegura2026!", "role": "READER"},
    )

    assert response.status_code == 409


def test_email_is_global_unique_and_normalized_for_login(client: TestClient) -> None:
    register_admin(client, "Admin@Empresa.cl")
    other = TestClient(app)
    duplicate = other.post("/auth/register", json={"organization_name": "Otra SpA", "rut": "76.086.428-5", "name": "Otra Admin", "email": "ADMIN@empresa.cl", "password": "ClaveSegura2026!"})
    login = client.post("/auth/login", json={"email": "ADMIN@EMPRESA.CL", "password": "ClaveSegura2026!"})
    assert duplicate.status_code == 409
    assert login.status_code == 200
    other.close()


def test_organization_isolation_blocks_cross_organization_updates(client: TestClient) -> None:
    register_admin(client, "admin-a@empresa.cl", "12.345.678-5")
    user_from_first_organization = create_user(client, "usuario-a@empresa.cl")
    second_client = TestClient(app)
    register_admin(second_client, "admin-b@empresa.cl", "76.086.428-5")

    response = second_client.patch(f"/api/v1/users/{user_from_first_organization['id']}", json={"name": "No permitido"})

    assert response.status_code == 404
    second_client.close()


def test_admin_can_activate_and_deactivate_user(client: TestClient) -> None:
    register_admin(client)
    user = create_user(client, "estado@empresa.cl")

    deactivate = client.patch(f"/api/v1/users/{user['id']}/status", json={"is_active": False})
    activate = client.patch(f"/api/v1/users/{user['id']}/status", json={"is_active": True})

    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False
    assert activate.status_code == 200
    assert activate.json()["is_active"] is True


def test_missing_session_is_rejected_and_inactive_user_cannot_log_in(client: TestClient) -> None:
    register_admin(client)
    user = create_user(client, "inactivo-login@empresa.cl")

    assert TestClient(app).get("/auth/me").status_code == 401
    assert client.patch(f"/api/v1/users/{user['id']}/status", json={"is_active": False}).status_code == 200

    login = TestClient(app).post("/auth/login", json={"email": user["email"], "password": "ClaveSegura2026!"})
    assert login.status_code == 401
