from collections.abc import Generator
from datetime import date,timedelta
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.db.session import SessionLocal
from app.main import app
pytestmark=pytest.mark.skipif(os.getenv("RUN_POSTGRES_INTEGRATION_TESTS")!="1",reason="Define RUN_POSTGRES_INTEGRATION_TESTS=1")
@pytest.fixture(autouse=True)
def clean_data()->Generator[None,None,None]:
 db=SessionLocal();db.execute(text("TRUNCATE TABLE evidences, controls, obligations, users, organizations CASCADE"));db.commit();db.close();yield
@pytest.fixture
def client()->Generator[TestClient,None,None]:
 with TestClient(app)as c:yield c
def register(c,email="admin@empresa.cl",rut="12.345.678-5"):
 assert c.post("/auth/register",json={"organization_name":"Empresa SpA","rut":rut,"name":"Admin","email":email,"password":"ClaveSegura2026!"}).status_code==201
def create_user(c,email,role):return c.post("/api/v1/users",json={"name":role,"email":email,"password":"ClaveSegura2026!","role":role}).json()
def login(email):
 c=TestClient(app);assert c.post("/auth/login",json={"email":email,"password":"ClaveSegura2026!"}).status_code==200;return c
def obligation(c,title,status="PENDING",deadline=None,responsible=None):
 r=c.post("/api/v1/obligations",json={"title":title,"matter":"Residuos","regulatory_source":"D.S. 148","compliance_status":status,"deadline":deadline.isoformat()if deadline else None,"responsible_user_id":responsible});assert r.status_code==201,r.text;return r.json()
def test_empty_and_counts_percent_due_soon_unassigned(client):
 register(client);assert client.get("/api/v1/dashboard/summary").json()["compliance_percentage"]==0
 today=date.today();obligation(client,"Cumplida","COMPLIANT");obligation(client,"Vencida","OVERDUE",today-timedelta(days=1));obligation(client,"Cercana","PENDING",today+timedelta(days=5));s=client.get("/api/v1/dashboard/summary").json();assert (s["active"],s["compliant"],s["overdue"],s["due_soon"],s["unassigned"],s["compliance_percentage"])==(3,1,1,1,3,33.33)
def test_attention_priority_and_upcoming_order(client):
 register(client);today=date.today();overdue=obligation(client,"Vencida","OVERDUE",today-timedelta(days=1));soon=obligation(client,"Cercana","PENDING",today+timedelta(days=8));later=obligation(client,"Después","PENDING",today+timedelta(days=20));attention=client.get("/api/v1/dashboard/attention").json();upcoming=client.get("/api/v1/dashboard/upcoming").json();assert attention[0]["id"]==overdue["id"] and attention[0]["attention_reason"]=="OVERDUE";assert [x["id"]for x in upcoming]==[soon["id"],later["id"]]
def test_roles_and_organization_isolation(client):
 register(client,"admin-a@empresa.cl");responsible=create_user(client,"responsible@empresa.cl","RESPONSIBLE");create_user(client,"reader@empresa.cl","READER");assigned=obligation(client,"Asignada",responsible=responsible["id"]);obligation(client,"No asignada");rc=login("responsible@empresa.cl");reader=login("reader@empresa.cl");assert rc.get("/api/v1/dashboard/summary").json()["active"]==1;assert rc.get("/api/v1/dashboard/attention").json()[0]["id"]==assigned["id"];assert reader.get("/api/v1/dashboard/summary").json()["active"]==2;other=TestClient(app);register(other,"admin-b@empresa.cl","76.086.428-5");assert other.get("/api/v1/dashboard/summary").json()["active"]==0;rc.close();reader.close();other.close()
