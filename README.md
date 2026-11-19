# Financial Health Check

Two-step Crown Money lead form (static HTML/JS, Netlify Forms).

- `index.html` – step 1: email, 10 yes/no questions, goal, "what's missing"
- `assessment.html` + `assets/assessment.js` – step 2: names, net income, expenses
- Submissions go to the Netlify form `financial-health-check` (single combined submission, step 1 data carried via `sessionStorage`)
- `__forms.html` – static skeleton Netlify parses to register the form. **Keep its field names in sync with `assets/assessment.js` / `index.html`** or submissions will be rejected.

Deploy: Netlify auto-deploys from `main`, no build step. In Netlify: Forms → Enable form detection, then add a notification.
