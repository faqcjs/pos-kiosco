# Exploration: codebase-architecture

## Current State
`pos-kiosco` is a React + Vite + Tailwind CSS v4 Point of Sale frontend application for retail kiosk operations. It integrates with a Supabase backend for data persistence and authentication.
- **Entry Points**: `src/main.jsx` registers the Service Worker for offline PWA support and boots `App.jsx`. `App.jsx` handles state initialization, basic hash routing (`#/venta`, `#/caja`, etc.), role-based access control (e.g. repositor vs administrador), and renders the top-level `AppShell`.
- **UI & Reusable Elements**: Located under `src/components/ui/` (`button.jsx`, `kit.jsx`, `toast.jsx`).
- **State Management & Data Flow**: Managed via a unified state model in `src/lib/store.jsx`. Local UI state (theme, cart, current user, offline transaction queues) is maintained in Zustand (`useUIStore`) and persisted in local storage. Server state (products, sales, customers, suppliers, shifts, product batches) is fetched/cached using React Query, which automatically syncs with Supabase database events in real-time via `RealtimeSync` using Supabase Postgres changes channels.
- **Supabase Integration**: Auth and Database queries are initiated via the Supabase client defined in `src/lib/supabase.js`. Transactional operations (completing checkouts, registering client/supplier payments, registering incoming goods) are processed atomically via transactional PostgreSQL RPC functions (`complete_sale_rpc`, `register_customer_payment_rpc`, `receive_goods_rpc`, `register_supplier_payment_rpc`) written in PL/pgSQL with Row-Level Security (RLS) policies.
- **Offline Sync & FEFO**: When offline, the application queues checkouts and payments, performing optimistic updates on the React Query cache. A cascading FEFO (First Expired First Out) stock deduction algorithm for batch-controlled products is executed locally during offline sales. Once online, a background reconciliation loop processes queued actions and sales sequentially.

## Affected Areas
- [main.jsx](file:///C:/Users/facu/kiosko-pos/src/main.jsx) — Application bootstrap and PWA service worker registration.
- [App.jsx](file:///C:/Users/facu/kiosko-pos/src/App.jsx) — Routing, login/auth synchronization, and page rendering.
- [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx) — Zustand and React Query state integration, mutations, and offline sync.
- [supabase.js](file:///C:/Users/facu/kiosko-pos/src/lib/supabase.js) — Supabase client initialization.
- [eslint.config.js](file:///C:/Users/facu/kiosko-pos/eslint.config.js) — ESLint configuration throwing undef errors for browser globals (`fetch` and `sessionStorage`).
- [store.test.js](file:///C:/Users/facu/kiosko-pos/src/lib/store.test.js) — Core test suite covering selectors, Zustand store, and offline FEFO batch deductions.
- [proveedores.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/proveedores/proveedores.jsx) — Large supplier views (63KB) containing complex UI and logic.
- [admin.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/admin/admin.jsx) — Large admin view (42.6KB).

## Approaches for Architecture Cleanup
1. **Fixing the ESLint Flat Configuration**
   - **Description**: Add `sessionStorage` and `fetch` to `languageOptions.globals` in `eslint.config.js`.
   - **Pros**: Immediate fix for the broken lint pipeline; restores build validation checks.
   - **Cons**: Does not address component bloat or testing limits.
   - **Effort**: Low

2. **Adding Vitest Coverage & Integration Tests**
   - **Description**: Enable Vitest coverage reporting and write integration tests (e.g. testing the offline sync reconciliation loop, user creation/deletion RPC calls, and role validation).
   - **Pros**: Ensures regression safety for the complex offline sync state machine. Aligns with the project's strict TDD configuration.
   - **Cons**: High mocking setup needed for browser network/online status and Supabase queries.
   - **Effort**: Medium

3. **Components Modularization**
   - **Description**: Refactor large single-file POS views (like `proveedores.jsx` and `admin.jsx`) into smaller, modular sub-components (e.g. separating list tables, forms, modals) following the guidelines in `AGENTS.md`.
   - **Pros**: Drastically reduces file complexity and improves codebase maintainability.
   - **Cons**: High refactoring effort; risk of introducing layout/interaction bugs without visual regression tests.
   - **Effort**: High

## Recommendation
We recommend **Approach 1 (Fixing ESLint config)** as the immediate priority to restore pipeline health. Once clean, we should proceed with **Approach 2 (Adding Vitest Coverage/Integration Tests)** to secure the offline sync logic under strict TDD, and then systematically apply **Approach 3 (Modularizing Components)** for view files exceeding the 150-line rule defined in `AGENTS.md`.

## Risks
- ESLint errors might hide other warnings/errors once the environment globals are added.
- The offline synchronization queue requires robust mock testing; improper mocking could lead to false positives/negatives in tests.

## Ready for Proposal
Yes — the orchestrator should present the ESM globals fix as the primary step to restore developer pipeline usability, followed by integration tests for offline reconciliation.
