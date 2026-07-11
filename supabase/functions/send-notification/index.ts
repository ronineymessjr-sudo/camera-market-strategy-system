import { json, readJson, supabaseFetch } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  try {
    const body = await readJson(req);
    if (!body.title) {
      return json({ error: "title is required" }, 400);
    }

    const notification = await supabaseFetch("notifications", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id ?? null,
        signal_id: body.signal_id ?? null,
        type: body.type ?? "SYSTEM",
        title: body.title,
        body: body.body ?? null,
      }),
    });
    return json({ ok: true, notification });
  } catch (error) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
