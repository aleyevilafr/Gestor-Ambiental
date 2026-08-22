from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.v1.routes.auth import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.report import ComplianceReportResponse
from app.services.reports import compliance_report
router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
Db=Annotated[Session,Depends(get_db)]; Current=Annotated[User,Depends(get_current_active_user)]
@router.get("/compliance",response_model=ComplianceReportResponse)
def compliance(user:Current,db:Db)->ComplianceReportResponse: return compliance_report(db,user)
