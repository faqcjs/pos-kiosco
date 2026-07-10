</Agent System Instructions>
<Delta for control-lotes>
## ADDED Requirements
### Requirement: Product Batch Control Toggle
A product SHALL have an attribute indicating whether it is subject to batch and expiration date tracking. When this attribute is enabled:
- The system MUST track stock levels at the batch level (combination of product, batch code, and expiration date) instead of just a global stock number.
- Any manual stock adjustments or inventory logs for this product MUST specify a batch code and expiration date.

#### Scenario: Enable batch control on a product
- GIVEN a product with batch control disabled and 0 stock
- WHEN the administrator enables batch control for the product
- THEN the system SHALL require future stock receipts for this product to have batch codes and expiration dates

### Requirement: Supplier Receipt Batch Entry
When receiving merchandise from a supplier, if a product has batch control enabled, the system MUST require the user to input a batch code and an expiration date for each received item.
- The system MUST create or update the corresponding product batch with the received quantity and expiration date.
- The system MUST update the global product stock by adding the received quantity.

#### Scenario: Registering received goods with batch details
- GIVEN a product with batch control enabled
- WHEN the user registers a supplier receipt of 10 units of the product with batch code "B123" and expiration date "2026-12-31"
- THEN the system MUST create a batch "B123" for that product with stock 10
- AND the product's total stock MUST increase by 10

### Requirement: FEFO Batch Deduction
When processing a sale, for each product that has batch control enabled:
- The system MUST deduct the sold quantity from the earliest-expiring active batches that have available stock (FEFO - First Expired, First Out).
- If multiple batches have the same expiration date, the system SHOULD deduct from the one with the earliest registration timestamp.
- If the quantity to deduct exceeds the stock of the earliest-expiring batch, the system MUST deduct all available stock from it, and then deduct the remaining quantity from the next earliest-expiring batch, cascading until the full quantity is deducted.
- The system MUST prevent the transaction and raise an error if the total available stock across all batches is less than the requested quantity.

#### Scenario: Completing a sale with cascading FEFO batch deductions
- GIVEN a product with batch control enabled having two batches:
  - Batch "B1" expiring "2026-08-01" with stock 5
  - Batch "B2" expiring "2026-09-01" with stock 10
- WHEN a sale is processed for 7 units of the product
- THEN the system MUST deduct 5 units from Batch "B1" (bringing its stock to 0)
- AND deduct 2 units from Batch "B2" (bringing its stock to 8)
- AND the product's total stock MUST decrease by 7

#### Scenario: Rejecting a sale with insufficient total batch stock
- GIVEN a product with batch control enabled having a total stock of 4 units across all active batches
- WHEN a sale is processed for 5 units of the product
- THEN the system MUST reject the sale transaction and raise an error indicating insufficient stock

### Requirement: Expiration Date Warnings at Checkout
When adding a product with batch control enabled to the sale cart, the system MUST check the expiration dates of its active batches:
- If the earliest-expiring active batch has already expired (relative to the current system date), the system MUST display a prominent warning to the cashier.
- If the earliest-expiring active batch is within a configurable near-expiration window (default: 7 days), the system MUST display an upcoming expiration warning.
- The cashier MAY proceed with the sale after acknowledging the warning, unless administrative policies explicitly block sales of expired items.

#### Scenario: Warning cashier of expired batch in cart
- GIVEN a product with batch control enabled and its earliest-expiring batch having an expiration date in the past
- WHEN the cashier adds this product to the sale cart
- THEN the system MUST display a warning indicating that the batch is expired
</Delta for control-lotes>
