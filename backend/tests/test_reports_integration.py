from collections.abc import Generator
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.db.session import SessionLocal
from app.main import app
pytestmark=pytest.mark.skipif(os.getenv("RUN_POSTGRES_INTEGRATION_TESTS")!="1",reason="Define RUN_POSTGRES_INTEGRATION_TESTS=1.")
@pytest.fixture(autouse=True)
def clean()->Generator[None,None,None]:
 db=SessionLocal();db.execute(text("TRUNCATE TABLE evidences, controls, obligations, users, organizations CASCADE"));db.commit();db.close();yield
@pytest.fixture
def client()->Generator[TestClient,None,None]:
 with TestClient(app) as c: yield c
def register(c,email="admin@empresa.cl",rut="12.345.678-5"):
 assert c.post("/auth/register",json={"organization_name":"Empresa SpA","rut":rut,"name":"Admin","email":email,"password":"ClaveSegura2026!"}).status_code==201
def obligation(c,title,status="PENDING"):
 r=c.post("/api/v1/obligations",json={"title":title,"matter":"Residuos","regulatory_source":"DS","compliance_status":status});assert r.status_code==201;return r.json()
def test_empty_and_summary(client):
 register(client); assert client.get("/api/v1/reports/compliance").json()["summary"]["total_obligations"]==0
 a=obligation(client,"Cumplida","COMPLIANT"); obligation(client,"Pendiente"); archived=obligation(client,"Archivada","COMPLIANT");client.patch(f"/api/v1/obligations/{archived['id']}/archive")
 r=client.get("/api/v1/reports/compliance").json();assert r["summary"]["compliance_percentage"]==50 and len(r["obligations"])==2 and a["id"] in {x["id"] for x in r["obligations"]}
def test_counts_and_isolation(client):
 register(client); item=obligation(client,"Con relaciones"); control=client.post(f"/api/v1/obligations/{item['id']}/controls",json={"title":"Control"}).json();client.post(f"/api/v1/obligations/{item['id']}/evidences",json={"name":"Enlace","evidence_type":"EXTERNAL_LINK","external_url":"https://example.com","control_id":control["id"]})
 row=client.get("/api/v1/reports/compliance").json()["obligations"][0];assert row["controls_count"]==1 and row["evidences_count"]==1
 other=TestClient(app);register(other,"other@empresa.cl","76.086.428-5");assert other.get("/api/v1/reports/compliance").json()["summary"]["total_obligations"]==0;other.close()
@pytest.mark.parametrize("role",["ADMIN","RESPONSIBLE","READER"])
def test_all_roles_access_report(client,role):
 register(client)
 if role=="ADMIN": viewer=client
 else:
  assert client.post("/api/v1/users",json={"name":role,"email":f"{role}@empresa.cl","password":"ClaveSegura2026!","role":role}).status_code==201;viewer=TestClient(app);assert viewer.post("/auth/login",json={"email":f"{role}@empresa.cl","password":"ClaveSegura2026!"}).status_code==200
 assert viewer.get("/api/v1/reports/compliance").status_code==200
 if viewer is not client: viewer.close()
