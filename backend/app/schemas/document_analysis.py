from pydantic import BaseModel, Field

class DocumentAnalysisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)

class OrganizationProposal(BaseModel):
    organization_name: str | None = None
    rut: str | None = None
    activity_description: str | None = None
    warnings: list[str] = Field(default_factory=list)
