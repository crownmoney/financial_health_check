import { cleanStep1, cleanStep2, step1Note, step1Props, step2Note, step2Props, signToken, verifyToken, todayAU, chatStep1, chatStep2 } from "../lib/hubspot.mjs";

const HS = "https://api.hubapi.com";
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function hs(token, method, path, body) {
  const r = await fetch(HS + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) { const e = new Error(`HubSpot ${method} ${path} -> ${r.status}: ${text.slice(0, 300)}`); e.status = r.status; throw e; }
  return text ? JSON.parse(text) : {};
}

// email -> contact -> most recent OPEN deal (fallback: most recent deal; else contact only)
async function findTarget(token, email) {
  const c = await hs(token, "POST", "/crm/v3/objects/contacts/search", { filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }], properties: ["email", "firstname", "lastname"], limit: 1 });
  const contactId = c.results?.[0]?.id;
  const cp = c.results?.[0]?.properties || {};
  const name = [cp.firstname, cp.lastname].filter(Boolean).join(" ");
  if (!contactId) return { contactId: null, dealId: null, name: "" };
  const assoc = await hs(token, "GET", `/crm/v4/objects/contacts/${contactId}/associations/deals`);
  const ids = (assoc.results || []).map(a => ({ id: String(a.toObjectId) }));
  if (!ids.length) return { contactId, dealId: null, name };
  const deals = await hs(token, "POST", "/crm/v3/objects/deals/batch/read", { inputs: ids.slice(0, 100), properties: ["createdate", "hs_is_closed"] });
  const list = (deals.results || []).sort((a, b) => new Date(b.properties.createdate) - new Date(a.properties.createdate));
  const open = list.filter(d => d.properties.hs_is_closed !== "true");
  return { contactId, dealId: (open[0] || list[0])?.id || null, name };
}

async function addNote(token, { dealId, contactId }, html) {
  const to = dealId ? { id: dealId, typeId: 214 } : { id: contactId, typeId: 202 }; // 214 note->deal, 202 note->contact
  return hs(token, "POST", "/crm/v3/objects/notes", {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: html },
    associations: [{ to: { id: to.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: to.typeId }] }],
  });
}

// One bad property (type mismatch) must not lose the rest: retry individually if the bulk PATCH fails.
async function patchDeal(token, dealId, props) {
  const clean = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== ""));
  try { await hs(token, "PATCH", `/crm/v3/objects/deals/${dealId}`, { properties: clean }); return []; }
  catch (e) {
    if (e.status !== 400) throw e;
    const failed = [];
    for (const [k, v] of Object.entries(clean)) { try { await hs(token, "PATCH", `/crm/v3/objects/deals/${dealId}`, { properties: { [k]: v } }); } catch (e2) { failed.push(k); console.error("property failed", k, e2.message); } }
    return failed;
  }
}

// Google Chat incoming webhook. Never throws: a Chat outage must not affect the user or the HubSpot sync.
async function notifyChat(message) {
  const url = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!url) { console.warn("GOOGLE_CHAT_WEBHOOK_URL not set; skipping Chat notification"); return; }
  try {
    if (new URL(url).hostname !== "chat.googleapis.com") throw new Error("unexpected webhook host");
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify(message), signal: AbortSignal.timeout(6000) });
    if (!r.ok) console.error("Chat webhook", r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.error("Chat webhook failed:", e.message); }
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const step = new URL(req.url).pathname.endsWith("step2") ? 2 : 1;
  const secret = process.env.HUBSPOT_ACCESS_TOKEN;
  let body; try { body = await req.json(); } catch { return json({ ok: false, error: "bad request" }, 400); }
  if (body?.["bot-field"]) return json({ ok: true }); // honeypot
  if (!secret) { console.error("HUBSPOT_ACCESS_TOKEN not set"); return json({ ok: false }, 500); }
  const when = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium", timeStyle: "short" }).format(new Date()) + " (AEST/AEDT)";
  const today = todayAU();

  if (step === 1) {
    const d = cleanStep1(body);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || Object.keys(d.answers).length !== 10) return json({ ok: false, error: "invalid" }, 400);
    let t = { contactId: null, dealId: null, name: "" }, hubspotOk = true;
    try {
      t = await findTarget(secret, d.email);
      if (t.dealId || t.contactId) {
        await addNote(secret, t, step1Note(d, when));
        if (t.dealId) { const failed = await patchDeal(secret, t.dealId, step1Props(d, today)); if (failed.length) console.error("step1 props failed:", failed.join(",")); }
      } else console.warn("step1: no HubSpot contact for submitted email");
    } catch (e) { console.error(e.message); hubspotOk = false; }
    await notifyChat(chatStep1(d, t.name, { matched: !!(t.contactId || t.dealId), dealId: t.dealId, hubspotOk }));
    // Same response whether or not a contact matched (don't reveal who is in the CRM).
    // Token also carries the email so step 2 can retry the lookup if HubSpot hiccuped here.
    return json({ ok: true, token: signToken({ d: t.dealId, c: t.contactId, n: t.name, e: d.email }, secret) });
  }
  const tok = verifyToken(body?.token, secret);
  if (!tok) return json({ ok: false, error: "expired" }, 401);
  const d = cleanStep2(body);
  if (!d.person1 || !d.income.p1_income) return json({ ok: false, error: "invalid" }, 400);
  let hubspotOk = true, tgt = { dealId: tok.d, contactId: tok.c, name: tok.n || "" };
  try {
    if (!tgt.dealId && !tgt.contactId && tok.e) tgt = await findTarget(secret, tok.e); // retry (step 1 may have failed or found nothing)
    if (tgt.dealId || tgt.contactId) {
      await addNote(secret, tgt, step2Note(d, when));
      if (tgt.dealId) { const failed = await patchDeal(secret, tgt.dealId, step2Props(d, today)); if (failed.length) console.error("step2 props failed:", failed.join(",")); }
    } else console.warn("step2: no HubSpot target for this email");
  } catch (e) { console.error(e.message); hubspotOk = false; }
  await notifyChat(chatStep2(d, tgt.name, { matched: !!(tgt.dealId || tgt.contactId), dealId: tgt.dealId, hubspotOk }));
  return hubspotOk ? json({ ok: true }) : json({ ok: false }, 502);
};
export const config = { path: ["/api/hubspot/step1", "/api/hubspot/step2"] };
