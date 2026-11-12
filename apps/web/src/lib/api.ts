const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("tapzen_token");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("INVALID_API_PATH");
  }

  const token = getToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      credentials: "omit"
    });
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new Error("NETWORK_REQUEST_FAILED");
  }

  const contentType = response.headers.get("content-type") || "";
  const data: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => ({ error: "INVALID_RESPONSE" }))
    : await response.text().catch(() => "");

  if (!response.ok) {
    const code = typeof data === "object" && data !== null && "error" in data && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : `HTTP_${response.status}`;

    if (response.status === 401 && typeof window !== "undefined" && token) {
      window.localStorage.removeItem("tapzen_token");
    }
    throw new Error(code);
  }

  return data as T;
}

export const apiBase = API;
