// Pure helpers (no I/O) so they can be unit-tested.
import crypto from "node:crypto";

export const FREQ_PER_YEAR = { Weekly: 52, Fortnightly: 26, Monthly: 12, Quarterly: 4, Yearly: 1, Annually: 1 };
export const hsFreq = f => (f === "Annually" ? "Yearly" : f);

export const QUESTIONS = [
  ["plan_written", "I have a written plan with my exact debt-free date.", "fhc_written_plan_with_debt_free_date"],
  ["know_interest", "I know exactly how much interest I'll hand the bank over my loan.", "fhc_know_interest_paid_to_bank"],
  ["debt_free_retire", "I'll be debt-free comfortably before I retire.", "fhc_debt_free_before_retirement"],
  ["buffer_3m", "I have 3+ months of expenses saved as a buffer.", "fhc_three_months_buffer"],
  ["loan_structure", "My loan is structured to pay down faster than a standard bank loan.", "fhc_loan_structured_to_pay_faster"],
  ["rates_2pct", "If rates rose 2%, I know the cost and my plan still holds.", "fhc_rates_rise_2pct_plan_holds"],
  ["tracking", "I track my money with real live data feeds and compare my bills every year.", "fhc_track_money_live_data_feeds"],
  ["partner_aligned", "My partner and I share one plan and the same debt-free goal.", "fhc_partner_same_plan_and_goal"],
  ["coaching", "I've had coaching built around my situation, not generic tips.", "fhc_coaching_built_around_me"],
  ["expert_review", "I review my strategy with an expert as life changes.", "fhc_expert_review_as_life_changes"],
];

// [formKey, label, amountProp|null, freqProp|null]  (null amountProp => note/Chat only)
export const INCOME = [
  ["p1_income", "Person 1 – net income", "net_income__1", "net_income_1_frequency"],
  ["p1_other", "Person 1 – other net income / bonus", "net_income_1_other", "net_income_1_other_frequency"],
  ["p2_income", "Person 2 – net income", "net_income__2", "net_income_2_frequency"],
  ["p2_other", "Person 2 – other net income / bonus", "net_income_2_other", "net_income_2_other_frequency"],
];
export const EXPENSES = [
  ["food", "Food", "food", "food_frequency"], ["fuel", "Fuel", "fuel", "fuel_frequency"],
  ["rates", "Rates", "rates", "rates_frequency"], ["gas", "Gas", "gas", "gas_frequency"],
  ["electricity", "Elec", "electricity", "electricity_frequency"], ["water", "Water", "water", "water_frequency"],
  ["car_insurance", "Car Ins", "car_insurance", "car_insurance_frequency"],
  ["house_insurance", "House Insur", "house_insurance", "house_insurance_frequency"],
  ["health_insurance", "Health Insurance", "health_insurance", "health_insurance_frequency"],
  ["medical", "Medical", "medical", "medical_cost_frequency"],
  ["life_insurance", "Life Insurance", "life_insurance", "life_insurance_frequency"],
  ["pet_insurance", "Pet Insurance", "pet_insurance", "pet_insurance_frequency_dropdown"], // HubSpot's own pet_insurance_frequency is a NUMBER field, so a new dropdown is needed
  ["income_protection", "Income Protection", "income_protection", "income_protection_frequency"],
  ["phone", "Phone", "phone", "phone_frequency"], ["internet", "Internet", "internet", "internet_frequency"],
  ["car_rego", "Car Rego", "car_rego", "car_rego_frequency"],
  ["car_maintenance", "Car Maintenance", "car_maintenance", "car_maintenance_frequency"],
  ["other_rego", "Boat/Jetski/Other Rego", "boatjetskiother_rego", "boatjetskiother_rego_frequency"],
  ["other_maintenance", "Other Maintenance", "other_maintenance", "other_maintenance_frequency"],
  ["pool_maintenance", "Pool Maint", "pool_maint", "pool_maintenance_frequency"],
  ["gym", "Gym", "gym", "gym_frequency"], ["subscriptions", "Subscriptions", "subscriptions", "subscriptions_frequency"],
  ["childcare", "Childcare", "childcare", "childcare_frequency"],
  ["kids_activities", "Kids Activities (netball...)", "kids_activities_netball", "kids_activities_netball_frequency"],
  ["kids_excursions", "Kids Excursions", "kids_excursions", "kids_excursions_frequency"],
  ["school", "Private School/Education", "private_schooleducation", "private_schooleducation_frequency"],
  ["rent", "Rent", "rent", "rent_frequency"], ["debt_repay", "Debt Repay", "debt_repay", "debt_repay_frequency"],
];

// Properties that must be created in HubSpot (deal, internal names below). Until one exists the writer skips it
// silently, so nothing fails and no half-data is written; it starts working as soon as the property is created.
export const PENDING_PROPS = [
  "fhc_written_plan_with_debt_free_date", "fhc_three_months_buffer", "fhc_coaching_built_around_me", "fhc_expert_review_as_life_changes",
  "fhc_know_interest_paid_to_bank", "fhc_debt_free_before_retirement", "fhc_loan_structured_to_pay_faster",
  "fhc_rates_rise_2pct_plan_holds", "fhc_track_money_live_data_feeds", "fhc_partner_same_plan_and_goal",
  "fhc_goal_not_on_track", "fhc_most_missing", "pet_insurance_frequency_dropdown",
];
export const DEPENDS_ON = { pet_insurance_frequency_dropdown: ["pet_insurance"] }; // amount is meaningless without its frequency
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const clip = (s, n) => String(s ?? "").trim().slice(0, n);
export const num = v => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : null; };
export const money = n => "$" + n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
export const monthly = (amt, freq) => (amt * (FREQ_PER_YEAR[freq] || 0)) / 12;
export const todayAU = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d); // YYYY-MM-DD

// ---- signed token: carries the matched deal/contact from step 1 to step 2, so the browser can't pick a deal ----
const key = secret => crypto.createHash("sha256").update("fhc-token:" + secret).digest();
export function signToken(payload, secret, ttlMs = 6 * 3600e3, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + ttlMs })).toString("base64url");
  return body + "." + crypto.createHmac("sha256", key(secret)).update(body).digest("base64url");
}
export function verifyToken(token, secret, now = Date.now()) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const want = crypto.createHmac("sha256", key(secret)).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.exp > now ? p : null; } catch { return null; }
}

// ---- branded note HTML (inline styles only: HubSpot strips <style> blocks and scripts from notes) ----
const C = { dark: "#250B40", light: "#E6DEEE", white: "#ffffff" };
const LOGO = "https://financial.crownmoney.com.au/assets/brand/logo-light.png";
const wrap = (title, subtitle, inner) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;border:1px solid ${C.light};border-radius:8px;overflow:hidden;color:${C.dark};">
<div style="background:${C.dark};padding:16px 20px;"><img src="${LOGO}" alt="Crown Money" height="34" style="display:block;margin-bottom:10px;height:34px;"><div style="color:${C.white};font-size:17px;font-weight:bold;">${esc(title)}</div><div style="color:${C.light};font-size:12px;margin-top:2px;">${esc(subtitle)}</div></div>
<div style="padding:16px 20px;background:${C.white};">${inner}</div></div>`;
const h = t => `<div style="background:${C.light};color:${C.dark};font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:6px 10px;margin:14px 0 0;border-radius:4px 4px 0 0;">${esc(t)}</div>`;
const table = (cols, rows, foot) => `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid ${C.light};">
<tr>${cols.map((c, i) => `<th style="text-align:${i ? "right" : "left"};padding:6px 10px;font-size:11px;color:${C.dark};border-bottom:1px solid ${C.light};">${esc(c)}</th>`).join("")}</tr>
${rows.map(r => `<tr>${r.map((c, i) => `<td style="text-align:${i ? "right" : "left"};padding:6px 10px;border-bottom:1px solid ${C.light};">${esc(c)}</td>`).join("")}</tr>`).join("")}
${foot ? `<tr>${foot.map((c, i) => `<td style="text-align:${i ? "right" : "left"};padding:8px 10px;font-weight:bold;background:${C.dark};color:${C.white};">${esc(c)}</td>`).join("")}</tr>` : ""}</table>`;

export function cleanStep1(b) {
  const answers = {};
  for (const [k] of QUESTIONS) { const v = b?.[k]; if (v === "Yes" || v === "No") answers[k] = v; }
  return { email: clip(b?.email, 254).toLowerCase(), goal: clip(b?.goal, 2000), missing: clip(b?.missing, 120), answers };
}
export function step1Note(d, when) {
  const rows = QUESTIONS.map(([k, q], i) => [`${i + 1}. ${q}`, d.answers[k] || "—"]);
  const inner = `<div style="font-size:13px;margin-bottom:4px;"><b>Email:</b> ${esc(d.email)}</div>${h("Your plan, money & support")}${table(["Question", "Answer"], rows)}
${h("What would you most like to achieve that you aren't on track for?")}<div style="border:1px solid ${C.light};padding:10px;font-size:13px;white-space:pre-wrap;">${esc(d.goal) || "—"}</div>
${h("What's most missing from the current approach?")}<div style="border:1px solid ${C.light};padding:10px;font-size:13px;">${esc(d.missing) || "—"}</div>`;
  return wrap("Financial Health Check – Page 1", `Completed ${when}`, inner);
}
export function step1Props(d, today) {
  const p = { financial_health_check_page_1: today, financial_health_check__number_: "1" };
  if (d.goal) p.fhc_goal_not_on_track = d.goal;
  if (d.missing) p.fhc_most_missing = d.missing;
  for (const [k, , prop] of QUESTIONS) if (prop && d.answers[k]) p[prop] = d.answers[k] === "Yes" ? "true" : "false";
  return p;
}

export function cleanStep2(b) {
  const line = k => { const a = num(b?.[k + "_amount"]); const f = hsFreq(String(b?.[k + "_freq"] || "")); return a && FREQ_PER_YEAR[f] ? { amount: a, freq: f } : null; };
  const income = {}, expenses = {};
  for (const [k] of INCOME) { const l = line(k); if (l) income[k] = l; }
  for (const [k] of EXPENSES) { const l = line(k); if (l) expenses[k] = l; }
  let custom = [];
  try { custom = JSON.parse(String(b?.custom_expenses || "[]")).slice(0, 10).map(x => ({ name: clip(String(x?.name ?? "").replace(/[<>]/g, ""), 80), amount: num(x?.amount), freq: hsFreq(String(x?.frequency || "")) })).filter(x => x.name && x.amount && FREQ_PER_YEAR[x.freq]); } catch {}
  return { email: clip(b?.email, 254).toLowerCase(), person1: clip(b?.person1_name, 100), person2: clip(b?.person2_name, 100), income, expenses, custom };
}
export function totals(d) {
  const inc = Object.values(d.income).reduce((s, l) => s + monthly(l.amount, l.freq), 0);
  const exp = Object.values(d.expenses).concat(d.custom.map(c => ({ amount: c.amount, freq: c.freq }))).reduce((s, l) => s + monthly(l.amount, l.freq), 0);
  return { inc, exp, surplus: inc - exp };
}
export function step2Note(d, when) {
  const t = totals(d);
  const incRows = INCOME.filter(([k]) => d.income[k]).map(([k, l]) => [l, money(d.income[k].amount), d.income[k].freq, money(monthly(d.income[k].amount, d.income[k].freq))]);
  const expRows = EXPENSES.filter(([k]) => d.expenses[k]).map(([k, l]) => [l, money(d.expenses[k].amount), d.expenses[k].freq, money(monthly(d.expenses[k].amount, d.expenses[k].freq))])
    .concat(d.custom.map(c => [c.name + " (custom)", money(c.amount), c.freq, money(monthly(c.amount, c.freq))]));
  const inner = `<div style="font-size:13px;"><b>Person 1:</b> ${esc(d.person1) || "—"} &nbsp; <b>Person 2:</b> ${esc(d.person2) || "—"}<br><b>Email entered:</b> ${esc(d.email)}</div>
${h("Net income")}${table(["Item", "Amount", "Frequency", "Per month"], incRows, ["Total monthly net income", "", "", money(t.inc)])}
${h("Expenses")}${expRows.length ? table(["Item", "Amount", "Frequency", "Per month"], expRows, ["Total monthly expenses (excl. mortgage)", "", "", money(t.exp)]) : '<div style="padding:10px;font-size:13px;border:1px solid ' + C.light + ';">No expenses entered.</div>'}
<div style="margin-top:14px;background:${C.light};padding:10px 12px;border-radius:4px;font-size:14px;"><b>Estimated monthly surplus:</b> ${t.surplus < 0 ? "-" : ""}${money(Math.abs(t.surplus))}</div>`;
  return wrap("Financial Health Check – Page 2: Income & Expenses", `Completed ${when}`, inner);
}
export function step2Props(d, today) {
  const p = { financial_health_check_date: today, financial_health_check_page_2_number: "1" };
  for (const [k, , a, f] of INCOME) if (d.income[k]) { p[a] = String(d.income[k].amount); p[f] = d.income[k].freq; }
  for (const [k, , a, f] of EXPENSES) {
    const l = d.expenses[k]; if (!l || !a || !f) continue;
    p[a] = String(l.amount); p[f] = l.freq;
  }
  d.custom.slice(0, 3).forEach((c, i) => { p[`additional_expense${i + 1}`] = String(c.amount); p[`additional_expense${i + 1}_frequency`] = c.freq; });
  if (d.custom.length) { p.other_expenses = "Yes"; p.other_expenses_text = d.custom.map(c => c.name).join("; "); }
  return p;
}

// ---- Google Chat (incoming webhook, plain text – mirrors the layout of the existing Zapier post) ----
const HS_PORTAL = "5290127";
export const dealUrl = id => `https://app.hubspot.com/contacts/${HS_PORTAL}/record/0-3/${id}`;
// Chat text treats <users/all> etc. as mentions, so strip angle brackets from anything user-typed.
const t = v => String(v ?? "").replace(/[<>]/g, "").trim();
const who = (name, email) => (t(name) ? `${t(name)} (${t(email)})` : t(email));
const status = ctx => ctx.hubspotOk === false ? "⚠️ HubSpot update failed – check Netlify function logs."
  : !ctx.matched ? "" // not in HubSpot: just the email + answers, no extra line
  : ctx.dealId ? `✅ Saved to HubSpot deal: ${dealUrl(ctx.dealId)}` : "ℹ️ Contact found but has no deal – note added to the contact.";
const cap = s => s.slice(0, 4000); // Chat text messages max out around 4096 chars

export function chatStep1(d, name, ctx) {
  const ans = QUESTIONS.map(([k, q], i) => `• ${i + 1}. ${q.replace(/\.$/, "")}: ${d.answers[k] || "—"}`).join("\n");
  return { text: cap([
    `${who(name, d.email)} completed page 1 of the financial health check form.`, "",
    "=== ANSWERS ===", ans, "",
    "=== GOAL (not currently on track for) ===", t(d.goal) || "—", "",
    "=== WHAT'S MOST MISSING ===", t(d.missing) || "—", "",
    status(ctx),
  ].join("\n").trim()) };
}
export function chatStep2(d, name, ctx) {
  const tot = totals(d);
  const names = [d.person1, d.person2].filter(Boolean).map(t).join(" & ") || t(name);
  const L = (label, v) => `• ${label}: ${money(v.amount)} (${v.freq === "Yearly" ? "Annually" : v.freq})`;
  const pick = keys => EXPENSES.filter(([k]) => keys.includes(k) && d.expenses[k]).map(([k, l]) => L(l, d.expenses[k]));
  const FFF = ["food", "fuel"], all = EXPENSES.map(e => e[0]);
  const income = INCOME.filter(([k]) => d.income[k]).map(([k, l]) => L(l, d.income[k]));
  const hard = pick(all.filter(k => !FFF.includes(k)));
  const extra = d.custom.map(c => L(t(c.name), c));
  const sec = (title, lines) => lines.length ? [title, ...lines] : [];
  return { text: cap([
    `${who(names, d.email)} completed page 2 of the financial health check form (income & expenses).`, "",
    "=== INCOME ===", ...(income.length ? income : ["—"]), "",
    "=== EXPENSES ===",
    ...sec("Food & Fuel (FFF):", pick(FFF)),
    ...sec("Hard Expenses:", hard),
    ...sec("Additional (custom) expenses:", extra),
    "", "=== TOTALS (per month) ===",
    `• Income: ${money(tot.inc)}`, `• Expenses (excl. mortgage): ${money(tot.exp)}`, `• Surplus: ${tot.surplus < 0 ? "-" : ""}${money(Math.abs(tot.surplus))}`, "",
    status(ctx),
  ].join("\n").trim()) };
}
