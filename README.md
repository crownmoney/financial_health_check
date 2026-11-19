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
- Mappings live in `netlify/lib/hubspot.mjs` (`QUESTIONS`, `INCOME`, `EXPENSES`). Only fields the client filled in are written. "Annually" → HubSpot "Yearly". Food/fuel have no frequency property, so they're stored as weekly amounts.
- Notes use inline-styled HTML only: HubSpot strips `<style>` and `<script>` from notes.
- Netlify Forms still receives a full copy of every step-2 submission as a backup.
