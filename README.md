# Velisqa

Two independently deployed apps:

| Folder | What | Deploys to |
|---|---|---|
| [`frontend/`](frontend/) | Storefront + admin console (React, Vite, prerendered) | **Vercel** — set *Root Directory* to `frontend` |
| [`backend/`](backend/) | API (Express + MongoDB) | **Hostinger VPS** — see [`backend/README.md`](backend/README.md) |

Other folders: `e2e/` (Playwright browser tests, not deployed), `docs/` (migration notes, runbook; `docs/archive/` holds older planning docs), `Velisqa_VPS_MD_Files/` (phase guides).

## Tests

All test cases are listed in [`docs/testing/TEST_CASES.md`](docs/testing/TEST_CASES.md).

```bash
cd backend && npm test && npm run test:integration   # API: unit + integration (own temporary DB)
cd e2e && npm test                                    # browser: storefront, checkout, Razorpay, accounts, admin
cd backend && npm run check:razorpay                  # optional: your rzp_test_ keys against Razorpay
```

None of the tests touch your real database.

## Local development

```bash
# 1. API — set MONGODB_URI in backend/.env to your MongoDB (must be a replica set, e.g. Atlas)
cd backend && npm install && npm run db:indexes && npm run data:import && npm start   # http://localhost:5000

# 2. Storefront
cd frontend && npm install && npm run dev       # http://localhost:5173
```
