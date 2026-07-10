## Exploration: Production-Readiness Audit of Kiosko POS

### Current State
The system is a desktop-oriented web POS system (eKiosco) designed for kiosks, with role-based navigation and database security (`administrador`, `cajero`, `repositor`). It integrates frontend state management (Zustand) with a remote database (Supabase via `@supabase/supabase-js` and `@tanstack/react-query`).

Key features of the implementation:
- **Offline-First Capabilities**: Mutations are queued locally in Zustand (`offlineSalesQueue` / `offlineActionsQueue`) when the client is offline, and synced to Supabase when connectivity is regained.
- **Audited RPC Transactions**: Database operations like completing a sale, registering customer payments, or receiving goods are conducted via PL/pgSQL database functions (`complete_sale_rpc`, `register_customer_payment_rpc`, `receive_goods_rpc`, `register_supplier_payment_rpc`) which implement server-side validation and atomic operations.
- **Shift Enforcement**: A unique partial index ensures only one shift can be open at a time. The app blocks sales if no shift is open, and locks cashiers out of other cashiers' shifts.

### Affected Areas
- [stock.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/stock/stock.jsx) — Product `save` function has a critical bug where editing *any* product detail automatically adds the `unidad` pack size to the current stock.
- [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql) — RLS policies are too permissive (e.g., `cajero` can perform `INSERT`/`UPDATE`/`DELETE` on products; open shifts can be edited by any authenticated user; `repositor` can modify customers).
- [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx) — Zustand and React Query store. Discarding offline sync errors leads to silent data loss (missing sale records, stock discrepancies).
- [venta.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/venta/venta.jsx) — Interacts with `completeSale` and coordinates local optimistic stock deductions.
- [caja.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/caja/caja.jsx) — Interacts with shift open/close.

### Approaches
1. **Approach 1: Minimal Correction (Quick Patching)**
   - Fix the stock increment bug during edits in [stock.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/stock/stock.jsx).
   - Tighten RLS policies in [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql) to prevent cashiers from writing directly to products and restrict open shift updates to the cashier who opened them.
   - *Pros*: Quick implementation, zero schema changes, solves immediate bugs.
   - *Cons*: Does not address the underlying architectural issues like JSONB performance bottlenecks or split-brain data loss.
   - *Effort*: Low

2. **Approach 2: Comprehensive Normalization & Hardening (Recommended)**
   - Fix the stock bug in [stock.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/stock/stock.jsx) by separating product details editing from stock replenishment.
   - Refactor the database schema to normalize nested JSONB arrays (`customers.entries`, `suppliers.entries`, `shifts.movements`) into relational tables (`customer_transactions`, `supplier_transactions`, `shift_movements`). This ensures SQL scalability, referential integrity, and efficient historical reporting.
   - Implement strict RLS security (restricting product mutations to `administrador` and `repositor`, and shift updates to `administrador` or the `openedBy` user).
   - Improve offline conflict resolution: instead of throwing generic database errors and leaving it to cashiers to manually "discard" (which deletes the sale record), implement local logs, audit trails, and automatic conflict resolution (e.g., allowing negative stock for verified offline sales with a "pending warning" status).
   - *Pros*: Production-grade security, robust database design, scalability, and secure data sync.
   - *Cons*: High refactoring effort on both frontend ([store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx) queries/mutations) and backend ([SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql)).
   - *Effort*: High

### Recommendation
Approach 2 is strongly recommended. The system currently stores financial and inventory ledger data in nested JSONB arrays, which will cause critical performance degradation and data integrity issues as the business grows. In addition, the RLS policies leave security holes that could be exploited by cashier accounts. A proper production audit must address these architectural and security concerns alongside fixing the stock editing bug.

### Risks
- Normalizing the database requires updating all queries and mutations in [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx), which could introduce regression bugs in client/supplier/shift interfaces if not thoroughly tested.
- Implementing stricter RLS policies might break offline sync if cache updates are not carefully aligned with security definitions.
- The stock editing bug currently hides inventory adjustments; fixing it means a new way to replenish stock (e.g. "receive goods" button or explicit restock inputs) must be clearly exposed in the UI.

### Ready for Proposal
Yes. The orchestrator should present this structured report to the user and request approval to proceed with creating the production-readiness plan and subsequent implementation.
