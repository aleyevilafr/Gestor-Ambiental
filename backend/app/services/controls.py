from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.control import Control
from app.models.role import RoleCode
from app.models.user import User
from app.repositories.controls import get_for_organization, list_for_obligation
from app.repositories.obligations import eligible_user
from app.schemas.control import BatchCreateControlsRequest, ControlResponse, CreateControlRequest, UpdateControlRequest, UpdateControlStatusRequest
from app.services.obligations import get as get_obligation

def serialize(c: Control) -> ControlResponse:
    return ControlResponse(id=c.id,obligation_id=c.obligation_id,title=c.title,description=c.description,due_date=c.due_date,status=c.status,responsible_user_id=c.responsible_user_id,expected_evidence=c.expected_evidence,created_at=c.created_at,updated_at=c.updated_at)
def get_visible_obligation(db,u,id): return get_obligation(db,u,id)
def _responsible(db,org,id):
    if id is None:return None
    candidate=eligible_user(db,org,id)
    if not candidate or candidate.role.code not in {RoleCode.ADMIN,RoleCode.RESPONSIBLE}: raise HTTPException(422,"El responsable debe ser un usuario activo ADMIN o RESPONSIBLE de la organización.")
    return id
def get_editable_control(db,u,id):
    c=get_for_organization(db,u.organization_id,id)
    if not c:raise HTTPException(404,"Control no encontrado.")
    if u.role.code==RoleCode.ADMIN or (u.role.code==RoleCode.RESPONSIBLE and c.obligation.responsible_user_id==u.id):return c
    raise HTTPException(403,"No tienes permisos para modificar este control.")
def list_controls(db,u,id): get_visible_obligation(db,u,id);return list_for_obligation(db,id)
def _make(db,u,o,p): return Control(obligation_id=o.id,title=p.title,description=p.description,due_date=p.due_date,status=p.status,responsible_user_id=_responsible(db,u.organization_id,p.responsible_user_id),expected_evidence=p.expected_evidence)
def create_control(db,u,id,p):
    o=get_visible_obligation(db,u,id)
    if u.role.code==RoleCode.READER:raise HTTPException(403,"No tienes permisos para crear controles.")
    c=_make(db,u,o,p);db.add(c);db.commit();db.refresh(c);return c
def create_batch(db,u,id,p:BatchCreateControlsRequest):
    o=get_visible_obligation(db,u,id)
    if u.role.code!=RoleCode.ADMIN:raise HTTPException(403,"Solo un administrador puede agregar acciones en lote.")
    try:
        items=[_make(db,u,o,item) for item in p.actions]
        db.add_all(items);db.commit()
    except Exception: db.rollback();raise
    for item in items:db.refresh(item)
    return items
def update_control(db,u,id,p):
    c=get_editable_control(db,u,id);data=p.model_dump(exclude_unset=True)
    if "responsible_user_id" in data:data["responsible_user_id"]=_responsible(db,u.organization_id,data["responsible_user_id"])
    for k,v in data.items():setattr(c,k,v)
    db.commit();db.refresh(c);return c
def update_control_status(db,u,id,p):
    c=get_editable_control(db,u,id);c.status=p.status;db.commit();db.refresh(c);return c
