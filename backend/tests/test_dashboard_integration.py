from collections.abc import Generator
from datetime import date, timedelta
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


def register(client: TestClient, email: str = "admin@empresa.cl", rut: str = "12.345.678-5") -> None:
    response = client.post("/auth/register", json={"organization_name": "Empresa SpA", "rut": rut, "name": "Admin", "email": email, "password": "ClaveSegura2026!"})
    assert response.status_code == 201, response.text


def create_user(client: TestClient, email: str, role: str) -> None:
    response = client.post("/api/v1/users", json={"name": role, "email": email, "password": "ClaveSegura2026!", "role": role})
    assert response.status_code == 201, response.text


def login(email: str) -> TestClient:
    result = TestClient(app)
    assert result.post("/auth/login", json={"email": email, "password": "ClaveSegura2026!"}).status_code == 200
    return result


def obligation(client: TestClient, title: str, status: str = "PENDING", deadline: date | None = None) -> dict:
    response = client.post("/api/v1/obligations", json={"title": title, "matter": "Residuos", "regulatory_source": "D.S. 148", "compliance_status": status, "deadline": deadline.isoformat() if deadline else None})
    assert response.status_code == 201, response.text
    return response.json()


def test_summary_without_obligations(client: TestClient) -> None:
    register(client)
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    assert response.json()["total_obligations"] == 0
    assert response.json()["compliance_percentage"] == 0


def test_summary_counts_percentage_and_excludes_archived(client: TestClient) -> None:
    register(client)
    obligation(client, "Cumplida", "COMPLIANT")
    obligation(client, "En proceso", "IN_PROGRESS")
    obligation(client, "Pendiente", "PENDING")
    expired = obligation(client, "Vencida", "OVERDUE")
    archived = obligation(client, "Archivada", "COMPLIANT")
    assert client.patch(f"/api/v1/obligations/{archived['id']}/archive").status_code == 200

    summary = client.get("/api/v1/dashboard/summary").json()

    assert {key: summary[key] for key in ("total_obligations", "compliant", "in_progress", "pending", "overdue")} == {"total_obligations": 4, "compliant": 1, "in_progress": 1, "pending": 1, "overdue": 1}
    assert summary["compliance_percentage"] == 25
    assert expired["id"] in {item["id"] for item in summary["attention_obligations"]}


def test_upcoming_is_ordered_and_attention_prioritizes_overdue(client: TestClient) -> None:
    register(client)
    today = date.today()
    overdue = obligation(client, "Vencida", "OVERDUE", today - timedelta(days=2))
    near_pending = obligation(client, "Pendiente cercana", "PENDING", today + timedelta(days=12))
    near_progress = obligation(client, "En proceso cercano", "IN_PROGRESS", today + timedelta(days=4))
    later = obligation(client, "Más tarde", "PENDING", today + timedelta(days=20))

    summary = client.get("/api/v1/dashboard/summary").json()

    assert summary["attention_obligations"][0]["id"] == overdue["id"]
    assert {item["id"] for item in summary["attention_obligations"]} >= {near_pending["id"], near_progress["id"]}
    assert [item["id"] for item in summary["upcoming_obligations"]] == [near_progress["id"], near_pending["id"], later["id"]]


@pytest.mark.parametrize("role", ["ADMIN", "RESPONSIBLE", "READER"])
def test_all_roles_can_view_their_organization_dashboard(client: TestClient, role: str) -> None:
    register(client)
    if role == "ADMIN":
        viewer = client
    else:
        create_user(client, f"{role.lower()}@empresa.cl", role)
        viewer = login(f"{role.lower()}@empresa.cl")
    assert viewer.get("/api/v1/dashboard/summary").status_code == 200
    if viewer is not client:
        viewer.close()


def test_dashboard_isolated_by_organization(client: TestClient) -> None:
    register(client, "admin-a@empresa.cl", "12.345.678-5")
    obligation(client, "Solo organización A", "COMPLIANT")
    other = TestClient(app)
    register(other, "admin-b@empresa.cl", "76.086.428-5")

    assert other.get("/api/v1/dashboard/summary").json()["total_obligations"] == 0
    other.close()
