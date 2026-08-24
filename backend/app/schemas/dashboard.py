from datetime import date
from uuid import UUID
from pydantic import BaseModel
from app.models.obligation import ComplianceStatus
class DashboardObligationResponse(BaseModel):
 id:UUID; title:str; matter:str; deadline:date|None; compliance_status:ComplianceStatus; responsible_name:str|None
class AttentionObligationResponse(BaseModel):
 id:UUID; title:str; responsible_name:str|None; deadline:date|None; compliance_status:ComplianceStatus; attention_reason:str
class DashboardSummaryResponse(BaseModel):
 total_obligations:int; active:int; compliant:int; in_progress:int; pending:int; overdue:int; due_soon:int; unassigned:int; compliance_percentage:float
