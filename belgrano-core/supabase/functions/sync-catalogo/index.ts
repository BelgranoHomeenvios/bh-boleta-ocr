// ============================================================
//  Edge Function · sync-catalogo   (Tienda Nube → Belgrano Core)
//
//  Adaptada de la que ya funciona en Belgrano Cost. Mismo mecanismo —
//  paginar la API de Tienda Nube y hacer upsert— pero escribiendo en
//  staging.tn_catalogo de Core en vez de rentabilidad de Cost.
//
//  Por qué esto y no una migración por CSV: Tienda Nube es la fuente del
//  catálogo, no Belgrano Cost. Sincronizar contra la fuente permite volver
//  a correrlo cuando cambie el catálogo, en vez de una foto de una sola vez.
//
//  Secrets a cargar en Belgrano Soft (Edge Functions → Secrets):
//    TN_TOKEN      el mismo que ya usa Belgrano Cost
//    TN_STORE_ID   238796
//
//  Invocar:  POST  { "catalogo": true }
//            Sin body solo trae precios, que es más rápido.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Tienda Nube devuelve los textos como {es:"...", pt:"..."}.
const txt = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Record<string, string>;
    return o.es ?? Object.values(o)[0] ?? null;
  }
  return String(v);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const conCatalogo = body?.catalogo === true;

    const TN_TOKEN = Deno.env.get("TN_TOKEN");
    const TN_STORE_ID = Deno.env.get("TN_STORE_ID") ?? "238796";
    if (!TN_TOKEN) throw new Error("Falta el secret TN_TOKEN en la función.");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Tienda Nube usa el header 'Authentication', no 'Authorization',
    // y exige User-Agent. Los dos detalles vienen de la función que ya anda.
    const tnHeaders = {
      "Authentication": `bearer ${TN_TOKEN}`,
      "User-Agent": "Belgrano Core (singer.brian1@gmail.com)",
      "Content-Type": "application/json",
    };

    const ahora = new Date().toISOString();
    const catalogo: Record<string, unknown>[] = [];
    const vistos = new Set<number>();

    let page = 1;
    for (; page <= 500; page++) {
      const url = `https://api.tiendanube.com/v1/${TN_STORE_ID}/products` +
        `?per_page=200&page=${page}&fields=id,name,published,categories,attributes,variants`;
      const res = await fetch(url, { headers: tnHeaders });

      if (res.status === 404 && page > 1) break;
      if (!res.ok) {
        const cuerpo = await res.text();
        throw new Error(`Tienda Nube respondió ${res.status} en la página ${page}: ${cuerpo.slice(0, 300)}`);
      }

      const productos = await res.json();
      if (!Array.isArray(productos) || productos.length === 0) break;

      for (const p of productos) {
        const nombre = txt(p.name);
        const cat = Array.isArray(p.categories) && p.categories.length ? p.categories[0] : null;
        const atributos = Array.isArray(p.attributes) ? p.attributes.map(txt) : [];

        for (const v of (p.variants ?? [])) {
          if (v?.id == null || vistos.has(v.id)) continue;
          vistos.add(v.id);

          catalogo.push({
            variant_id: v.id,
            product_id: p.id,
            nombre,
            categoria: cat ? txt(cat.name) : null,
            categoria_id: cat?.id ?? null,
            atributos,
            valores: Array.isArray(v.values) ? v.values.map(txt) : [],
            sku: v.sku ?? null,
            precio: Number(v.price) || 0,
            publicado: p.published ?? null,
            actualizado: ahora,
          });
        }
      }

      if (productos.length < 200) break;
    }

    const db = createClient(SUPABASE_URL, SERVICE_KEY).schema("staging");

    for (let i = 0; i < catalogo.length; i += 500) {
      const { error } = await db
        .from("tn_catalogo")
        .upsert(catalogo.slice(i, i + 500), { onConflict: "variant_id" });
      if (error) throw error;
    }

    return json({ ok: true, variantes: catalogo.length, paginas: page });
  } catch (e) {
    console.error("sync-catalogo:", e);
    // Los errores de supabase-js no son instancias de Error: son objetos
    // {message, details, hint, code}. String() sobre eso da "[object
    // Object]", que no dice nada. Se serializa el objeto entero.
    const msg = e instanceof Error ? e.message
              : (e && typeof e === "object") ? JSON.stringify(e)
              : String(e);
    return json({ ok: false, error: msg });
  }
});
