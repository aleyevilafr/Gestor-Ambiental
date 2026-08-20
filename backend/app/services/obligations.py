from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.obligation import Obligation, ComplianceStatus
from app.models.role import RoleCode
from app.models.user import User
from app.repositories.obligations import add,eligible_user,get_for_org,list_for_org,save
from app.schemas.obligation import *

def out(o:Obligation):
    r=None if o.responsible_user is None else ResponsibleUserResponse(id=o.responsible_user.id,name=o.responsible_user.name,email=o.responsible_user.email)
    return ObligationResponse(id=o.id,title=o.title,description=o.description,matter=o.matter,regulatory_source=o.regulatory_source,article=o.article,deadline=o.deadline,frequency=o.frequency,compliance_status=o.compliance_status,responsible_user_id=o.responsible_user_id,responsible_user=r,created_by_user_id=o.created_by_user_id,is_active=o.is_active,created_at=o.created_at,updated_at=o.updated_at)
def get(db, u, id):
    o=get_for_org(db,u.organization_id,id)
    if not o: raise HTTPException(404,'Obligación no encontrada.')
    if u.role.code==RoleCode.RESPONSIBLE and o.responsible_user_id!=u.id: raise HTTPException(403,'No tienes permisos para esta obligación.')
    return o
def valid_responsible(db,org,id):
    if id is None:return None
    u=eligible_user(db,org,id)
    if not u or u.role.code not in {RoleCode.ADMIN,RoleCode.RESPONSIBLE}:raise HTTPException(422,'El responsable debe ser un usuario activo Administrador o Responsable de esta organización.')
    return id
def list_visible(db,u,state,responsible,matter,search,archived):
    if u.role.code==RoleCode.RESPONSIBLE: responsible,archived=u.id,False
    return list_for_org(db,u.organization_id,responsible,state,matter,search,archived)
def create(db,u,p):
    o=Obligation(organization_id=u.organization_id,created_by_user_id=u.id,title=p.title,description=p.description,matter=p.matter,regulatory_source=p.regulatory_source,article=p.article,deadline=p.deadline,frequency=p.frequency,compliance_status=p.compliance_status,responsible_user_id=valid_responsible(db,u.organization_id,p.responsible_user_id));add(db,o);save(db);db.refresh(o,attribute_names=['responsible_user']);return o
def editable(db,u,id):
    o=get_for_org(db,u.organization_id,id)
    if not o:raise HTTPException(404,'Obligación no encontrada.')
    if u.role.code==RoleCode.ADMIN:return o
    if u.role.code==RoleCode.RESPONSIBLE and o.responsible_user_id==u.id:return o
    raise HTTPException(403,'No tienes permisos para modificar esta obligación.')
def update(db,u,id,p):
    o=editable(db,u,id);data=p.model_dump(exclude_unset=True)
    if 'responsible_user_id' in data:
        if u.role.code!=RoleCode.ADMIN:raise HTTPException(403,'Solo un administrador puede reasignar responsables.')
        o.responsible_user_id=valid_responsible(db,u.organization_id,data.pop('responsible_user_id'))
    for k,v in data.items():setattr(o,k,v)
    save(db);db.refresh(o,attribute_names=['responsible_user']);return o
def change_status(db,u,id,p):
    o=editable(db,u,id);o.compliance_status=p.compliance_status;save(db);db.refresh(o,attribute_names=['responsible_user']);return o
def archive(db,u,id):
    if u.role.code != RoleCode.ADMIN:
        raise HTTPException(403,'Solo un administrador puede archivar obligaciones.')
    o=get_for_org(db,u.organization_id,id)
    if not o:raise HTTPException(404,'Obligación no encontrada.')
    o.is_active=False;save(db);db.refresh(o,attribute_names=['responsible_user']);return o
