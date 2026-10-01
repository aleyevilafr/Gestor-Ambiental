from collections.abc import Generator
import os
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import SessionLocal
from app.main import app
from app.models import Control, Evidence, Obligation, User


pytestmark = pytest.mark.skipif(os.getenv("RUN_POSTGRES_INTEGRATION_TESTS") != "1", reason="Define RUN_POSTGRES_INTEGRATION_TESTS=1 y TEST_DATABASE_URL para ejecutar pruebas PostgreSQL.")


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


def test_admin_updates_control_fields(client: TestClient) -> None:
    register_admin(client)
    item = obligation(client)
    created = control(client, item["id"])

    updated = client.patch(
        f"/api/v1/controls/{created['id']}",
        json={"title": "Validar manifiestos", "description": "Revisión previa", "due_date": "2026-12-10"},
    )

    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "Validar manifiestos"
    assert updated.json()["description"] == "Revisión previa"
    assert updated.json()["due_date"] == "2026-12-10"


def test_assigned_responsible_manages_control_but_unassigned_is_rejected(client: TestClient) -> None:
    register_admin(client)
    responsible = user(client, "responsable@empresa.cl", "RESPONSIBLE")
    assigned = obligation(client, responsible["id"])
    other = obligation(client)
    assigned_control = control(client, assigned["id"])
    responsible_client = login("responsable@empresa.cl")

    assert responsible_client.get(f"/api/v1/obligations/{assigned['id']}/controls").status_code == 200
    assert responsible_client.get(f"/api/v1/obligations/{other['id']}/controls").status_code == 403
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
    assert reader.post(f"/api/v1/obligations/{item['id']}/controls", json={"title": "No"}).status_code == 403
    assert reader.patch(f"/api/v1/controls/{existing_control['id']}", json={"title": "No"}).status_code == 403
    reader.close()

    other = TestClient(app)
    register_admin(other, "admin-b@empresa.cl", "76.086.428-5")
    assert other.get(f"/api/v1/obligations/{item['id']}/controls").status_code == 404
    assert other.patch(f"/api/v1/controls/{existing_control['id']}", json={"title": "No"}).status_code == 404
    other.close()


def test_unknown_obligation_control_and_invalid_status_are_rejected(client: TestClient) -> None:
    register_admin(client)
    item = obligation(client)
    created = control(client, item["id"])

    assert client.get("/api/v1/obligations/00000000-0000-0000-0000-000000000001/controls").status_code == 404
    assert client.patch("/api/v1/controls/00000000-0000-0000-0000-000000000001", json={"title": "No"}).status_code == 404
    assert client.patch(f"/api/v1/controls/{created['id']}/status", json={"status": "INVALID"}).status_code == 422


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


def evidence_payload(**overrides) -> dict:
    return {"name": "Respaldo", "evidence_type": "EXTERNAL_LINK", "external_url": "https://example.com/respaldo", **overrides}


def test_evidence_orm_relationships_and_report_counts(client: TestClient) -> None:
    register_admin(client)
    item = obligation(client)
    action = control(client, item["id"])
    creator = client.get("/auth/me").json()
    direct = client.post(f"/api/v1/obligations/{item['id']}/evidences", json=evidence_payload(name="General"))
    linked = client.post(f"/api/v1/obligations/{item['id']}/evidences", json=evidence_payload(name="Específica", control_id=action["id"]))
    assert direct.status_code == linked.status_code == 201
    with SessionLocal() as db:
        general = db.get(Evidence, UUID(direct.json()["id"]))
        specific = db.get(Evidence, UUID(linked.json()["id"]))
        stored_control = db.get(Control, UUID(action["id"]))
        stored_obligation = db.get(Obligation, UUID(item["id"]))
        stored_user = db.get(User, UUID(creator["id"]))
        assert general.control is None
        assert specific.control is stored_control
        assert specific.obligation is general.obligation is stored_obligation
        assert {e.id for e in stored_control.evidences} == {specific.id}
        assert {e.id for e in stored_obligation.evidences} == {general.id, specific.id}
        assert specific.uploaded_by_user is general.uploaded_by_user is stored_user
        assert {e.id for e in stored_user.uploaded_evidences} == {general.id, specific.id}
    response = client.get(f"/api/v1/obligations/{item['id']}/evidences")
    assert response.status_code == 200
    assert {e["name"] for e in response.json() if e["control_id"] is None} == {"General"}
    report = client.get("/api/v1/reports/compliance")
    assert report.status_code == 200
    assert report.json()["obligations"][0]["evidences_count"] == 2


@pytest.mark.parametrize("foreign_organization", [False, True])
def test_evidence_rejects_control_of_another_obligation(client: TestClient, foreign_organization: bool) -> None:
    register_admin(client)
    item = obligation(client)
    with TestClient(app) as other:
        if foreign_organization:
            register_admin(other, "other@empresa.cl", "76.086.428-5")
            foreign_item = obligation(other)
            foreign_control = control(other, foreign_item["id"])
        else:
            foreign_item = obligation(client)
            foreign_control = control(client, foreign_item["id"])
        response = client.post(f"/api/v1/obligations/{item['id']}/evidences", json=evidence_payload(control_id=foreign_control["id"]))
        assert response.status_code == 422
        assert response.json() == {"detail": "El control debe pertenecer a esta obligación."}
        assert client.get(f"/api/v1/obligations/{item['id']}/evidences").json() == []


def test_evidence_organization_isolation_for_read_and_create(client: TestClient) -> None:
    register_admin(client)
    item = obligation(client)
    created = client.post(f"/api/v1/obligations/{item['id']}/evidences", json=evidence_payload())
    assert created.status_code == 201
    with TestClient(app) as other:
        register_admin(other, "other@empresa.cl", "76.086.428-5")
        other_item = obligation(other)
        assert other.get(f"/api/v1/obligations/{item['id']}/evidences").status_code == 404
        assert other.post(f"/api/v1/obligations/{item['id']}/evidences", json=evidence_payload()).status_code == 404
        assert other.get(f"/api/v1/obligations/{other_item['id']}/evidences").json() == []
    assert len(client.get(f"/api/v1/obligations/{item['id']}/evidences").json()) == 1


def test_evidence_responsible_assigned_and_reader_permissions(client: TestClient) -> None:
    register_admin(client)
    responsible = user(client, "responsible@empresa.cl", "RESPONSIBLE")
    user(client, "reader@empresa.cl", "READER")
    assigned = obligation(client, responsible["id"])
    unassigned = obligation(client)
    with login("responsible@empresa.cl") as actor:
        assert actor.post(f"/api/v1/obligations/{assigned['id']}/evidences", json=evidence_payload()).status_code == 201
        assert actor.get(f"/api/v1/obligations/{assigned['id']}/evidences").status_code == 200
        assert actor.get(f"/api/v1/obligations/{unassigned['id']}/evidences").status_code == 403
        assert actor.post(f"/api/v1/obligations/{unassigned['id']}/evidences", json=evidence_payload()).status_code == 403
    with login("reader@empresa.cl") as reader:
        assert reader.get(f"/api/v1/obligations/{assigned['id']}/evidences").status_code == 200
        assert reader.post(f"/api/v1/obligations/{assigned['id']}/evidences", json=evidence_payload()).status_code == 403


@pytest.mark.parametrize("kind,url_field", [("FILE", "file_url"), ("EXTERNAL_LINK", "external_url")])
def test_evidence_historical_types_and_server_owned_fields(client: TestClient, kind: str, url_field: str) -> None:
    register_admin(client)
    item = obligation(client)
    creator = client.get("/auth/me").json()
    forged_id = "00000000-0000-0000-0000-000000000099"
    payload = {"name": "Respaldo", "evidence_type": kind, url_field: "https://example.com/document.pdf", "id": forged_id, "uploaded_by_user_id": forged_id, "obligation_id": forged_id, "organization_id": forged_id}
    response = client.post(f"/api/v1/obligations/{item['id']}/evidences", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["id"] != forged_id
    assert data["uploaded_by_user_id"] == creator["id"]
    assert data["obligation_id"] == item["id"]
    assert data["control_id"] is None
    assert data["evidence_type"] == kind and data[url_field] == payload[url_field]
    assert "password_hash" not in response.text
    assert client.get(f"/api/v1/obligations/{item['id']}/evidences").json() == [data]


def test_unauthenticated_evidence_access_is_rejected(client: TestClient) -> None:
    register_admin(client)
    item = obligation(client)
    with TestClient(app) as anonymous:
        assert anonymous.get(f"/api/v1/obligations/{item['id']}/evidences").status_code == 401
        assert anonymous.post(f"/api/v1/obligations/{item['id']}/evidences", json=evidence_payload()).status_code == 401


def test_admin_generates_ephemeral_compliance_plan_and_other_roles_are_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.routes import obligations as obligation_routes
    from app.schemas.compliance_plan import CompliancePlanProposal

    register_admin(client)
    item = obligation(client)
    monkeypatch.setattr(obligation_routes.compliance_plan, "generate", lambda _item: CompliancePlanProposal.model_validate({"objective": "Ordenar antecedentes", "recommended_actions": [{"title": "Consolidar registros"}]}))
    generated = client.post(f"/api/v1/obligations/{item['id']}/ai-compliance-plan")
    assert generated.status_code == 200
    assert generated.json()["recommended_actions"][0]["title"] == "Consolidar registros"
    assert client.get(f"/api/v1/obligations/{item['id']}/controls").json() == []

    user(client, "responsable-plan@empresa.cl", "RESPONSIBLE")
    user(client, "lector-plan@empresa.cl", "READER")
    responsible = login("responsable-plan@empresa.cl")
    reader = login("lector-plan@empresa.cl")
    assert responsible.post(f"/api/v1/obligations/{item['id']}/ai-compliance-plan").status_code == 403
    assert reader.post(f"/api/v1/obligations/{item['id']}/ai-compliance-plan").status_code == 403
    responsible.close()
    reader.close()
