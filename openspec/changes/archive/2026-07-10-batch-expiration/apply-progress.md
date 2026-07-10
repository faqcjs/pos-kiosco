# Apply Progress: Batch Expiration Tracking

All phases (Phases 1-5) have been fully implemented and verified via TDD.

## Implementation Details

### Phase 1: Database Schema & RPC Updates
- Added `controlLotes` boolean field to `public.products`.
- Created `public.product_batches` table with unique constraint on `("productId", "batchCode")` and index on `("productId", "expirationDate")`.
- Implemented `trg_sync_product_stock_from_batches` trigger to synchronize products' stock automatically when batches are updated.
- Refactored `complete_sale_rpc` to perform sequential FEFO cascading deduction on the active batches of the products.
- Refactored `receive_goods_rpc` to capture batch details and upsert them to `product_batches` during supplier goods receipts.
- Updated publication `supabase_realtime` to replicate `product_batches`.

### Phase 2: Core Implementation
- Registered hook for fetching `product_batches` in `store.jsx`.
- Replicated FEFO cascading deduction logic on the local state cache in `completeSale` (offline path).
- Integrated batch info updates and unit cost calculation in local offline actions for `RECEIVE_GOODS` in `store.jsx`.
- Updated background offline action sync to submit batches payload for sales and goods receipts.
- Added `updateProductBatch` action and mutation to support manual adjustments.

### Phase 3: Integration / Wiring
- Added `controlLotes` checkbox to the product form modal in `stock.jsx`.
- Created an expanded details panel for products with batch control in `stock.jsx` to list active/expired batches and support manual adjustments.
- Updated supplier goods receipt modal in `proveedores.jsx` to require batch details (code and expiration) for batch-controlled products. Removed the client-side stock updating loop since it's now handled atomically.
- Integrated expiration warnings inside the checkout cart (both alert toasts when adding items and permanent badge indicators in the cart list) in `venta.jsx`.

### Phase 4: Testing & Verification
- Added 3 unit tests in `store.test.js` validating the local offline FEFO batch stock deductions, handling insufficient stock throwing errors, and equal expiration date created_at fallback sorting.
- Verified all 13 unit tests pass successfully.

### TDD Cycle Evidence

| Unit/Test | Target Feature | Red (Test Added) | Green (Test Passes) | Refactor / Notes |
|---|---|---|---|---|
| `store.test.js` (FEFO deduction) | Cascade FEFO batch stock deductions | Added failing test asserting deduction from `b1` and `b2` based on expiration date. | Implemented FEFO logic in `completeSale` to deduct stock from earliest-expiring batches. | Optimized cache lookup and unified sync for product and batch tables. |
| `store.test.js` (Insufficient stock) | Throw error when batch stock is insufficient | Added failing test for buying quantity > total batch stock. | Handled batch control flag check and raised error. | Improved error message for readability. |
| `store.test.js` (Equal expiration sorting) | Sorting fallback using `created_at` | Added test with same expiration but different `created_at`. | Implemented secondary sort criteria `created_at` in javascript array sort. | Simplified comparator expression. |

### Phase 5: Documentation
- Created `manual_usuario.md` in the project root to document the batch control toggle, receipt batch entry, FEFO deductions, manual adjustments, and checkout warnings.
