from datetime import date,timedelta
from uuid import UUID
from sqlalchemy import case,func,select,text
from sqlalchemy.orm import Session,joinedload
from app.models.obligation import ComplianceStatus,Obligation
NEAR_DEADLINE_DAYS=30
def _scope(org:UUID,user:UUID|None): return [Obligation.organization_id==org,Obligation.is_active.is_(True)]+([Obligation.responsible_user_id==user] if user else [])
def compliance_summary(db:Session,org:UUID,user:UUID|None=None):
 if user is None:
  row=db.execute(text("SELECT * FROM get_organization_compliance_summary(:organization_id)"),{"organization_id":org}).mappings().one();return {k:int(row[k]or 0) for k in("total_active","pending","in_progress","compliant","overdue")}
 f=func.count().filter; row=db.execute(select(func.count().label("total_active"),f(Obligation.compliance_status==ComplianceStatus.PENDING).label("pending"),f(Obligation.compliance_status==ComplianceStatus.IN_PROGRESS).label("in_progress"),f(Obligation.compliance_status==ComplianceStatus.COMPLIANT).label("compliant"),f(Obligation.compliance_status==ComplianceStatus.OVERDUE).label("overdue")).where(*_scope(org,user))).mappings().one();return {k:int(row[k]or 0) for k in("total_active","pending","in_progress","compliant","overdue")}
def extra_counts(db,org,user,today):
 s=_scope(org,user);near=today+timedelta(days=NEAR_DEADLINE_DAYS);due=db.scalar(select(func.count()).select_from(Obligation).where(*s,Obligation.deadline>today,Obligation.deadline<=near,Obligation.compliance_status!=ComplianceStatus.COMPLIANT))or 0;unassigned=db.scalar(select(func.count()).select_from(Obligation).where(*s,Obligation.responsible_user_id.is_(None)))or 0;return int(due),int(unassigned)
def attention_obligations(db,org,user,today):
 near=today+timedelta(days=NEAR_DEADLINE_DAYS);due=(Obligation.deadline>today)&(Obligation.deadline<=near)&(Obligation.compliance_status!=ComplianceStatus.COMPLIANT);reason=case((Obligation.compliance_status==ComplianceStatus.OVERDUE,"OVERDUE"),(due,"DUE_SOON"),(Obligation.responsible_user_id.is_(None),"UNASSIGNED"),(Obligation.compliance_status==ComplianceStatus.PENDING,"PENDING"),else_=None);priority=case((Obligation.compliance_status==ComplianceStatus.OVERDUE,0),(due,1),(Obligation.responsible_user_id.is_(None),2),(Obligation.compliance_status==ComplianceStatus.PENDING,3),else_=4);return db.execute(select(Obligation,reason.label("reason")).options(joinedload(Obligation.responsible_user)).where(*_scope(org,user),reason.is_not(None)).order_by(priority,Obligation.deadline.asc().nulls_last()).limit(8)).all()
def upcoming_obligations(db,org,user,today): return list(db.scalars(select(Obligation).options(joinedload(Obligation.responsible_user)).where(*_scope(org,user),Obligation.deadline>today).order_by(Obligation.deadline.asc()).limit(5)))
