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

type ApiErrorBody = { detail?: string };

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
    throw new ApiError(body.detail ?? "No fue posible completar la solicitud.", response.status);
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
