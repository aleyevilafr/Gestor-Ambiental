const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RESPONSIBLE" | "READER";
  organization: {
    id: string;
    name: string;
    rut: string;
  };
};

export type OrganizationUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RESPONSIBLE" | "READER";
  is_active: boolean;
  created_at: string;
};

type ApiErrorBody = { detail?: string | unknown[] };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(typeof body.detail === "string" ? body.detail : "No fue posible completar la solicitud.", response.status);
  }
  return response.json() as Promise<T>;
}

export function registerOrganization(payload: { organization_name: string; rut: string; name: string; email: string; password: string }) {
  return apiRequest<AuthenticatedUser>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthenticatedUser>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function getCurrentUser() {
  return apiRequest<AuthenticatedUser>("/auth/me");
}

export function getUsers() {
  return apiRequest<OrganizationUser[]>("/api/v1/users");
}

export function createUser(payload: { name: string; email: string; password: string; role: OrganizationUser["role"] }) {
  return apiRequest<OrganizationUser>("/api/v1/users", { method: "POST", body: JSON.stringify(payload) });
}

export function updateUser(userId: string, payload: Partial<Pick<OrganizationUser, "name" | "email" | "role">>) {
  return apiRequest<OrganizationUser>(`/api/v1/users/${userId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function updateUserStatus(userId: string, is_active: boolean) {
  return apiRequest<OrganizationUser>(`/api/v1/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ is_active }) });
}
export type Obligation={id:string;title:string;description:string|null;matter:string;regulatory_source:string;article:string|null;deadline:string|null;frequency:string|null;compliance_status:"PENDING"|"IN_PROGRESS"|"COMPLIANT"|"OVERDUE";responsible_user_id:string|null;responsible_user:{id:string;name:string;email:string}|null;is_active:boolean;created_at:string;updated_at:string};
export function getObligations(filters=""){return apiRequest<Obligation[]>(`/api/v1/obligations${filters}`)}
export function getObligation(id:string){return apiRequest<Obligation>(`/api/v1/obligations/${id}`)}
export function createObligation(payload:Record<string,unknown>){return apiRequest<Obligation>("/api/v1/obligations",{method:"POST",body:JSON.stringify(payload)})}
export function updateObligation(id:string,payload:Record<string,unknown>){return apiRequest<Obligation>(`/api/v1/obligations/${id}`,{method:"PATCH",body:JSON.stringify(payload)})}
export function updateObligationStatus(id:string,compliance_status:Obligation["compliance_status"]){return apiRequest<Obligation>(`/api/v1/obligations/${id}/status`,{method:"PATCH",body:JSON.stringify({compliance_status})})}
export function archiveObligation(id:string){return apiRequest<Obligation>(`/api/v1/obligations/${id}/archive`,{method:"PATCH"})}
export type Control={id:string;obligation_id:string;title:string;description:string|null;due_date:string|null;status:"PENDING"|"IN_PROGRESS"|"COMPLETED";created_at:string;updated_at:string};
export type Evidence={id:string;obligation_id:string;control_id:string|null;name:string;description:string|null;evidence_type:"FILE"|"EXTERNAL_LINK";file_url:string|null;external_url:string|null;uploaded_by_user_id:string;uploaded_by_user:{id:string;name:string;email:string};created_at:string};
export function getControls(obligationId:string){return apiRequest<Control[]>(`/api/v1/obligations/${obligationId}/controls`)}
export function createControl(obligationId:string,payload:Record<string,unknown>){return apiRequest<Control>(`/api/v1/obligations/${obligationId}/controls`,{method:"POST",body:JSON.stringify(payload)})}
export function updateControl(id:string,payload:Record<string,unknown>){return apiRequest<Control>(`/api/v1/controls/${id}`,{method:"PATCH",body:JSON.stringify(payload)})}
export function updateControlStatus(id:string,status:Control["status"]){return apiRequest<Control>(`/api/v1/controls/${id}/status`,{method:"PATCH",body:JSON.stringify({status})})}
export function getEvidences(obligationId:string){return apiRequest<Evidence[]>(`/api/v1/obligations/${obligationId}/evidences`)}
export function createEvidence(obligationId:string,payload:Record<string,unknown>){return apiRequest<Evidence>(`/api/v1/obligations/${obligationId}/evidences`,{method:"POST",body:JSON.stringify(payload)})}
export type DashboardObligation={id:string;title:string;matter:string;deadline:string|null;compliance_status:Obligation["compliance_status"];responsible_name:string|null};
export type DashboardSummary={total_obligations:number;compliant:number;in_progress:number;pending:number;overdue:number;compliance_percentage:number;attention_obligations:DashboardObligation[];upcoming_obligations:DashboardObligation[]};
export function getDashboardSummary(){return apiRequest<DashboardSummary>("/api/v1/dashboard/summary")}
export type ComplianceReport={organization:{id:string;name:string;rut:string};generated_at:string;summary:DashboardSummary;obligations:Array<DashboardObligation & {regulatory_source:string;article:string|null;frequency:string|null;responsible:string|null;controls_count:number;evidences_count:number}>};
export function getComplianceReport(){return apiRequest<ComplianceReport>("/api/v1/reports/compliance")}
export type OrganizationProposal={organization_name:string|null;rut:string|null;activity_description:string|null;warnings:string[]};
export function analyzeDocument(text:string){return apiRequest<OrganizationProposal>("/api/v1/document-analysis/extract-organization",{method:"POST",body:JSON.stringify({text})})}
export type CompanyType="SPA"|"LIMITADA"|"SA_CERRADA"|"SA_ABIERTA"|"EIRL"|"OTHER"|"UNKNOWN";
export type CompanyProfileExtraction={legal_name:string|null;trade_name:string|null;rut:string|null;company_type:CompanyType;incorporation_date:string|null;address:string|null;commune:string|null;region:string|null;business_purpose:string|null;legal_representatives:string[];document_date:string|null;warnings:string[]};
export async function analyzeCompanyProfile(file:File){const response=await fetch(`${apiUrl}/api/v1/document-analysis/extract-company-profile`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/pdf"},body:file});if(!response.ok){const body=await response.json().catch(()=>({}));throw new ApiError(typeof body.detail==="string"?body.detail:"No fue posible analizar el PDF.",response.status)}return response.json() as Promise<CompanyProfileExtraction>}
export async function updateCompanyProfile(payload:{name:string;rut:string;company_type:CompanyType;business_purpose:string|null;address:string|null}){return apiRequest<{name:string;rut:string;company_type:CompanyType;business_purpose:string|null;address:string|null}>("/api/v1/document-analysis/company-profile",{method:"PATCH",body:JSON.stringify(payload)})}
