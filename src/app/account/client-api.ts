export async function accountRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method, cache: "no-store",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (response.ok && method !== "GET") window.dispatchEvent(new Event("fairy-account-change"));
  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "We couldn't update your account.");
  return payload.data as T;
}

