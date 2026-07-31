// Supabase Edge Function — consulta status de pagamento MP
// Secret: MP_ACCESS_TOKEN
// Body JSON: { payment_id?: string, external_reference?: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const token = (Deno.env.get("MP_ACCESS_TOKEN") || "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.payment_id || body?.id || "").trim();
    const externalRef = String(body?.external_reference || body?.txid || "").trim();

    if (paymentId) {
      const res = await fetch(
        "https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId),
        { headers: { Authorization: "Bearer " + token } },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return new Response(JSON.stringify({ error: json.message || "pagamento nao encontrado" }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(json), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (externalRef) {
      const url =
        "https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=" +
        encodeURIComponent(externalRef);
      const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "busca falhou" }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const results = Array.isArray(json?.results) ? json.results : [];
      const approved = results.find((p: { status?: string }) => p && p.status === "approved");
      const chosen = approved || results[0] || null;
      return new Response(JSON.stringify(chosen || { status: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Informe payment_id ou external_reference" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
