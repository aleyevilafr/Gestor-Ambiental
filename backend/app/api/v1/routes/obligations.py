from typing import Annotated
from uuid import UUID
from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.api.v1.routes.auth import get_current_active_user,require_roles
from app.db.session import get_db
from app.models.obligation import ComplianceStatus
from app.models.role import RoleCode
from app.models.user import User
from app.schemas.obligation import *
from app.services import obligations as service
router=APIRouter(prefix='/api/v1/obligations',tags=['obligations'])
Db=Annotated[Session,Depends(get_db)];Current=Annotated[User,Depends(get_current_active_user)];Admin=Annotated[User,Depends(require_roles(RoleCode.ADMIN))]
@router.get('',response_model=list[ObligationResponse])
def list_(u:Current,db:Db,compliance_status:ComplianceStatus|None=None,responsible_user_id:UUID|None=None,matter:str|None=None,search:str|None=None,include_archived:bool=False):return [service.out(x) for x in service.list_visible(db,u,compliance_status,responsible_user_id,matter,search,include_archived)]
@router.get('/{id}',response_model=ObligationResponse)
def detail(id:UUID,u:Current,db:Db):return service.out(service.get(db,u,id))
@router.post('',response_model=ObligationResponse,status_code=201)
def create_(p:CreateObligationRequest,u:Admin,db:Db):return service.out(service.create(db,u,p))
@router.patch('/{id}',response_model=ObligationResponse)
def update_(id:UUID,p:UpdateObligationRequest,u:Current,db:Db):return service.out(service.update(db,u,id,p))
@router.patch('/{id}/status',response_model=ObligationResponse)
def status_(id:UUID,p:UpdateObligationStatusRequest,u:Current,db:Db):return service.out(service.change_status(db,u,id,p))
@router.patch('/{id}/archive',response_model=ObligationResponse)
def archive_(id:UUID,u:Admin,db:Db):return service.out(service.archive(db,u,id))
