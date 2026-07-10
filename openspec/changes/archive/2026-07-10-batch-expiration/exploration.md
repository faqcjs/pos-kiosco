## Exploration: Batch Expiration tracking (Control por Lotes - FEFO)

### Current State
Today, the system manages inventory as a flat numerical stock value per product (`products.stock`). Stock adjustments are done globally: sales decrement `products.stock` atomically using the Postgres function `complete_sale_rpc`, and incoming goods are processed client-side via `SupplierDetail` in `proveedores.jsx` by calling `updateProduct(...)` to increment stock, while supplier invoice history is saved to `public.suppliers.entries` as JSONB via `receive_goods_rpc`. There is no tracking of batch numbers or expiration dates, making FIFO/FEFO rules impossible to enforce automatically.

### Affected Areas
- [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql) — Must add `"controlLotes"` boolean flag to `public.products`, create `public.product_batches` table, define index on `("productId", "expirationDate")`, configure RLS policies, enable Realtime replication, and update `complete_sale_rpc` to implement the FEFO deduction logic.
- [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx) — Must add queries/mutations to fetch and mutate `product_batches`, integrate batches caching in Zustand (`batchesCache`), update local offline sync to process batch creation/sale deduction actions (e.g. `ADD_BATCH`), and handle offline sales stock deductions on local batches according to FEFO order.
- [stock.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/stock/stock.jsx) — Needs UI additions in `ProductFormModal` to toggle `"controlLotes"` on products, and display/manage the list of active/expired/expiring batches for the selected product.
- [proveedores.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/proveedores/proveedores.jsx) — `SupplierDetail` must be updated to require `batchCode` (lote) and `expirationDate` (vencimiento) for each catalog item in a receipt if the product has `"controlLotes"` enabled. Upon receipt submission, the corresponding batches must be created in the store.
- [venta.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/venta/venta.jsx) — Must check product expiration statuses when items are selected or added to cart, and warn the cashier of expired batches or upcoming expiration dates.

### Approaches
1. **Database-Driven FEFO (Atomic Batch Deduction via RPC)**
   - **Description**: The database is the source of truth for batches. The `complete_sale_rpc` function intercepts sales for products with `"controlLotes" = true` and deducts stock sequentially from the earliest-expiring active batches (`expirationDate ASC`) before updating the product's overall `stock` column.
   - **Pros**: Guaranteed atomicity and consistency of batch deductions during concurrent checkout transactions; prevents race conditions; easily keeps `products.stock` in sync.
   - **Cons**: Requires modifying a critical PL/pgSQL database function.
   - **Effort**: Medium

2. **Client-Driven Batch Deduction (State-Managed)**
   - **Description**: The React client determines which batches are deducted when completing a sale and sends a list of batch updates (e.g., updates to `product_batches`) alongside the sale insert.
   - **Pros**: Simplifies SQL schema logic; leaves batch selection rules in Javascript.
   - **Cons**: Higher risk of race conditions with multiple concurrent cashiers; offline synchronization becomes highly complex to reconcile when overlapping sales occur.
   - **Effort**: High

### Recommendation
I recommend **Approach 1 (Database-Driven FEFO)**. This guarantees transaction safety and consistency. It keeps the core FEFO logic centralized in Postgres (`complete_sale_rpc`), preventing issues with concurrent checkouts. The React client only needs to pass the items and quantities as it does today, and the database will automatically resolve the correct batch deductions. For the offline queue, the client can replicate the same FEFO sorting logic on its local state cache to keep the offline UI stock counts accurate.

### Risks
- **Concurrency & Deadlocks**: Deducting from multiple batches under load can lead to lock contention. We must lock the batches deterministically (e.g. order by product ID and batch expiration) within the SQL transaction.
- **Offline Data Sync Reconciliation**: If multiple sales are queued offline, resolving the order of batch deductions when back online requires care. However, because the RPC executes in sequence, the database will naturally apply FEFO to whatever batches are available at the time of execution.
- **Data Entry Burden**: Cashiers or stock managers must input batch numbers and expiration dates when receiving merchandise. This can slow down receipt registration if not designed with a streamlined UI.

### Ready for Proposal
Yes — The system has a clean separation of store logic and UI. The database schema can support the new `product_batches` table without breaking existing features. The orchestrator should proceed to define the specification and implementation plan for the database schema updates, store integration, and UI changes.
