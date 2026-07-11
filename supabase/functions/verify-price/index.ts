import { json, readJson, supabaseFetch } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  try {
    const body = await readJson(req);
    const id = Number(body.price_record_id);
    const checkoutPrice = Number(body.checkout_price);
    if (!Number.isFinite(id) || !Number.isFinite(checkoutPrice) || checkoutPrice <= 0) {
      return json({ error: "price_record_id and positive checkout_price are required" }, 400);
    }

    const now = new Date();
    const validForHours = Number(body.valid_for_hours ?? 24);
    const validUntil = new Date(now.getTime() + validForHours * 60 * 60 * 1000);
    const data = await supabaseFetch(`price_records?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        checkout_price: checkoutPrice,
        shipping_fee: body.shipping_fee ?? null,
        coupon_text: body.coupon_text ?? null,
        currency: String(body.currency ?? "CNY").toUpperCase(),
        region: body.region ?? "CN",
        review_note: body.note ?? "Verified via verify-price edge function",
        verification_status: "VERIFIED_CHECKOUT",
        needs_review: false,
        verified_at: now.toISOString(),
        valid_until: validUntil.toISOString(),
        verified_by: body.verified_by ?? "ronin",
      }),
    });
    return json({ ok: true, data });
  } catch (error) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
