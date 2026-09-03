from __future__ import annotations

from collections.abc import Generator
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

from app.api.v1.routes import ai as ai_routes
from app.db.session import SessionLocal
from app.main import app
from app.models.obligation import Obligation
from app.schemas.ai_obligation_analysis import AIObligationAnalysisResponse, AIObligationProposal


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_POSTGRES_INTEGRATION_TESTS") != "1",
    reason="Define RUN_POSTGRES_INTEGRATION_TESTS=1 y TEST_DATABASE_URL para ejecutar pruebas PostgreSQL.",
)


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


def register_admin(client: TestClient, email: str = "admin-ai@empresa.cl") -> None:
    response = client.post(
        "/auth/register",
        json={
            "organization_name": "Empresa IA SpA",
            "rut": "12.345.678-5",
            "name": "Admin IA",
            "email": email,
            "password": "ClaveSegura2026!",
        },
    )
    assert response.status_code == 201, response.text


def create_user(client: TestClient, email: str, role: str) -> None:
    response = client.post(
        "/api/v1/users",
        json={"name": role, "email": email, "password": "ClaveSegura2026!", "role": role},
    )
    assert response.status_code == 201, response.text


def login(email: str) -> TestClient:
    result = TestClient(app)
    response = result.post("/auth/login", json={"email": email, "password": "ClaveSegura2026!"})
    assert response.status_code == 200, response.text
    return result


def fake_result() -> AIObligationAnalysisResponse:
    return AIObligationAnalysisResponse(
        document_name="normativa.txt",
        proposals=[AIObligationProposal(title="Declaración REP", matter="REP", regulatory_source="Ley 20.920")],
        warnings=[],
    )


def test_admin_can_analyze_without_creating_obligations(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    register_admin(client)
    monkeypatch.setattr(ai_routes, "analyze_document", lambda **kwargs: fake_result())

    db = SessionLocal()
    try:
        before = db.scalar(select(func.count()).select_from(Obligation))
    finally:
        db.close()
    response = client.post(
        "/api/v1/ai/analyze-obligations",
        content=b"texto normativo",
        headers={"Content-Type": "text/plain", "X-Document-Name": "normativa.txt"},
    )
    db = SessionLocal()
    try:
        after = db.scalar(select(func.count()).select_from(Obligation))
    finally:
        db.close()

    assert response.status_code == 200, response.text
    assert response.json()["proposals"][0]["title"] == "Declaración REP"
    assert before == after == 0


@pytest.mark.parametrize("role", ["RESPONSIBLE", "READER"])
def test_non_admin_roles_cannot_analyze(client: TestClient, monkeypatch: pytest.MonkeyPatch, role: str) -> None:
    register_admin(client)
    create_user(client, f"{role.lower()}-ai@empresa.cl", role)
    monkeypatch.setattr(ai_routes, "analyze_document", lambda **kwargs: fake_result())
    role_client = login(f"{role.lower()}-ai@empresa.cl")

    response = role_client.post(
        "/api/v1/ai/analyze-obligations",
        content=b"texto",
        headers={"Content-Type": "text/plain", "X-Document-Name": "normativa.txt"},
    )
    role_client.close()

    assert response.status_code == 403
