# Auto-generated and hand-curated project inventory

- `source_supabase_calls.csv`: all matched Supabase calls/imports/env vars in actual uploaded `src/` and `scripts/`, with file + line and source snippet. Generated from the ZIP; does not include all indirect call sites or dynamically computed targets. **Claude must run a fresh ripgrep/source audit after editing.**
- `edge_functions.csv`: 13 actual `supabase/functions/*/index.ts`, direct DB targets, Deno env var names, code size.
- `supabase_sql_objects.csv`: all 23 source `.sql` files, create-table and function statements, ALTER-added columns. Rows report source definitions, **not** proof of production schema state.
- `feature_parity_matrix.csv`: hand-curated migration work queue mapped to real source files, target APIs and NOT_STARTED / VERIFY_ACTIVE / PRESERVE status. Update it with real test evidence and status during implementation.

Do not treat `NOT_STARTED` as a claim of a broken original site; it only means VPS migration work was **not** implemented in this documentation kit.
