import { json, readJson, supabaseFetch } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  try {
    const body = await readJson(req);
    const productId = Number(body.product_id);
    if (!Number.isFinite(productId)) {
      return json({ error: "product_id is required" }, 400);
    }

    const price = Number(body.checkout_price ?? NaN);
    const triggerPrice = Number(body.trigger_price ?? NaN);
    const strongBuyPrice = Number(body.strong_buy_price ?? NaN);
    const verified = body.verification_status === "VERIFIED_CHECKOUT";
    const strong = verified && Number.isFinite(price) && Number.isFinite(strongBuyPrice) && price <= strongBuyPrice;
    const triggered = strong || (verified && Number.isFinite(price) && Number.isFinite(triggerPrice) && price <= triggerPrice);
    const status = strong ? "STRONG_BUY" : triggered ? "BUY" : verified ? "WAIT" : "UNVERIFIED";
    const reasons = verified ? [`checkout_price=${price}`] : ["Only VERIFIED_CHECKOUT can trigger a buy signal"];

    const data = await supabaseFetch("strategy_evaluations", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        strategy_id: body.strategy_id ?? null,
        price_record_id: body.price_record_id ?? null,
        status,
        is_buy_signal: triggered,
        score: triggered ? 90 : verified ? 35 : 5,
        reasons,
      }),
    });
    return json({ ok: true, status, is_buy_signal: triggered, data });
  } catch (error) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
