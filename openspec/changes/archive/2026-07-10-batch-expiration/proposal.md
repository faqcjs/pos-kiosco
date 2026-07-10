# Proposal: Batch Expiration Tracking

## Intent
Integrate batch and expiration date tracking (FEFO) to prevent selling expired merchandise and automate inventory depreciation.

## Scope

### In Scope
- Database schema additions for batch tracking.
- PL/pgSQL database logic for atomic FEFO deductions inside `complete_sale_rpc`.
- Local Zustand cache and offline sales synchronization handling FEFO deductions.
- UI elements to toggle batch control on products, view batch lists, warn on expired items, and record batch info on receipts.

### Out of Scope
- Direct push notifications for expiring batches (alerts remain in-app).
- Cart-level splitting of a single product line across multiple batches.

## Capabilities

### New Capabilities
- `batch-tracking`: Handles inventory batch registration, batch codes, quantities, and expiration dates.

### Modified Capabilities
- `inventory-management`: Supports toggling batch control for products and displaying batch states.
- `sales-processing`: Checks expiration dates at checkout and atomic batch-based FEFO deductions.
- `supplier-reconciliation`: Requires batch numbers and expiration dates when receiving batch-controlled goods.

## Approach
Implement **Approach 1 (Database-Driven FEFO)**. The database is the source of truth for batches. `complete_sale_rpc` intercepts sales for products with batch control and deducts stock from earliest-expiring active batches (`expirationDate ASC`). The frontend Zustand cache mimics this FEFO logic for local offline states.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql) | Modified | Create `product_batches` table, add `"controlLotes"` flag to `products`, and update `complete_sale_rpc`. |
| [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx) | Modified | Add `product_batches` fetch/mutation queries, integrate Zustand caching, and update offline sync. |
| [stock.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/stock/stock.jsx) | Modified | Toggle batch control for products and display active/expired batches. |
| [proveedores.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/proveedores/proveedores.jsx) | Modified | Require and capture batch details (lote, vencimiento) on catalog receipt items. |
| [venta.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/venta/venta.jsx) | Modified | Check and warn cashiers of expired or expiring batches in the cart. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Concurrency / Deadlocks | Low | Order locks deterministically in SQL transaction by product ID and expiration date. |
| Offline Sync Reconciliation | Medium | Rely on online sequence execution of `complete_sale_rpc` to resolve final states. |
| Data Entry Overhead | Medium | Streamlined, auto-focused batch input fields only when batch control is enabled. |

## Rollback Plan
Drop the `product_batches` table, remove the `"controlLotes"` column from `products`, restore the original `complete_sale_rpc` function, and revert frontend changes to previous git commit.

## Dependencies
- Supabase database access to deploy schema and RPC changes.

## Success Criteria
- [ ] Products with batch control deduct stock using FEFO rules (earliest expiring first) when sold.
- [ ] Cashiers are warned in the sale screen if a batch is expired or expiring soon.
- [ ] Supplier receipt flow records batch code/expiration and populates the store/database.
