from collections.abc import Generator
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import SessionLocal
from app.main import app


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_POSTGRES_INTEGRATION_TESTS") != "1",
    reason="Define RUN_POSTGRES_INTEGRATION_TESTS=1 y TEST_DATABASE_URL para ejecutar pruebas PostgreSQL.",
)


@pytest.fixture(autouse=True)
def clean_data() -> Generator[None, None, None]:
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
    response = client.post("/auth/register", json={"organization_name": "Empresa de Prueba SpA", "rut": rut, "name": "Administrador", "email": email, "password": "ClaveSegura2026!"})
    assert response.status_code == 201, response.text
    return response.json()


def create_user(client: TestClient, email: str, role: str = "RESPONSIBLE") -> dict:
    response = client.post("/api/v1/users", json={"name": role.title(), "email": email, "password": "ClaveSegura2026!", "role": role})
    assert response.status_code == 201, response.text
    return response.json()


def logged_in(email: str) -> TestClient:
    test_client = TestClient(app)
    response = test_client.post("/auth/login", json={"email": email, "password": "ClaveSegura2026!"})
    assert response.status_code == 200, response.text
    return test_client


def payload(**changes: object) -> dict:
    base = {"title": "Declaración anual", "description": "Presentación ante autoridad.", "matter": "Emisiones", "regulatory_source": "D.S. 138", "article": "Art. 4", "deadline": "2026-12-31", "frequency": "Anual", "compliance_status": "PENDING"}
    return {**base, **changes}


def create_obligation(client: TestClient, **changes: object) -> dict:
    response = client.post("/api/v1/obligations", json=payload(**changes))
    assert response.status_code == 201, response.text
    return response.json()


def test_admin_creates_and_lists_organization_obligations_without_sensitive_fields(client: TestClient) -> None:
    register_admin(client)
    first = create_obligation(client)
    second = create_obligation(client, title="Reporte mensual", matter="Residuos")

    response = client.get("/api/v1/obligations")

    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {first["id"], second["id"]}
    assert "password_hash" not in response.text


@pytest.mark.parametrize("role", ["RESPONSIBLE", "READER"])
def test_non_admin_cannot_create_obligation(client: TestClient, role: str) -> None:
    register_admin(client)
    create_user(client, f"{role.lower()}@empresa.cl", role)
    role_client = logged_in(f"{role.lower()}@empresa.cl")

    assert role_client.post("/api/v1/obligations", json=payload()).status_code == 403
    role_client.close()


def test_responsible_only_lists_and_edits_assigned_obligations(client: TestClient) -> None:
    register_admin(client)
    responsible = create_user(client, "responsable@empresa.cl")
    assigned = create_obligation(client, responsible_user_id=responsible["id"])
    not_assigned = create_obligation(client, title="Otra obligación")
    responsible_client = logged_in("responsable@empresa.cl")

    listed = responsible_client.get("/api/v1/obligations")
    allowed = responsible_client.patch(f"/api/v1/obligations/{assigned['id']}", json={"title": "Título actualizado"})
    status_changed = responsible_client.patch(f"/api/v1/obligations/{assigned['id']}/status", json={"compliance_status": "IN_PROGRESS"})
    denied = responsible_client.patch(f"/api/v1/obligations/{not_assigned['id']}", json={"title": "No permitido"})

    assert [item["id"] for item in listed.json()] == [assigned["id"]]
    assert allowed.status_code == 200
    assert status_changed.status_code == 200 and status_changed.json()["compliance_status"] == "IN_PROGRESS"
    assert denied.status_code == 403
    responsible_client.close()


def test_reader_lists_organization_but_cannot_modify(client: TestClient) -> None:
    register_admin(client)
    obligation = create_obligation(client)
    create_user(client, "lector@empresa.cl", "READER")
    reader = logged_in("lector@empresa.cl")

    listed = reader.get("/api/v1/obligations")
    assert listed.status_code == 200 and [item["id"] for item in listed.json()] == [obligation["id"]]
    assert reader.patch(f"/api/v1/obligations/{obligation['id']}", json={"title": "No"}).status_code == 403
    assert reader.patch(f"/api/v1/obligations/{obligation['id']}/status", json={"compliance_status": "COMPLIANT"}).status_code == 403
    reader.close()


def test_organization_isolation_and_responsible_validation(client: TestClient) -> None:
    register_admin(client, "admin-a@empresa.cl", "12.345.678-5")
    obligation = create_obligation(client)
    inactive = create_user(client, "inactivo@empresa.cl")
    assert client.patch(f"/api/v1/users/{inactive['id']}/status", json={"is_active": False}).status_code == 200
    assert client.post("/api/v1/obligations", json=payload(responsible_user_id=inactive["id"])).status_code == 422

    other = TestClient(app)
    register_admin(other, "admin-b@empresa.cl", "76.086.428-5")
    other_admin = other.get("/auth/me").json()
    assert client.post("/api/v1/obligations", json=payload(responsible_user_id=other_admin["id"])).status_code == 422
    assert other.get(f"/api/v1/obligations/{obligation['id']}").status_code == 404
    other.close()


def test_status_change_archive_and_default_active_filter(client: TestClient) -> None:
    register_admin(client)
    obligation = create_obligation(client)

    changed = client.patch(f"/api/v1/obligations/{obligation['id']}/status", json={"compliance_status": "COMPLIANT"})
    archived = client.patch(f"/api/v1/obligations/{obligation['id']}/archive")
    active = client.get("/api/v1/obligations")
    including_archived = client.get("/api/v1/obligations?include_archived=true")

    assert changed.status_code == 200 and changed.json()["compliance_status"] == "COMPLIANT"
    assert archived.status_code == 200 and archived.json()["is_active"] is False
    assert active.json() == []
    assert [item["id"] for item in including_archived.json()] == [obligation["id"]]
