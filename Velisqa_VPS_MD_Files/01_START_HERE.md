# 01 — START HERE — Velisqa Supabase → Hostinger VPS migration

**Reference project actually reviewed:** `Velisqa-main.zip`, directory `Velisqa-main/`. The user's message calls the brand "Farriska" and an AI brand, but **the uploaded code is the Velisqa jewellery/e-commerce application**, with checkout, Razorpay, NimbusPost, and a store admin panel. The instructions here are grounded in the uploaded files. Claude must not assume unseen Farriska features exist. If the correct repo is a different brand, re-run the source audit on that repo first; retain these instructions as an architectural template only.

## What you get

- `CLAUDE.md`: the agent's binding working instructions; copy into the repository root as `CLAUDE.md`.
- `02_ARCHITECTURE_AND_SOURCE_AUDIT.md`: what already exists and what has to move.
- `03_API_AND_DATA_CONTRACT.md`: required new API endpoints, models, states, compatibility requirements.
- `04_IMPLEMENTATION_PLAN.md`: ordered, testable work stages for Claude Code.
- `05_HOSTINGER_DEPLOYMENT.md`: Vercel + Hostinger VPS + MongoDB + Nginx + PM2 operational guide.
- `06_TESTS_SECURITY_CUTOVER.md`: tests, production gates, migration/rollback.
- `CLAUDE_CODE_MASTER_PROMPT.md`: paste into Claude Code **after opening the extracted project folder**.
- `templates/`: safe, fill-in-the-blanks configuration examples. All sample secrets are placeholders.
- `audit/`: machine-generated code-location inventory from the supplied ZIP.

## Intended final topology

```text
                          Internet / HTTPS
                                  |
             +--------------------+-------------------+
             |                                        |
       www.velisqa.com                         api.velisqa.com
        Vercel / Vite                       Hostinger Ubuntu VPS
     React 19 SPA (frontend/)             Nginx -> Node.js / Express 5
             |                                        |
        fetch credentials                    business services
             |                           auth / catalog / checkout
             +-------------------------> payments / returns / shipping
                                                      |
                                          MongoDB on secured VPS
                                          or managed MongoDB Atlas
                                                      |
                                       Razorpay, NimbusPost, Cloudinary,
                                       Google OAuth, Meta CAPI, email
```

### "mock DB" versus MongoDB

The request is interpreted as **MongoDB** (a persistent database) because the application takes real orders and payments. A **mock database** (in-memory arrays or JSON fixtures) is permitted only for unit tests and demos and must **never** be used as the production source of truth. Implement an optional repository-level fake for tests, but require MongoDB for deployment. MongoDB multi-document transactions require a replica set even on a single VPS.

### Absolute requirements

1. Frontend stays deployable independently to Vercel; backend stays in a sibling `backend/` folder for Hostinger.
2. Do not rewrite the styling, routes, shopping UX, or admin UI unnecessarily.
3. Remove production *runtime* dependencies on Supabase Auth, PostgREST, Storage, Realtime, SQL RPC, and Edge Functions after cutover.
4. Preserve existing product IDs, public product URLs, order references, statuses, historical dates, payments, coupons, pictures, profiles, admin access, and return histories.
5. Backend is the **only** trusted party that modifies payment/order/stock/roles and communicates with secret-bearing third-party APIs.
6. No placeholder endpoint, fake success response, TODO-only implementation, or silent loss of a feature can count as completion.
7. Retain Supabase exports and the old deployment until the migration is verified and rollback can be executed safely.

## Fast start with Claude Code

1. Extract `Velisqa-main.zip` locally. Open the extracted `Velisqa-main/` folder in Claude Code.
2. Copy `CLAUDE.md`, all numbered markdown files, and the `audit/` folder into the extracted project root so the relative paths in `CLAUDE.md` work.
3. Paste the text from `CLAUDE_CODE_MASTER_PROMPT.md`.
4. Give Claude staging MongoDB credentials, API host, Google OAuth credentials, and test keys using local `.env` files or a secure secret store; never put secrets into chat or commits.
5. Require Claude to work in the documented stages with actual edits, commands, tests, and a progress checklist. Never authorize a live cutover based merely on generated code.

**Read this guide as a project-specific migration specification, not a claim that the backend has already been migrated.**
