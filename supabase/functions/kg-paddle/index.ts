// KeepGoing — pagos con Paddle (Merchant of Record).
// POST (webhook de Paddle, firmado con Paddle-Signature):
//   · transaction.completed con custom_data.user_id (compra desde la app) → esa cuenta pasa a Usuario KeepGoing.
//   · transaction.completed sin user_id (compra en la web) → se crea una key XXXX-XXXX-XXXX-XXXX de un solo uso.
//   · adjustment.created / adjustment.updated con un reembolso aprobado → se quita el plan o se anula la key.
// GET ?txn=<id> (página de la tienda tras pagar) → devuelve la key de esa compra. La key no se guarda en claro:
//   se calcula con un HMAC del id de la transacción y un secreto (KG_KEY_SECRET); en la base solo está su hash.
// verify_jwt = false: Paddle no manda token de Supabase; la firma del webhook es la autenticación.
// Secretos: PADDLE_WEBHOOK_SECRET (del destino de notificaciones de Paddle) y KG_KEY_SECRET (cualquier texto largo aleatorio).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? "";
const KEY_SECRET = Deno.env.get("KG_KEY_SECRET") ?? "";
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ALLOWED_ORIGINS = new Set(["https://izanhj.github.io", "http://localhost:8765"]);

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function hmac(secret: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
// Key de una transacción: 16 caracteres del alfabeto sin 0/O/1/I, en grupos de 4
async function keyFor(txn: string) {
  const b = new Uint8Array(await hmac(KEY_SECRET, "kg-key:" + txn));
  let s = ""; for (let i = 0; i < 16; i++) s += ALPHA[b[i] % 32];
  return s.match(/.{4}/g)!.join("-");
}
const keyHash = async (key: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(key.replace(/[^A-Z0-9]/g, ""))));

// Firma de Paddle: "ts=…;h1=…", h1 = HMAC-SHA256(secreto, ts + ":" + cuerpo). Se rechaza si tiene más de 5 minutos.
async function verify(req: Request, body: string) {
  const sig = req.headers.get("paddle-signature") ?? "";
  const parts = Object.fromEntries(sig.split(";").map((p) => p.split("=") as [string, string]));
  if (!parts.ts || !parts.h1 || !WEBHOOK_SECRET) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.ts)) > 300) return false;
  const want = hex(await hmac(WEBHOOK_SECRET, `${parts.ts}:${body}`));
  if (want.length !== parts.h1.length) return false;
  let d = 0; for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ parts.h1.charCodeAt(i);
  return d === 0;
}

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin");
  return { "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Vary": "Origin", ...(o && ALLOWED_ORIGINS.has(o) ? { "Access-Control-Allow-Origin": o } : {}) };
}
const json = (req: Request, o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function completed(t: any) {
  const txn = String(t.id || "");
  const uid = t.custom_data && typeof t.custom_data.user_id === "string" && UUID.test(t.custom_data.user_id) ? t.custom_data.user_id : null;
  if (uid) {
    const { error } = await db.from("kg_plans").upsert({ user_id: uid, source: "paddle", term: "forever", until: null, txn, note: "Paddle " + txn, updated_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }
  const key = await keyFor(txn);
  const { error } = await db.from("kg_keys").upsert({ code_hash: await keyHash(key), hint: key.slice(-4), term: "forever", source: "paddle", txn, note: "Paddle " + txn }, { onConflict: "txn", ignoreDuplicates: true });
  if (error) throw error;
}
async function refunded(a: any) {
  if (a.action !== "refund" || a.status !== "approved") return;
  const txn = String(a.transaction_id || "");
  await db.from("kg_plans").delete().eq("txn", txn).eq("source", "paddle");
  await db.from("kg_keys").update({ revoked: true }).eq("txn", txn);
  // Si la key ya se canjeó, se quita también el plan que dio
  const { data } = await db.from("kg_keys").select("redeemed_by").eq("txn", txn).maybeSingle();
  if (data && data.redeemed_by) await db.from("kg_plans").delete().eq("user_id", data.redeemed_by).eq("source", "key");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method === "GET") {
    const txn = new URL(req.url).searchParams.get("txn") ?? "";
    if (!/^txn_[a-z0-9]{10,40}$/.test(txn) || !KEY_SECRET) return json(req, { error: "bad" }, 400);
    const { data } = await db.from("kg_keys").select("revoked").eq("txn", txn).maybeSingle();
    if (!data) return json(req, { pending: true }, 404);   // el webhook aún no ha llegado: la tienda vuelve a preguntar
    if (data.revoked) return json(req, { error: "revoked" }, 410);
    return json(req, { key: await keyFor(txn) });
  }
  if (req.method !== "POST") return json(req, { error: "method" }, 405);
  const body = await req.text();
  if (!(await verify(req, body))) return json(req, { error: "signature" }, 401);
  let ev: any; try { ev = JSON.parse(body); } catch { return json(req, { error: "json" }, 400); }
  try {
    if (ev.event_type === "transaction.completed") await completed(ev.data || {});
    else if (ev.event_type === "adjustment.created" || ev.event_type === "adjustment.updated") await refunded(ev.data || {});
  } catch (e) {
    console.error(e);
    return json(req, { error: "db" }, 500); // Paddle reintenta
  }
  return json(req, { ok: true });
});
