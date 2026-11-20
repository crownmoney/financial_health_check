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
NB: the legacy yes/no properties ("1. I have a Strategy & Plan" etc.) are **calculated** properties in HubSpot, so the API cannot write them – new writable ones are needed.

Yes/No questions – dropdown, options: `true` = Yes, `false` = No, `Not Sure` (same as the existing yes/no properties):
| Internal name | Question |
|---|---|
| `fhc_written_plan_with_debt_free_date` | 1. I have a written plan with my exact debt-free date |
| `fhc_know_interest_paid_to_bank` | 2. I know exactly how much interest I'll hand the bank |
| `fhc_debt_free_before_retirement` | 3. I'll be debt-free comfortably before I retire |
| `fhc_three_months_buffer` | 4. I have 3+ months of expenses saved as a buffer |
| `fhc_loan_structured_to_pay_faster` | 5. My loan is structured to pay down faster than a standard bank loan |
| `fhc_rates_rise_2pct_plan_holds` | 6. If rates rose 2%, I know the cost and my plan still holds |
| `fhc_track_money_live_data_feeds` | 7. I track my money with live data feeds and compare bills yearly |
| `fhc_partner_same_plan_and_goal` | 8. My partner and I share one plan and the same debt-free goal |
| `fhc_coaching_built_around_me` | 9. I've had coaching built around my situation |
| `fhc_expert_review_as_life_changes` | 10. I review my strategy with an expert as life changes |

Other:
| Internal name | Label | Type |
|---|---|---|
| `fhc_goal_not_on_track` | FHC: Goal they aren't on track for | Multi-line text |
| `fhc_most_missing` | FHC: What's most missing | Single-line text |
| `pet_insurance_frequency_dropdown` | Pet Insurance Frequency (dropdown) | Dropdown: Weekly, Fortnightly, Monthly, Quarterly, Yearly |
