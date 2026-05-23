const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("valida-ifc-token");
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem("valida-ifc-token", token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem("valida-ifc-token");
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") {
      const detail =
        "detail" in payload && typeof payload.detail === "string" ? payload.detail : null;
      if (detail) {
        return detail;
      }
    }
  } else {
    const text = (await response.text().catch(() => "")).trim();
    if (text) {
      return text;
    }
  }
  return `API request failed: ${response.status}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 401) {
      clearStoredToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("valida-ifc-auth-cleared"));
      }
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...authHeaders() },
    cache: "no-store",
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  await parseResponse<void>(response);
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", ...authHeaders() },
    body: formData,
  });

  return parseResponse<T>(response);
}

export { API_BASE_URL };
