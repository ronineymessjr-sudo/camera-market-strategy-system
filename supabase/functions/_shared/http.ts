import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export type JsonRecord = Record<string, unknown>;

export function json(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}

export async function readJson(req: Request): Promise<JsonRecord> {
  if (req.method !== "POST") {
    throw new Error("POST required");
  }
  return await req.json();
}

export async function supabaseFetch(path: string, init: RequestInit): Promise<unknown> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing Supabase service environment");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : text);
  }
  return data;
}
