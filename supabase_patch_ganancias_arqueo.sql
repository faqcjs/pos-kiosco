-- =========================================================================
-- PARCHE SQL: GANANCIA ESTIMADA, ARQUEO DE CAJA Y PROTECCIÓN DE COSTO
-- Ejecutar este script en el SQL Editor de Supabase
-- =========================================================================

-- 1. Limpiar firmas anteriores de complete_sale_rpc para evitar ambigüedades
DROP FUNCTION IF EXISTS public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ, TEXT, NUMERIC);

-- 2. Crear complete_sale_rpc con soporte para p_discount
CREATE OR REPLACE FUNCTION public.complete_sale_rpc(
    p_sale_id TEXT,
    p_items JSONB,
    p_method TEXT,
    p_customer_id TEXT,
    p_cash_received NUMERIC,
    p_change NUMERIC,
    p_cost NUMERIC,
    p_sold_by TEXT,
    p_date TIMESTAMPTZ,
    p_shift_id TEXT,
    p_discount NUMERIC DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    item RECORD;
    v_subtotal NUMERIC := 0;
    v_total NUMERIC := 0;
    v_current_stock NUMERIC;
    active_shift RECORD;
    detail_desc TEXT;
    v_user_name TEXT;
BEGIN
    -- Assert p_sold_by matches auth.uid() username
    SELECT username INTO v_user_name FROM public.users WHERE id = auth.uid();
    IF v_user_name IS NULL OR v_user_name <> p_sold_by THEN
        RAISE EXCEPTION 'Identity mismatch: cannot complete sale on behalf of another user.';
    END IF;

    -- Restrict Sales to Open Shifts matching the operator
    SELECT * INTO active_shift FROM public.shifts WHERE id = p_shift_id;
    IF active_shift IS NULL THEN
        RAISE EXCEPTION 'El turno de caja especificado no existe.';
    END IF;

    -- Enforce transaction timestamp buffer
    p_date := COALESCE(p_date, NOW());
    IF p_date > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La fecha de la transacción está fuera del rango permitido (no se permiten fechas futuras).';
    END IF;

    -- 1. Lock product rows (both direct products and combo components) in a deterministic order to prevent deadlocks
    PERFORM 1 FROM public.products
    WHERE id IN (
        SELECT DISTINCT ix."productId" 
        FROM jsonb_to_recordset(p_items) AS ix("productId" TEXT)
        WHERE ix."productId" IS NOT NULL
        UNION
        SELECT DISTINCT ci."productId"
        FROM jsonb_to_recordset(p_items) AS ix("productId" TEXT)
        JOIN public.combo_items ci ON ci."comboId" = ix."productId"
        WHERE ix."productId" IS NOT NULL
    )
    ORDER BY id
    FOR UPDATE;

    -- 2. Validate stock levels and execute decrement
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id TEXT, "productId" TEXT, name TEXT, price NUMERIC, qty NUMERIC)
    LOOP
        v_subtotal := v_subtotal + (item.price * item.qty);
        
        IF item."productId" IS NOT NULL THEN
            DECLARE
                v_is_combo BOOLEAN;
            BEGIN
                SELECT COALESCE("isCombo", FALSE) INTO v_is_combo 
                FROM public.products 
                WHERE id = item."productId";

                IF v_is_combo THEN
                    -- Stock and FEFO deduction for each component in the combo
                    DECLARE
                        v_comp RECORD;
                        v_comp_required NUMERIC;
                    BEGIN
                        FOR v_comp IN 
                            SELECT ci."productId" AS comp_id, ci.quantity AS comp_qty, p.name AS comp_name, p."controlLotes" AS comp_control_lotes, p.stock AS current_stock
                            FROM public.combo_items ci
                            JOIN public.products p ON p.id = ci."productId"
                            WHERE ci."comboId" = item."productId"
                        LOOP
                            v_comp_required := item.qty * v_comp.comp_qty;

                            IF v_comp.current_stock IS NULL OR v_comp.current_stock < v_comp_required THEN
                                RAISE EXCEPTION 'Stock insuficiente para el componente % del combo % (Disponible: %, Requerido: %)', 
                                    v_comp.comp_name, item.name, COALESCE(v_comp.current_stock, 0), v_comp_required;
                            END IF;

                            IF v_comp.comp_control_lotes THEN
                                DECLARE
                                    v_qty_to_deduct NUMERIC := v_comp_required;
                                    v_batch RECORD;
                                    v_batch_stock_sum NUMERIC;
                                BEGIN
                                    SELECT COALESCE(SUM(stock), 0) INTO v_batch_stock_sum
                                    FROM public.product_batches
                                    WHERE "productId" = v_comp.comp_id;

                                    IF v_batch_stock_sum < v_comp_required THEN
                                        RAISE EXCEPTION 'Stock insuficiente en los lotes para el componente % del combo %', 
                                            v_comp.comp_name, item.name;
                                    END IF;

                                    FOR v_batch IN 
                                        SELECT id, stock 
                                        FROM public.product_batches
                                        WHERE "productId" = v_comp.comp_id AND stock > 0
                                        ORDER BY "expirationDate" ASC, created_at ASC
                                        FOR UPDATE
                                    LOOP
                                        IF v_qty_to_deduct <= 0 THEN
                                            EXIT;
                                        END IF;

                                        IF v_batch.stock >= v_qty_to_deduct THEN
                                            UPDATE public.product_batches
                                            SET stock = stock - v_qty_to_deduct
                                            WHERE id = v_batch.id;
                                            v_qty_to_deduct := 0;
                                        ELSE
                                            UPDATE public.product_batches
                                            SET stock = 0
                                            WHERE id = v_batch.id;
                                            v_qty_to_deduct := v_qty_to_deduct - v_batch.stock;
                                        END IF;
                                    END LOOP;

                                    IF v_qty_to_deduct > 0 THEN
                                        RAISE EXCEPTION 'Stock insuficiente en los lotes para el componente % del combo %', 
                                            v_comp.comp_name, item.name;
                                    END IF;
                                END;
                            ELSE
                                UPDATE public.products 
                                SET stock = stock - v_comp_required 
                                WHERE id = v_comp.comp_id;
                            END IF;
                        END LOOP;
                    END;
                ELSE
                    -- Standard Single Product
                    DECLARE
                        v_control_lotes BOOLEAN;
                    BEGIN
                        SELECT stock, "controlLotes" INTO v_current_stock, v_control_lotes 
                        FROM public.products 
                        WHERE id = item."productId";
                        
                        IF v_current_stock IS NULL OR v_current_stock < item.qty THEN
                            RAISE EXCEPTION 'Stock insuficiente para el producto: % (Disponible: %, Requerido: %)', 
                                item.name, COALESCE(v_current_stock, 0), item.qty;
                        END IF;
                        
                        IF v_control_lotes THEN
                            -- FEFO Batch Deduction
                            DECLARE
                                v_qty_to_deduct NUMERIC := item.qty;
                                v_batch RECORD;
                                v_batch_stock_sum NUMERIC;
                            BEGIN
                                SELECT COALESCE(SUM(stock), 0) INTO v_batch_stock_sum
                                FROM public.product_batches
                                WHERE "productId" = item."productId";

                                IF v_batch_stock_sum < item.qty THEN
                                    RAISE EXCEPTION 'Stock insuficiente en los lotes para el producto: % (Disponible: %, Requerido: %)', 
                                        item.name, v_batch_stock_sum, item.qty;
                                END IF;

                                FOR v_batch IN 
                                    SELECT id, stock 
                                    FROM public.product_batches
                                    WHERE "productId" = item."productId" AND stock > 0
                                    ORDER BY "expirationDate" ASC, created_at ASC
                                    FOR UPDATE
                                LOOP
                                    IF v_qty_to_deduct <= 0 THEN
                                        EXIT;
                                    END IF;

                                    IF v_batch.stock >= v_qty_to_deduct THEN
                                        UPDATE public.product_batches
                                        SET stock = stock - v_qty_to_deduct
                                        WHERE id = v_batch.id;
                                        v_qty_to_deduct := 0;
                                    ELSE
                                        UPDATE public.product_batches
                                        SET stock = 0
                                        WHERE id = v_batch.id;
                                        v_qty_to_deduct := v_qty_to_deduct - v_batch.stock;
                                    END IF;
                                END LOOP;

                                IF v_qty_to_deduct > 0 THEN
                                    RAISE EXCEPTION 'Stock insuficiente en los lotes para el producto: %', item.name;
                                END IF;
                            END;
                        ELSE
                            -- Deduct directly from products stock
                            UPDATE public.products 
                            SET stock = stock - item.qty 
                            WHERE id = item."productId";
                        END IF;
                    END;
                END IF;
            END;
        END IF;
    END LOOP;

    -- 3. Calculate final total applying validated discount
    p_discount := COALESCE(p_discount, 0);
    IF p_discount < 0 OR p_discount > v_subtotal THEN
        RAISE EXCEPTION 'El descuento no puede ser negativo ni mayor al subtotal.';
    END IF;
    v_total := v_subtotal - p_discount;

    -- 4. Insert Sale including shiftId
    INSERT INTO public.sales (id, date, created_at, items, total, method, "customerId", "cashReceived", change, cost, "soldBy", "shiftId")
    VALUES (p_sale_id, p_date, p_date, p_items, v_total, p_method, p_customer_id, p_cash_received, p_change, p_cost, p_sold_by, p_shift_id);

    -- 5. Log shift movement and retroactively adjust closed shift totals
    IF p_method = 'efectivo' OR p_method = 'qr' THEN
        UPDATE public.shifts
        SET 
            movements = COALESCE(movements, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'id', extensions.gen_random_uuid()::text,
                    'date', p_date,
                    'type', CASE WHEN p_method = 'efectivo' THEN 'venta' ELSE 'venta_qr' END,
                    'amount', v_total,
                    'reason', CASE WHEN p_method = 'efectivo' THEN 'Venta en efectivo' ELSE 'Venta QR / Transf.' END || ' (' || jsonb_array_length(p_items) || ' art.)'
                )
            ),
            "closingTheoretical" = CASE 
                WHEN status = 'closed' THEN COALESCE("closingTheoretical", 0) + v_total 
                ELSE "closingTheoretical" 
            END,
            difference = CASE 
                WHEN status = 'closed' THEN COALESCE(difference, 0) - v_total 
                ELSE difference 
            END
        WHERE id = active_shift.id;
    END IF;

    -- 6. Registrar deuda de cliente si la venta es fiada
    IF p_method = 'fiado' AND p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
            RAISE EXCEPTION 'Cliente no encontrado.';
        END IF;
        
        SELECT string_agg(qty || 'x ' || name, ', ') INTO detail_desc
        FROM jsonb_to_recordset(p_items) AS x(name TEXT, qty NUMERIC);
        
        UPDATE public.customers
        SET entries = COALESCE(entries, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'id', extensions.gen_random_uuid()::text,
                'date', p_date,
                'type', 'compra',
                'amount', v_total,
                'detail', detail_desc
            )
        )
        WHERE id = p_customer_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ, TEXT, NUMERIC) TO authenticated;

-- 3. Proteger costo contra 0 en receive_goods_rpc
DROP FUNCTION IF EXISTS public.receive_goods_rpc(TEXT, NUMERIC, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.receive_goods_rpc(
    p_supplier_id TEXT,
    p_amount NUMERIC,
    p_detail TEXT,
    p_paid_cash BOOLEAN,
    p_date TIMESTAMPTZ,
    p_shift_id TEXT,
    p_items JSONB DEFAULT '[]'::jsonb
) RETURNS VOID AS $$
DECLARE
    supplier_name TEXT;
    active_shift RECORD;
    v_entries JSONB;
BEGIN
    -- 1. Security Check (Only admin/repositor/cajero allowed)
    IF NOT public.has_role('administrador', 'repositor', 'cajero') THEN
        RAISE EXCEPTION 'Unauthorized role execution.';
    END IF;

    -- 2. Enforce transaction timestamp buffer
    p_date := COALESCE(p_date, NOW());
    IF p_date > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La fecha de la transacción está fuera del rango permitido (no se permiten fechas futuras).';
    END IF;

    IF p_supplier_id IS NOT NULL AND p_supplier_id <> '' THEN
        SELECT name INTO supplier_name FROM public.suppliers WHERE id = p_supplier_id;
        IF supplier_name IS NULL THEN
            RAISE EXCEPTION 'Proveedor no encontrado.';
        END IF;
    END IF;

    -- Update products stock/cost and handle batches
    DECLARE
        item RECORD;
    BEGIN
        FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
            "productId" TEXT, 
            name TEXT, 
            qty NUMERIC, 
            "totalUnits" NUMERIC, 
            cost NUMERIC, 
            "batchCode" TEXT, 
            "expirationDate" TIMESTAMPTZ
        )
        LOOP
            IF item."productId" IS NOT NULL THEN
                DECLARE
                    v_control_lotes BOOLEAN;
                    v_calculated_unit_cost NUMERIC;
                BEGIN
                    -- Get controlLotes status
                    SELECT "controlLotes" INTO v_control_lotes 
                    FROM public.products 
                    WHERE id = item."productId";
                    
                    IF v_control_lotes IS NULL THEN
                        RAISE EXCEPTION 'Producto con ID % no encontrado.', item."productId";
                    END IF;

                    -- Calculate unit cost and round it to 2 decimals
                    IF item."totalUnits" > 0 THEN
                        v_calculated_unit_cost := ROUND(item.cost / item."totalUnits", 2);
                    ELSE
                        v_calculated_unit_cost := 0;
                    END IF;

                    -- Update product cost (keep current cost if line has no cost)
                    UPDATE public.products 
                    SET cost = CASE WHEN v_calculated_unit_cost > 0 THEN v_calculated_unit_cost ELSE cost END
                    WHERE id = item."productId";

                    IF NOT v_control_lotes THEN
                        -- Update product stock directly
                        UPDATE public.products 
                        SET stock = stock + item."totalUnits"
                        WHERE id = item."productId";
                    ELSE
                        -- Upsert batch details
                        IF item."batchCode" IS NULL OR item."batchCode" = '' OR item."expirationDate" IS NULL THEN
                            RAISE EXCEPTION 'El producto % requiere lote y fecha de vencimiento.', item.name;
                        END IF;

                        INSERT INTO public.product_batches (id, "productId", "batchCode", "expirationDate", stock)
                        VALUES (
                            extensions.gen_random_uuid()::text, 
                            item."productId", 
                            item."batchCode", 
                            item."expirationDate", 
                            item."totalUnits"
                        )
                        ON CONFLICT ("productId", "batchCode") 
                        DO UPDATE SET stock = public.product_batches.stock + EXCLUDED.stock;
                    END IF;
                END;
            END IF;
        END LOOP;
    END;

    v_entries := jsonb_build_array(
        jsonb_build_object(
            'id', extensions.gen_random_uuid()::text,
            'date', p_date,
            'type', 'factura',
            'amount', p_amount,
            'detail', p_detail,
            'paidCash', p_paid_cash,
            'items', p_items
        )
    );
    
    IF p_paid_cash THEN
        v_entries := v_entries || jsonb_build_array(
            jsonb_build_object(
                'id', extensions.gen_random_uuid()::text,
                'date', p_date,
                'type', 'pago',
                'amount', p_amount,
                'detail', 'Pago contado: ' || p_detail
            )
        );
    END IF;

    IF p_supplier_id IS NOT NULL AND p_supplier_id <> '' THEN
        UPDATE public.suppliers
        SET entries = COALESCE(entries, '[]'::jsonb) || v_entries
        WHERE id = p_supplier_id;
    END IF;

    IF p_paid_cash THEN
        SELECT * INTO active_shift FROM public.shifts WHERE id = p_shift_id;
        IF active_shift.id IS NULL THEN
            RAISE EXCEPTION 'El turno de caja especificado no existe.';
        END IF;

        UPDATE public.shifts
        SET 
            movements = COALESCE(movements, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'id', extensions.gen_random_uuid()::text,
                    'date', p_date,
                    'type', 'pago_proveedor',
                    'amount', -ABS(p_amount),
                    'reason', 'Pago contado - ' || supplier_name
                )
            ),
            "closingTheoretical" = CASE 
                WHEN status = 'closed' THEN COALESCE("closingTheoretical", 0) - ABS(p_amount) 
                ELSE "closingTheoretical" 
            END,
            difference = CASE 
                WHEN status = 'closed' THEN COALESCE(difference, 0) + ABS(p_amount) 
                ELSE difference 
            END
        WHERE id = active_shift.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.receive_goods_rpc(TEXT, NUMERIC, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receive_goods_rpc(TEXT, NUMERIC, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT, JSONB) TO authenticated;
