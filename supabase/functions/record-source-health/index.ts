import { json, readJson, supabaseFetch } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  try {
    const body = await readJson(req);
    if (!body.provider || !body.status) {
      return json({ error: "provider and status are required" }, 400);
    }

    const data = await supabaseFetch("source_health_history", {
      method: "POST",
      body: JSON.stringify({
        provider: body.provider,
        status: body.status,
        mode: body.mode ?? null,
        latency_ms: body.latency_ms ?? null,
        details: body.details ?? {},
      }),
    });
    return json({ ok: true, data });
  } catch (error) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
