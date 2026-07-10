# Tasks: Batch Expiration Tracking

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units
| Unit | Goal | Likely PR | Notes |
| --- | --- | --- | --- |
| 1 | DB Schema & RPC Updates | PR 1 | Add product_batches table/triggers and refactor complete_sale_rpc/receive_goods_rpc in SUPABASE_SCHEMA.sql. |
| 2 | Zustand Store & Cache | PR 2 | Add batch queries/mutations and offline FEFO deduction logic in store.jsx & store.test.js. |
| 3 | Stock Admin UI | PR 3 | Toggle batch control and display batch lists in stock.jsx. |
| 4 | Goods Receipt UI | PR 4 | Require batch fields for batch-controlled goods in proveedores.jsx. |
| 5 | Cashier Warnings UI | PR 5 | Check expirations and show warnings in checkout/cart in venta.jsx. |

## Phase 1: Foundation / Infrastructure
- [x] 1.1 Add `controlLotes` boolean field to `products` table in [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql).
- [x] 1.2 Create `product_batches` table with unique constraint on `("productId", "batchCode")` and index on `("productId", "expirationDate")` in [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql).
- [x] 1.3 Implement trigger `trg_sync_product_stock_from_batches` in [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql) to sync products stock from active batch stock.
- [x] 1.4 Refactor `complete_sale_rpc` in [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql) to lock batches and cascadingly deduct quantities from earliest-expiring active batches (FEFO).
- [x] 1.5 Refactor `receive_goods_rpc` in [SUPABASE_SCHEMA.sql](file:///C:/Users/facu/kiosko-pos/SUPABASE_SCHEMA.sql) to upsert batch records for batch-controlled items.

## Phase 2: Core Implementation
- [x] 2.1 Register React Query hooks for fetching and updating `product_batches` in [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx).
- [x] 2.2 Replicate FEFO cascading deduction on `batchesCache` inside `completeSale` offline path in [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx).
- [x] 2.3 Integrate batch info updates in local offline actions for `RECEIVE_GOODS` in [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx).
- [x] 2.4 Update background offline action sync to submit batches payload for sales and goods receipts in [store.jsx](file:///C:/Users/facu/kiosko-pos/src/lib/store.jsx).

## Phase 3: Integration / Wiring
- [x] 3.1 Add `controlLotes` toggle to product form modal in [stock.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/stock/stock.jsx).
- [x] 3.2 Display active/expired batch lists and support manual adjustments under product details in [stock.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/stock/stock.jsx).
- [x] 3.3 Update goods receiving inputs in [proveedores.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/proveedores/proveedores.jsx) to require batch details for batch-controlled items, and remove client-side `updateProduct` loop.
- [x] 3.4 Display expiration warnings for expired or near-expiration items in checkout cart in [venta.jsx](file:///C:/Users/facu/kiosko-pos/src/components/pos/venta/venta.jsx).

## Phase 4: Testing / Verification
- [x] 4.1 Write unit tests in [store.test.js](file:///C:/Users/facu/kiosko-pos/src/lib/store.test.js) verifying local offline FEFO batch stock deductions.
- [x] 4.2 Validate DB RPC atomic FEFO behavior and trigger sync under concurrent operations.

## Phase 5: Documentation / Cleanup
- [x] 5.1 Document batch-tracking usage in the user manual [manual_usuario.pdf](file:///C:/Users/facu/kiosko-pos/manual_usuario.pdf).
