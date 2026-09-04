const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new ApiError(res.status, data.erro || "Erro desconhecido");
  return data as T;
}

async function requestForm<T>(path: string, formData: FormData, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // sem Content-Type manual: o browser define multipart/form-data com o boundary certo
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body: formData, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new ApiError(res.status, data.erro || "Erro desconhecido");
  return data as T;
}

export const api = {
  get: <T,>(path: string, token?: string | null) => request<T>(path, { method: "GET" }, token),
  post: <T,>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, token),
  postForm: <T,>(path: string, formData: FormData, token?: string | null) =>
    requestForm<T>(path, formData, token),
  put: <T,>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }, token),
  patch: <T,>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token),
};
