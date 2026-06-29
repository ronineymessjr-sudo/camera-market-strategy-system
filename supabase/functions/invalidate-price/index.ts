import { json, readJson, supabaseFetch } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  try {
    const body = await readJson(req);
    const id = Number(body.price_record_id);
    if (!Number.isFinite(id)) {
      return json({ error: "price_record_id is required" }, 400);
    }

    const data = await supabaseFetch(`price_records?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        verification_status: "INVALID",
        needs_review: false,
        checkout_price: null,
        verified_at: null,
        valid_until: null,
        verified_by: null,
        review_note: body.note ?? "Invalidated via invalidate-price edge function",
      }),
    });
    return json({ ok: true, data });
  } catch (error) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
