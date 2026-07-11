import { json, readJson, supabaseFetch } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  try {
    const body = await readJson(req);
    const reportDate = body.report_date ?? new Date().toISOString().slice(0, 10);
    const data = await supabaseFetch("daily_reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: reportDate,
        title: body.title ?? `Camera Market Daily ${reportDate}`,
        summary: body.summary ?? "Generated via generate-daily-report edge function.",
        markdown_content: body.markdown_content ?? "# Camera Market Daily\n\nNo generated body was supplied.",
        chart_path: body.chart_path ?? null,
      }),
    });
    return json({ ok: true, data });
  } catch (error) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
