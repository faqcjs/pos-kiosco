-- =========================================================================
-- PARCHE SQL: COSTO PROMEDIO PONDERADO EN COMPRAS
-- Ejecutar este script en el SQL Editor de Supabase
-- (después de supabase_patch_ganancias_arqueo.sql)
--
-- Al recibir mercadería, el costo del producto pasa a ser el promedio
-- ponderado entre el stock existente y lo comprado, en lugar de pisarse
-- con el costo de la última compra.
-- No modifica costos ya guardados: aplica desde la próxima compra.
-- =========================================================================

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

                    -- Weighted average cost, computed before adding the new stock.
                    -- Keeps the current cost if the line has no cost.
                    -- Same rule as src/lib/purchase-cost.js: keep both in sync.
                    UPDATE public.products
                    SET cost = CASE
                        WHEN v_calculated_unit_cost <= 0 THEN cost
                        WHEN GREATEST(COALESCE(stock, 0), 0) = 0 OR COALESCE(cost, 0) <= 0 THEN v_calculated_unit_cost
                        ELSE ROUND(
                            (GREATEST(stock, 0) * cost + item."totalUnits" * v_calculated_unit_cost)
                            / (GREATEST(stock, 0) + item."totalUnits"),
                            2
                        )
                    END
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
