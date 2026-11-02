// Supabase Edge Function: leilao-ia
// Recebe a pergunta do usuário + os dados dele (lotes, custos, vendas) e devolve a resposta da IA.
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   ANTHROPIC_API_KEY   sua chave da API da Anthropic
//   ANTHROPIC_MODEL     (opcional) nome do modelo; confira o nome atual na documentação da Anthropic
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SISTEMA = `Você é o assistente de um comprador de veículos em leilão que revende os lotes.
Responda sempre em português do Brasil, de forma direta e curta.
Use SOMENTE os dados enviados em "contexto" para falar dos lotes, custos e lucros do usuário; cite números e nomes de lote.
Se o dado não existir, diga que não está registrado e o que o usuário deve preencher.
Não invente preços de mercado, tabela FIPE nem valores de débitos. Em perguntas sobre decisão de lance, mostre a conta (lance, comissão, custos, revenda, margem).
Lembre, quando for relevante, de conferir no edital débitos, documentação e condição do veículo antes de dar o lance.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    // só usuários logados
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ erro: "não autorizado" }, 401);

    const { pergunta, historico, contexto } = await req.json();
    if (!pergunta || typeof pergunta !== "string") return json({ erro: "pergunta vazia" }, 400);

    const chave = Deno.env.get("ANTHROPIC_API_KEY");
    if (!chave) return json({ erro: "ANTHROPIC_API_KEY não configurada" }, 500);

    const msgs = (Array.isArray(historico) ? historico : [])
      .filter((m: any) => m && typeof m.t === "string" && m.t !== "…")
      .slice(-8)
      .map((m: any) => ({ role: m.r === "user" ? "user" : "assistant", content: m.t }));
    // a última mensagem do histórico já é a pergunta atual
    while (msgs.length && msgs[msgs.length - 1].role === "user") msgs.pop();
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    msgs.push({
      role: "user",
      content: "DADOS DO USUÁRIO (JSON):\n" + JSON.stringify(contexto ?? {}).slice(0, 60000) + "\n\nPERGUNTA: " + pergunta,
    });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5",
        max_tokens: 900,
        system: SISTEMA,
        messages: msgs,
      }),
    });
    const d = await r.json();
    if (!r.ok) return json({ erro: d?.error?.message ?? "falha na IA" }, 502);
    const resposta = (d.content ?? []).map((b: any) => b.text ?? "").join("").trim();
    return json({ resposta });
  } catch (e) {
    return json({ erro: String(e?.message ?? e) }, 500);
  }
});
