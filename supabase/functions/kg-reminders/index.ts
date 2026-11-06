// KeepGoing — notificaciones push.
// Lo llama pg_cron cada minuto (cabecera x-cron-secret) y la app para enviar una notificación de prueba (token del usuario).
// verify_jwt = false porque la función hace su propia autenticación: secreto de cron o token de usuario validado con auth.getUser.
// v1.22: además de los recordatorios de cada hábito envía la energía del día, el resumen diario, los retos y proyectos que acaban
// y los eventos de la cola kg_notify (mensajes, grupos y cosas compartidas). Cada tipo se puede apagar en Ajustes (state.notif).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://izanhj.github.io/keepgoing/";
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// CORS: solo la app (y los servidores de pruebas locales) pueden llamar desde un navegador.
const ALLOWED_ORIGINS = new Set(["https://izanhj.github.io", "http://localhost:8765", "http://localhost:8766"]);
function corsFor(req: Request): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
const json = (req: Request, o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsFor(req), "Content-Type": "application/json" } });

let cfg: Record<string, string> | null = null;
async function config() {
  if (cfg) return cfg;
  const out: Record<string, string> = {};
  for (const k of ["vapid_public", "vapid_private", "cron_secret"]) {
    const { data, error } = await db.rpc("kg_get_config", { k });
    if (error) throw error;
    out[k] = data as string;
  }
  webpush.setVapidDetails(APP_URL, out.vapid_public, out.vapid_private);
  cfg = out;
  return out;
}

// Comparación en tiempo constante para el secreto del cron
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Fecha (YYYY-MM-DD), hora (HH:MM) y día de la semana (0 = lunes) en la zona horaria del usuario
function localNow(tz: string) {
  let zone = tz;
  try { new Intl.DateTimeFormat("en-CA", { timeZone: zone }); } catch { zone = "Europe/Madrid"; }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hh = g("hour") === "24" ? "00" : g("hour");
  return { day: `${g("year")}-${g("month")}-${g("day")}`, time: `${hh}:${g("minute")}`, wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(g("weekday")) };
}
const addDays = (k: string, n: number) => { const [y, m, d] = k.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const minutesBetween = (a: string, b: string) => { const [h1, m1] = a.split(":").map(Number), [h2, m2] = b.split(":").map(Number); return h2 * 60 + m2 - (h1 * 60 + m1); };
// ventana de 10 minutos tras la hora elegida, por si el cron se retrasa
const inWindow = (at: unknown, now: string) => typeof at === "string" && /^\d{2}:\d{2}$/.test(at) && (() => { const d = minutesBetween(at, now); return d >= 0 && d <= 10; })();

// Lo mismo que NOTIF0 en js/app.js
const NOTIF0 = { rate: true, rateAt: "22:00", energy: false, energyAt: "21:00", summary: true, summaryAt: "09:00", challenge: true, share: true, group: true, message: true };

// ¿Toca hoy y aún no está hecho? (misma lógica que la app, simplificada)
// deno-lint-ignore no-explicit-any
function isDueAndPending(h: any, d: any, day: string, wd: number) {
  if (h.archived || h.kind === "quit") return false;
  if ((d.vacations || []).some((v: { from: string; to: string }) => day >= v.from && day <= v.to)) return false;
  if (d.rest?.[h.id]?.[day] || d.shields?.[h.id]?.[day]) return false;
  const L = d.logs?.[h.id] || {};
  if (!h.freq || h.freq === "daily") {
    if (Array.isArray(h.days) && h.days.length < 7 && !h.days.includes(wd)) return false;
    return (L[day] || 0) < (h.target || 1);
  }
  let sum = 0;
  if (h.freq === "weekly") { const ws = addDays(day, -wd); for (let i = 0; i < 7; i++) sum += L[addDays(ws, i)] || 0; }
  else { const mk = day.slice(0, 7); for (const k in L) if (k.startsWith(mk)) sum += L[k]; }
  return sum < (h.target || 1);
}
// deno-lint-ignore no-explicit-any
const projectDone = (p: any) => !!(p.archived || p.goal?.achieved || (p.goal?.type === "list" && (p.goal.items || []).length && p.goal.items.every((i: { done: boolean }) => i.done)));

// Textos de las notificaciones
const TX = {
  es: {
    habit: "Es la hora de tu hábito. ¡Sigue así!", test: "Las notificaciones funcionan 🎉",
    rateT: "¿Qué tal ha ido tu día?", rateB: "Toca para ponerle nota con la corona. Solo te lleva un segundo.",
    sumT: (n: number) => n === 1 ? "Te queda 1 hábito hoy" : `Te quedan ${n} hábitos hoy`,
    chT: (name: string) => `🏁 ${name}`, chB: (n: number) => n === 1 ? "¡Último día! Mañana acaba." : `Quedan ${n} días para que acabe.`,
    prB: (n: number) => n === 1 ? "Mañana es la fecha límite del proyecto." : `Quedan ${n} días para la fecha límite del proyecto.`,
    msgN: (n: number) => `${n} mensajes nuevos`, photo: "📷 Foto", audio: "🎤 Audio", sticker: "Sticker", file: "📄 Archivo", event: (s: string) => `Evento: ${s}`, invite: "Invitación", shareMsg: "Ha compartido algo",
    shareT: "Te han compartido algo",
    share: (who: string, sub: string, name: string) => `${who || "Alguien"} te ha compartido ${({ habit: "el hábito", project: "el proyecto", ledger: "una libreta", proj: "la proyección", cal: "su calendario" } as Record<string, string>)[sub] || "algo"}${name ? ` «${name}»` : ""}`,
    groupT: "Nuevo grupo", group: (who: string, name: string) => `${who || "Alguien"} te ha añadido a «${name}»`,
  },
  en: {
    habit: "It's time for your habit. Keep going!", test: "Notifications are working 🎉",
    rateT: "How was your day?", rateB: "Tap to rate it with the crown. It only takes a second.",
    sumT: (n: number) => n === 1 ? "1 habit left today" : `${n} habits left today`,
    chT: (name: string) => `🏁 ${name}`, chB: (n: number) => n === 1 ? "Last day! It ends tomorrow." : `${n} days left until it ends.`,
    prB: (n: number) => n === 1 ? "The project's deadline is tomorrow." : `${n} days left until the project's deadline.`,
    msgN: (n: number) => `${n} new messages`, photo: "📷 Photo", audio: "🎤 Voice note", sticker: "Sticker", file: "📄 File", event: (s: string) => `Event: ${s}`, invite: "Invite", shareMsg: "Shared something",
    shareT: "Something was shared with you",
    share: (who: string, sub: string, name: string) => `${who || "Someone"} shared ${({ habit: "the habit", project: "the project", ledger: "a ledger", proj: "the projection", cal: "their calendar" } as Record<string, string>)[sub] || "something"}${name ? ` “${name}”` : ""} with you`,
    groupT: "New group", group: (who: string, name: string) => `${who || "Someone"} added you to “${name}”`,
  },
};

// deno-lint-ignore no-explicit-any
async function sendAll(list: any[], payload: Record<string, unknown>) {
  let n = 0;
  for (const s of list) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
      n++;
    } catch (e) {
      // deno-lint-ignore no-explicit-any
      const code = (e as any)?.statusCode;
      if (code === 404 || code === 410) await db.from("kg_push").delete().eq("endpoint", s.endpoint);
    }
  }
  return n;
}
// Una sola vez al día por clave (kg_push_log: clave única usuario + id + día)
async function once(uid: string, key: string, day: string) {
  const { error } = await db.from("kg_push_log").insert({ user_id: uid, habit_id: key, day });
  return !error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);
  try {
    const c = await config();
    const body = await req.json().catch(() => ({}));

    // Notificación de prueba pedida desde la app (requiere sesión)
    if (body && body.test === true) {
      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (!token) return json(req, { error: "unauthorized" }, 401);
      const { data: u, error } = await db.auth.getUser(token);
      if (error || !u?.user) return json(req, { error: "unauthorized" }, 401);

      // Rate limiting: máximo 5 pruebas cada 10 minutos por usuario (tabla kg_rate)
      const uid = u.user.id;
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await db.from("kg_rate").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("bucket", "push_test").gt("at", since);
      if ((count ?? 0) >= 5) return json(req, { error: "slow down" }, 429);
      await db.from("kg_rate").insert({ user_id: uid, bucket: "push_test" });

      const { data: subs } = await db.from("kg_push").select("*").eq("user_id", uid);
      const L = (subs?.[0]?.lang || "es") === "en" ? TX.en : TX.es;
      const sent = await sendAll(subs || [], { title: "KeepGoing", body: L.test, url: APP_URL });
      return json(req, { sent, devices: subs?.length || 0 });
    }

    if (!safeEqual(req.headers.get("x-cron-secret") || "", c.cron_secret || "")) return json(req, { error: "forbidden" }, 403);

    const { data: subs } = await db.from("kg_push").select("*");
    // deno-lint-ignore no-explicit-any
    const byUser = new Map<string, any[]>();
    for (const s of subs || []) { if (!byUser.has(s.user_id)) byUser.set(s.user_id, []); byUser.get(s.user_id)!.push(s); }
    // deno-lint-ignore no-explicit-any
    const states = new Map<string, any>();
    let sent = 0;

    // 1) Avisos con hora: hábitos, energía, resumen diario y retos/proyectos que acaban
    for (const [uid, list] of byUser) {
      const { data: row } = await db.from("kg_state").select("data").eq("user_id", uid).maybeSingle();
      const d = row?.data; if (!d) continue;
      states.set(uid, d);
      const { day, time, wd } = localNow(list[0].tz || "Europe/Madrid");
      const L = (d.lang || list[0].lang) === "en" ? TX.en : TX.es;
      // Sin state.notif (la app aún no está en la v1.22) solo van los recordatorios de cada hábito, como antes
      const N = d.notif && typeof d.notif === "object" ? { ...NOTIF0, ...d.notif } : { ...NOTIF0, rate: false, energy: false, summary: false, challenge: false };
      for (const h of d.habits || []) {
        const r = h.reminder;
        if (!r || !r.on || !inWindow(r.time, time)) continue;
        if (!isDueAndPending(h, d, day, wd)) continue;
        if (!(await once(uid, String(h.id), day))) continue; // ya se avisó hoy
        sent += await sendAll(list, { title: `${String(h.icon || "⏰").slice(0, 8)} ${String(h.name || "").slice(0, 80)}`, body: L.habit, url: APP_URL, tag: String(h.id) });
      }
      // v1.32: la energía se quitó; a la hora elegida (22:00 por defecto) se avisa de valorar el día y el aviso abre la corona
      if (N.rate && inWindow(N.rateAt, time) && !(d.dayRate && d.dayRate[day]) && await once(uid, "kg:rate", day))
        sent += await sendAll(list, { title: L.rateT, body: L.rateB, url: `${APP_URL}?rate=${day}`, tag: "kg-rate" });
      if (N.summary && inWindow(N.summaryAt, time)) {
        const pend = (d.habits || []).filter((h: { archived?: boolean }) => !h.archived && isDueAndPending(h, d, day, wd));
        if (pend.length && await once(uid, "kg:summary", day))
          sent += await sendAll(list, { title: L.sumT(pend.length), body: pend.slice(0, 6).map((h: { icon?: string; name?: string }) => `${String(h.icon || "").slice(0, 8)} ${String(h.name || "").slice(0, 40)}`.trim()).join(" · ") + (pend.length > 6 ? " …" : ""), url: APP_URL, tag: "kg-summary" });
      }
      if (N.challenge && inWindow(N.summaryAt, time)) {
        for (const h of d.habits || []) {
          const ch = h.challenge;
          if (h.archived || !ch || ch.done || typeof ch.start !== "string" || !(ch.days > 0)) continue;
          const left = daysBetween(day, addDays(ch.start, ch.days - 1));
          if ((left === 3 || left === 1) && await once(uid, `kg:ch:${h.id}:${left}`, day))
            sent += await sendAll(list, { title: L.chT(String(h.name || "").slice(0, 80)), body: L.chB(left), url: APP_URL, tag: `kg-ch-${h.id}` });
        }
        for (const p of d.projects || []) {
          if (!p || typeof p.deadline !== "string" || projectDone(p)) continue;
          const left = daysBetween(day, p.deadline);
          if ((left === 3 || left === 1) && await once(uid, `kg:pr:${p.id}:${left}`, day))
            sent += await sendAll(list, { title: `${String(p.icon || "🎯").slice(0, 8)} ${String(p.name || "").slice(0, 80)}`, body: L.prB(left), url: APP_URL, tag: `kg-pr-${p.id}` });
        }
      }
    }

    // 2) Eventos de la cola: mensajes (agrupados por chat), grupos y cosas compartidas
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: queue } = await db.from("kg_notify").select("*").eq("sent", false).gt("created_at", since).order("id").limit(1000);
    if (queue && queue.length) {
      // deno-lint-ignore no-explicit-any
      const byU = new Map<string, any[]>();
      for (const q of queue) { if (!byU.has(q.user_id)) byU.set(q.user_id, []); byU.get(q.user_id)!.push(q); }
      for (const [uid, items] of byU) {
        const list = byUser.get(uid);
        if (list && list.length) {
          let d = states.get(uid);
          if (d === undefined) { const { data: row } = await db.from("kg_state").select("data").eq("user_id", uid).maybeSingle(); d = row?.data || {}; }
          const L = ((d && d.lang) || list[0].lang) === "en" ? TX.en : TX.es;
          const N = d && d.notif && typeof d.notif === "object" ? { ...NOTIF0, ...d.notif } : { share: false, group: false, message: false };
          // deno-lint-ignore no-explicit-any
          const chats = new Map<string, any[]>();
          for (const q of items) {
            if (q.kind === "message") { if (!N.message) continue; const k = String(q.group_id); if (!chats.has(k)) chats.set(k, []); chats.get(k)!.push(q); }
            else if (q.kind === "group" && N.group) sent += await sendAll(list, { title: L.groupT, body: L.group(q.actor, q.title), url: APP_URL, tag: `kg-g-${q.group_id}` });
            else if (q.kind === "share" && N.share) sent += await sendAll(list, { title: L.shareT, body: L.share(q.actor, q.sub, q.body || q.title), url: APP_URL, tag: `kg-s-${q.id}` });
          }
          for (const [gid, msgs] of chats) {
            const last = msgs[msgs.length - 1];
            const prev = (m: { sub: string; body: string }) => m.sub === "text" ? m.body : m.sub === "photo" ? L.photo : m.sub === "audio" ? L.audio : m.sub === "sticker" ? L.sticker : m.sub === "file" ? L.file : m.sub === "event" ? L.event(m.body) : m.sub === "invite" ? L.invite : L.shareMsg;
            const title = last.title || last.actor || "KeepGoing";
            const text = msgs.length > 1 ? L.msgN(msgs.length) : (last.title ? `${last.actor}: ${prev(last)}` : prev(last));
            sent += await sendAll(list, { title: String(title).slice(0, 80), body: String(text).slice(0, 160), url: APP_URL, tag: `kg-m-${gid}` });
          }
        }
        await db.from("kg_notify").update({ sent: true }).in("id", items.map((q) => q.id));
      }
    }
    // Limpieza: lo enviado o caducado hace más de 7 días
    if (new Date().getUTCMinutes() === 0) await db.from("kg_notify").delete().lt("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());

    return json(req, { ok: true, sent });
  } catch (e) {
    console.error("kg-reminders error", e); // el detalle queda en los logs, no en la respuesta
    return json(req, { error: "internal error" }, 500);
  }
});
