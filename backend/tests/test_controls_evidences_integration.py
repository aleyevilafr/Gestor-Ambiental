from collections.abc import Generator
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import SessionLocal
from app.main import app


pytestmark = pytest.mark.skipif(os.getenv("RUN_POSTGRES_INTEGRATION_TESTS") != "1", reason="Define RUN_POSTGRES_INTEGRATION_TESTS=1 y DATABASE_URL para ejecutar pruebas PostgreSQL.")


@pytest.fixture(autouse=True)
def clean_data() -> Generator[None, None, None]:
    db = SessionLocal()
    db.execute(text("TRUNCATE TABLE evidences, controls, obligations, users, organizations CASCADE"))
    db.commit()
    db.close()
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def register_admin(client: TestClient, email: str = "admin@empresa.cl", rut: str = "12.345.678-5") -> None:
    response = client.post("/auth/register", json={"organization_name": "Empresa SpA", "rut": rut, "name": "Admin", "email": email, "password": "ClaveSegura2026!"})
    assert response.status_code == 201, response.text


def user(client: TestClient, email: str, role: str) -> dict:
    response = client.post("/api/v1/users", json={"name": role, "email": email, "password": "ClaveSegura2026!", "role": role})
    assert response.status_code == 201, response.text
    return response.json()


def login(email: str) -> TestClient:
    result = TestClient(app)
    assert result.post("/auth/login", json={"email": email, "password": "ClaveSegura2026!"}).status_code == 200
    return result


def obligation(client: TestClient, responsible_user_id: str | None = None) -> dict:
    response = client.post("/api/v1/obligations", json={"title": "Obligación base", "matter": "Residuos", "regulatory_source": "D.S. 148", "responsible_user_id": responsible_user_id})
    assert response.status_code == 201, response.text
    return response.json()


def control(client: TestClient, obligation_id: str) -> dict:
    response = client.post(f"/api/v1/obligations/{obligation_id}/controls", json={"title": "Revisar registro", "due_date": "2026-12-01"})
    assert response.status_code == 201, response.text
    return response.json()


def test_admin_creates_lists_and_changes_control_status(client: TestClient) -> None:
    register_admin(client)
    item = obligation(client)
    created = control(client, item["id"])
    listed = client.get(f"/api/v1/obligations/{item['id']}/controls")
    changed = client.patch(f"/api/v1/controls/{created['id']}/status", json={"status": "COMPLETED"})

    assert [entry["id"] for entry in listed.json()] == [created["id"]]
    assert changed.status_code == 200 and changed.json()["status"] == "COMPLETED"


def test_assigned_responsible_manages_control_but_unassigned_is_rejected(client: TestClient) -> None:
    register_admin(client)
    responsible = user(client, "responsable@empresa.cl", "RESPONSIBLE")
    assigned = obligation(client, responsible["id"])
    other = obligation(client)
    assigned_control = control(client, assigned["id"])
    responsible_client = login("responsable@empresa.cl")

    assert responsible_client.post(f"/api/v1/obligations/{assigned['id']}/controls", json={"title": "Control responsable"}).status_code == 201
    assert responsible_client.patch(f"/api/v1/controls/{assigned_control['id']}", json={"title": "Actualizado"}).status_code == 200
    assert responsible_client.post(f"/api/v1/obligations/{other['id']}/controls", json={"title": "No permitido"}).status_code == 403
    responsible_client.close()


def test_reader_cannot_modify_and_external_organization_returns_404(client: TestClient) -> None:
    register_admin(client, "admin-a@empresa.cl", "12.345.678-5")
    item = obligation(client)
    existing_control = control(client, item["id"])
    user(client, "lector@empresa.cl", "READER")
    reader = login("lector@empresa.cl")
    assert reader.patch(f"/api/v1/controls/{existing_control['id']}", json={"title": "No"}).status_code == 403
    reader.close()

    other = TestClient(app)
    register_admin(other, "admin-b@empresa.cl", "76.086.428-5")
    assert other.get(f"/api/v1/obligations/{item['id']}/controls").status_code == 404
    assert other.patch(f"/api/v1/controls/{existing_control['id']}", json={"title": "No"}).status_code == 404
    other.close()


def test_external_evidence_can_be_linked_to_control_or_directly_to_obligation(client: TestClient) -> None:
    register_admin(client)
    item = obligation(client)
    existing_control = control(client, item["id"])
    linked = client.post(f"/api/v1/obligations/{item['id']}/evidences", json={"name": "Acta", "evidence_type": "EXTERNAL_LINK", "external_url": "https://example.com/acta", "control_id": existing_control["id"]})
    direct = client.post(f"/api/v1/obligations/{item['id']}/evidences", json={"name": "Registro", "evidence_type": "EXTERNAL_LINK", "external_url": "https://example.com/registro"})
    listed = client.get(f"/api/v1/obligations/{item['id']}/evidences")

    assert linked.status_code == 201 and linked.json()["control_id"] == existing_control["id"]
    assert direct.status_code == 201 and direct.json()["control_id"] is None
    assert {item["name"] for item in listed.json()} == {"Acta", "Registro"}


@pytest.mark.parametrize("payload", [
    {"name": "Enlace sin URL", "evidence_type": "EXTERNAL_LINK"},
    {"name": "Archivo sin URL", "evidence_type": "FILE"},
    {"name": "Enlace inválido", "evidence_type": "EXTERNAL_LINK", "external_url": "archivo-local"},
])
def test_evidence_type_validation(client: TestClient, payload: dict) -> None:
    register_admin(client)
    item = obligation(client)
    assert client.post(f"/api/v1/obligations/{item['id']}/evidences", json=payload).status_code == 422
