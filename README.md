# Financial Health Check

Two-step Crown Money lead form (static HTML/JS, Netlify Forms).

- `index.html` – step 1: email, 10 yes/no questions, goal, "what's missing"
- `assessment.html` + `assets/assessment.js` – step 2: names, net income, expenses
- Submissions go to the Netlify form `financial-health-check` (single combined submission, step 1 data carried via `sessionStorage`)
- `__forms.html` – static skeleton Netlify parses to register the form. **Keep its field names in sync with `assets/assessment.js` / `index.html`** or submissions will be rejected.

Deploy: Netlify auto-deploys from `main`, no build step. In Netlify: Forms → Enable form detection, then add a notification.

## HubSpot integration
Netlify Function `netlify/functions/hubspot.mjs` (needs env var `HUBSPOT_ACCESS_TOKEN`, scopes: contacts read, deals read/write, notes write).
- **Step 1** (`/api/hubspot/step1`): email → contact → most recent *open* deal (else latest deal, else contact). Adds a branded note + sets `financial_health_check_page_1`, `financial_health_check__number_` and 4 yes/no properties. Returns a signed 6h token.
- **Step 2** (`/api/hubspot/step2`): requires that token (the browser never chooses the deal). Adds a note + writes income/expense properties, `financial_health_check_date`, `financial_health_check_page_2_number`.
- Mappings live in `netlify/lib/hubspot.mjs` (`QUESTIONS`, `INCOME`, `EXPENSES`). Only fields the client filled in are written. "Annually" → HubSpot "Yearly".
- Notes use inline-styled HTML only: HubSpot strips `<style>` and `<script>` from notes.
- Netlify Forms still receives a full copy of every step-2 submission as a backup.

## Google Chat notifications
Env var `GOOGLE_CHAT_WEBHOOK_URL` (Netlify, secret, production context, scopes: Functions + Runtime; already configured) = incoming-webhook URL of the Chat space "$ Payments & Health Checks".
After page 1 and page 2 the function posts a plain-text message in the same layout as the old Zapier post (name + email, or just the email if no name; the answers; HubSpot deal link / sync status). A Chat failure never affects the user or the HubSpot sync; if the var is unset, posting is skipped.

### HubSpot properties still to be created (deal object)
The code already maps these; each is skipped (with a log line) until it exists, then written automatically.
| Internal name | Label | Type |
|---|---|---|
| `fhc_know_interest_paid_to_bank` | FHC: I know how much interest I'll hand the bank | Dropdown: `true`=Yes, `false`=No, `Not Sure` |
| `fhc_debt_free_before_retirement` | FHC: I'll be debt-free comfortably before I retire | same |
| `fhc_loan_structured_to_pay_faster` | FHC: My loan is structured to pay down faster | same |
| `fhc_rates_rise_2pct_plan_holds` | FHC: If rates rose 2% my plan still holds | same |
| `fhc_track_money_live_data_feeds` | FHC: I track my money with live data feeds | same |
| `fhc_partner_same_plan_and_goal` | FHC: Partner and I share one plan and goal | same |
| `fhc_goal_not_on_track` | FHC: Goal they aren't on track for | Multi-line text |
| `fhc_most_missing` | FHC: What's most missing | Single-line text |
| `pet_insurance_frequency_dropdown` | Pet Insurance Frequency (dropdown) | Dropdown: Weekly, Fortnightly, Monthly, Quarterly, Yearly |
