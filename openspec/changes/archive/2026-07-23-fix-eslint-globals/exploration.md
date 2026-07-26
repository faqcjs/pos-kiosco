# Exploration: Codebase Architecture (fix-eslint-globals)

## Current State
`pos-kiosco` is a React + Vite + Tailwind CSS v4 Point of Sale frontend application for a retail shop. It communicates with a Supabase backend for data persistence and authentication.
The codebase is structured with single-page modular views representing different sections of the POS system: POS shell, Sales checkout, Shift management, Products & Stock, Customer/Supplier credit tracking, and Admin dashboard.
State is managed using a hybrid pattern: local UI states (theme, current user, failed actions/sales queues, and cart) are persisted in local storage via Zustand (`useUIStore`), while server states are fetched and cached using React Query. These are unified into a single custom hook (`useStore`).
Supabase integration uses a custom client for Auth and DB access. It supports full offline capability, allowing checkouts and payments while offline by caching actions and sales in Zustand and syncing them back with Supabase transactions (RPCs) when online. PostgreSQL triggers sync product stock from active batches.

## Affected Areas
- [main.jsx](file:///C:/Users/facu/kiosko-pos/src/main.jsx) — Entry point registering the service worker and loading `App.jsx`.
- [App.jsx](file:///C:/Users/facu/kiosko-pos/src/App.jsx) — Root rendering, routing, role-based access control, and authentication sync.
- [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx) — Core state engine combining Zustand and React Query.
- [supabase.js](file:///C:/Users/facu/kiosko-pos/src/lib/supabase.js) — Supabase client initialization.
- [eslint.config.js](file:///C:/Users/facu/kiosko-pos/eslint.config.js) — ESLint configuration throwing undef errors for browser globals.
- [store.test.js](file:///C:/Users/facu/kiosko-pos/src/lib/store.test.js) — Core test suite covering selectors, Zustand store, and offline FEFO batch deductions.
- [proveedores.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/proveedores/proveedores.jsx) — Large supplier views (63KB) containing complex UI and logic.
- [admin.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/admin/admin.jsx) — Large admin view (42.6KB).

## Approaches
1. **Fixing the ESLint Flat Configuration** — Add standard browser globals to ESLint configuration.
   - Pros: Simple, zero-risk, immediately fixes the broken linter pipeline, allowing clean builds and pre-commit checks.
   - Cons: Does not address component bloat or testing limits.
   - Effort: Low

2. **Adding Vitest Coverage & Integration Tests** — Expand unit/integration tests to cover the synchronization pipeline and user authentication flows.
   - Pros: Ensures regression safety for the complex offline sync state machine. Aligns with the project's strict TDD configuration.
   - Cons: Higher initial setup effort to mock complex Supabase clients and browser event behaviors.
   - Effort: Medium

3. **Components Modularization** — Refactor large POS view components into smaller, reusable component parts.
   - Pros: Drastically improves code readability, testing, and maintainability.
   - Cons: High refactoring effort, potential for regressions if selectors are not used correctly.
   - Effort: High

## Recommendation
We recommend **Approach 1 (Fixing ESLint config)** as the immediate priority to restore pipeline health. Once clean, we should proceed with **Approach 2 (Adding Vitest Coverage/Integration Tests)** to secure the offline sync logic under strict TDD, and then systematically apply **Approach 3 (Modularizing Components)** for view files exceeding the 150-line rule defined in `AGENTS.md`.

## Risks
- ESLint updates might uncover more hidden issues once the pipeline is green.
- Mocking Supabase calls (especially RPC triggers) in integration tests can be fragile if the SQL schema changes.
- Refactoring large files without full end-to-end test coverage increases the risk of UI regressions.

## Ready for Proposal
Yes — the orchestrator should present the ESM globals fix as the primary step to restore developer pipeline usability, followed by integration tests for offline reconciliation.
