// Supabase Edge Function: leilao-ia
// Assistente do comprador de leilão. Usa os dados do usuário + Tabela FIPE + pesquisa de preço na web.
// Secrets (Supabase > Edge Functions > Secrets):
//   ANTHROPIC_API_KEY   chave da API da Anthropic
//   ANTHROPIC_MODEL     (opcional) confira o nome atual do modelo na documentação da Anthropic
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const FIPE = "https://fipe.parallelum.com.br/api/v2";

const SISTEMA = `Você é o assistente de um comprador de veículos em leilão que revende os lotes.
Responda em português do Brasil, direto e curto.
- Para falar dos lotes, custos e lucros do usuário, use SOMENTE os dados de "contexto"; cite números e nomes de lote.
- Para preço de referência de um veículo, use a ferramenta consultar_fipe. Para preço de mercado (anúncios, revenda, peças, guincho, funilaria), use a pesquisa na web e diga de onde veio e a data.
- A FIPE é referência, não garantia: veículo de leilão, recuperado ou com sinistro costuma vender abaixo dela. Diga isso quando comparar.
- Nunca invente preço. Se a consulta falhar, diga que falhou.
- Em decisão de lance, mostre a conta: lance, comissão, custos, revenda, margem e lance máximo.
- Lembre de conferir no edital débitos, documentação e condição antes de dar o lance.`;

const FERR_FIPE = {
  name: "consultar_fipe",
  description: "Consulta o preço médio na Tabela FIPE de um veículo (marca, modelo e ano).",
  input_schema: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: ["cars", "motorcycles", "trucks"], description: "padrão: cars" },
      marca: { type: "string", description: "Ex.: Chevrolet" },
      modelo: { type: "string", description: "Ex.: Onix 1.0 LT" },
      ano: { type: "integer", description: "Ano-modelo, ex.: 2018" },
    },
    required: ["marca", "modelo", "ano"],
  },
};
const FERR_WEB = { type: "web_search_20250305", name: "web_search", max_uses: 4 };

const norm = (s: string) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

async function fj(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error("FIPE respondeu " + r.status);
  return r.json();
}

async function consultarFipe(a: any): Promise<string> {
  try {
    const tipo = ["cars", "motorcycles", "trucks"].includes(a.tipo) ? a.tipo : "cars";
    const marcas = await fj(`${FIPE}/${tipo}/brands`);
    const m = marcas.find((x: any) => norm(x.name) === norm(a.marca)) ?? marcas.find((x: any) => norm(x.name).includes(norm(a.marca)));
    if (!m) return "Marca não encontrada na FIPE: " + a.marca;
    const modelos = await fj(`${FIPE}/${tipo}/brands/${m.code}/models`);
    const q = norm(a.modelo);
    let cand = modelos.filter((x: any) => norm(x.name) === q);
    if (!cand.length) cand = modelos.filter((x: any) => q.split(/\s+/).every((p) => norm(x.name).includes(p)));
    if (!cand.length) return "Modelo não encontrado. Tente um nome mais curto.";
    if (cand.length > 1) {
      return "Vários modelos combinam. Chame de novo com um destes nomes exatos: " + cand.slice(0, 15).map((x: any) => x.name).join(" | ");
    }
    const anos = await fj(`${FIPE}/${tipo}/brands/${m.code}/models/${cand[0].code}/years`);
    const y = anos.find((x: any) => String(x.name).startsWith(String(a.ano)));
    if (!y) return "Ano não disponível. Anos existentes: " + anos.map((x: any) => x.name).join(", ");
    const p = await fj(`${FIPE}/${tipo}/brands/${m.code}/models/${cand[0].code}/years/${y.code}`);
    return JSON.stringify({ marca: p.brand, modelo: p.model, ano: p.modelYear, combustivel: p.fuel, preco: p.price, codigoFipe: p.codeFipe, mesReferencia: p.referenceMonth });
  } catch (e) {
    return "Falha ao consultar a FIPE: " + String((e as Error).message ?? e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ erro: "não autorizado" }, 401);

    const { pergunta, historico, contexto } = await req.json();
    if (!pergunta || typeof pergunta !== "string") return json({ erro: "pergunta vazia" }, 400);
    const chave = Deno.env.get("ANTHROPIC_API_KEY");
    if (!chave) return json({ erro: "ANTHROPIC_API_KEY não configurada" }, 500);

    const msgs: any[] = (Array.isArray(historico) ? historico : [])
      .filter((m: any) => m && typeof m.t === "string" && m.t)
      .slice(-12)
      .map((m: any) => ({ role: m.r === "user" ? "user" : "assistant", content: String(m.t).slice(0, 3000) }));
    while (msgs.length && msgs[msgs.length - 1].role === "user") msgs.pop();
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    msgs.push({
      role: "user",
      content: "DADOS DO USUÁRIO (JSON):\n" + JSON.stringify(contexto ?? {}).slice(0, 60000) + "\n\nPERGUNTA: " + pergunta,
    });

    const modelo = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5";
    let tools: any[] = [FERR_FIPE, FERR_WEB];
    let texto = "";

    for (let i = 0; i < 7; i++) {
      let r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: modelo, max_tokens: 1500, system: SISTEMA, tools, messages: msgs }),
      });
      let d = await r.json();
      if (!r.ok && tools.length > 1) {
        // pesquisa na web pode não estar habilitada na conta: segue só com a FIPE
        tools = [FERR_FIPE];
        r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: modelo, max_tokens: 1500, system: SISTEMA, tools, messages: msgs }),
        });
        d = await r.json();
      }
      if (!r.ok) return json({ erro: d?.error?.message ?? "falha na IA" }, 502);

      const blocos = d.content ?? [];
      texto = blocos.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
      msgs.push({ role: "assistant", content: blocos });

      const usos = blocos.filter((b: any) => b.type === "tool_use");
      if (d.stop_reason === "tool_use" && usos.length) {
        const res = [];
        for (const t of usos) {
          res.push({ type: "tool_result", tool_use_id: t.id, content: t.name === "consultar_fipe" ? await consultarFipe(t.input ?? {}) : "ferramenta desconhecida" });
        }
        msgs.push({ role: "user", content: res });
        continue;
      }
      if (d.stop_reason === "pause_turn") continue;
      break;
    }
    return json({ resposta: texto || "Não consegui montar a resposta." });
  } catch (e) {
    return json({ erro: String((e as Error).message ?? e) }, 500);
  }
});
