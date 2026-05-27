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

async function apiFetch(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError(
      0,
      "Nao foi possivel conectar a API. Verifique se o backend esta ativo e se o CORS permite esta origem.",
    );
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...authHeaders() },
    cache: "no-store",
  });

  return parseResponse<T>(response);
}

export async function apiGetArrayBuffer(path: string): Promise<ArrayBuffer> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/octet-stream", ...authHeaders() },
    cache: "no-store",
  });

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

  return response.arrayBuffer();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
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
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
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
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: { Accept: "application/json", ...authHeaders() },
  });

  await parseResponse<void>(response);
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", ...authHeaders() },
    body: formData,
  });

  return parseResponse<T>(response);
}

export async function apiPutUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { Accept: "application/json", ...authHeaders() },
    body: formData,
  });

  return parseResponse<T>(response);
}

export function apiUploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);

    const headers = authHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value === "string") {
        xhr.setRequestHeader(key, value);
      }
    });
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type")?.toLowerCase() ?? "";
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        try {
          if (!xhr.responseText) {
            resolve(undefined as T);
            return;
          }
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new ApiError(xhr.status, "Resposta invalida da API."));
        }
        return;
      }

      if (xhr.status === 401) {
        clearStoredToken();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("valida-ifc-auth-cleared"));
        }
      }

      if (contentType.includes("application/json")) {
        try {
          const payload = JSON.parse(xhr.responseText) as { detail?: string };
          reject(new ApiError(xhr.status, payload.detail ?? `API request failed: ${xhr.status}`));
          return;
        } catch {
          reject(new ApiError(xhr.status, `API request failed: ${xhr.status}`));
          return;
        }
      }

      reject(new ApiError(xhr.status, xhr.responseText || `API request failed: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new ApiError(0, "Falha de rede durante upload."));
    xhr.send(formData);
  });
}

export { API_BASE_URL };
