from datetime import date
from sqlalchemy.orm import Session
from app.models.role import RoleCode
from app.models.user import User
from app.repositories import dashboard
from app.schemas.dashboard import AttentionObligationResponse,DashboardObligationResponse,DashboardSummaryResponse
def _scope(user): return user.id if user.role.code==RoleCode.RESPONSIBLE else None
def _item(o): return DashboardObligationResponse(id=o.id,title=o.title,matter=o.matter,deadline=o.deadline,compliance_status=o.compliance_status,responsible_name=o.responsible_user.name if o.responsible_user else None)
def get_summary(db:Session,user:User,today:date|None=None):
 today=today or date.today();c=dashboard.compliance_summary(db,user.organization_id,_scope(user));due,unassigned=dashboard.extra_counts(db,user.organization_id,_scope(user),today);total=c["total_active"];return DashboardSummaryResponse(total_obligations=total,active=total,compliant=c["compliant"],in_progress=c["in_progress"],pending=c["pending"],overdue=c["overdue"],due_soon=due,unassigned=unassigned,compliance_percentage=round(c["compliant"]*100/total,2)if total else 0)
def get_attention(db,user): return [AttentionObligationResponse(id=o.id,title=o.title,responsible_name=o.responsible_user.name if o.responsible_user else None,deadline=o.deadline,compliance_status=o.compliance_status,attention_reason=r) for o,r in dashboard.attention_obligations(db,user.organization_id,_scope(user),date.today())]
def get_upcoming(db,user): return [_item(o) for o in dashboard.upcoming_obligations(db,user.organization_id,_scope(user),date.today())]
