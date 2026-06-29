import { json, readJson, supabaseFetch } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  try {
    const body = await readJson(req);
    const productId = Number(body.product_id);
    if (!Number.isFinite(productId)) {
      return json({ error: "product_id is required" }, 400);
    }

    const data = await supabaseFetch("product_events", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        event_type: "refresh_requested",
        payload: {
          source: "refresh-product edge function",
          requested_by: body.requested_by ?? "ronin",
        },
      }),
    });
    return json({ ok: true, queued: true, data });
  } catch (error) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
