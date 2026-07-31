// Supabase Edge Function — cria preferência Checkout Pro (Mercado Pago)
// Secret obrigatório: MP_ACCESS_TOKEN
// Opcionais: TAXA_VALOR (default 1), TAXA_DESCRICAO, MP_SANDBOX ("true"|"false")

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
      return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado no servidor" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const nome = String(body?.payer?.name || body?.nome || "").slice(0, 120);
    const email = String(body?.payer?.email || body?.email || "").slice(0, 120);
    const externalRef = String(body?.external_reference || body?.txid || ("CAD-" + Date.now())).slice(0, 64);

    // Valor SEMPRE do servidor (cliente não define o preço)
    const valorEnv = Number(Deno.env.get("TAXA_VALOR") || "1");
    const valor = Number.isFinite(valorEnv) && valorEnv > 0 ? valorEnv : 1;
    const descricao = Deno.env.get("TAXA_DESCRICAO") || "Ativacao ALDINEICAR Profissional";

    const successUrl = String(body?.back_urls?.success || body?.success_url || "").slice(0, 500);
    const failureUrl = String(body?.back_urls?.failure || body?.failure_url || "").slice(0, 500);
    const pendingUrl = String(body?.back_urls?.pending || body?.pending_url || "").slice(0, 500);

    const preference: Record<string, unknown> = {
      items: [
        {
          id: "taxa-cadastro-aldineicar",
          title: descricao,
          description: "Taxa de ativacao da conta " + email,
          quantity: 1,
          currency_id: "BRL",
          unit_price: valor,
        },
      ],
      payer: { name: nome, email: email },
      external_reference: externalRef,
      statement_descriptor: "ALDINEICAR",
      metadata: { tipo: "taxa_cadastro", email, nome },
    };

    if (successUrl && failureUrl && pendingUrl) {
      preference.back_urls = {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      };
      preference.auto_return = "approved";
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(preference),
    });

    const json = await mpRes.json().catch(() => ({}));
    if (!mpRes.ok) {
      const msg = (json && (json.message || json.error)) || ("MP HTTP " + mpRes.status);
      return new Response(JSON.stringify({ error: msg, details: json }), {
        status: mpRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Devolve o que o front já espera (id, init_point, sandbox_init_point)
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
