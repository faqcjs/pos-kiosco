-- =========================================================================
-- PARCHE SQL: GASTOS OPERATIVOS
-- Ejecutar este script en el SQL Editor de Supabase (primero en dev,
-- después de supabase_patch_dueno_turno.sql)
--
-- Crea la tabla "expenses" (sueldos, alquiler, servicios, impuestos, otros)
-- y la función register_expense_rpc, que guarda el gasto y, si se pagó con
-- la caja del turno, el egreso del turno en la misma transacción.
--
-- Permisos:
--  - Solo el administrador ve y carga gastos desde la tabla.
--  - El cajero solo puede crear un gasto con origen 'turno' a través de
--    register_expense_rpc, en su propio turno abierto.
--  - Los gastos con origen 'turno' no se editan ni se borran desde la
--    tabla, para no desarmar el arqueo de ese turno.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    category TEXT NOT NULL
        CHECK (category IN ('sueldos', 'alquiler', 'servicios', 'impuestos', 'otros')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    description TEXT,
    -- Month the expense belongs to (first day of the month)
    period DATE NOT NULL CHECK (EXTRACT(DAY FROM period) = 1),
    "paidAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    origin TEXT NOT NULL
        CHECK (origin IN ('turno', 'efectivo_acumulado', 'transferencia')),
    "shiftId" TEXT REFERENCES public.shifts(id) ON DELETE CASCADE,
    -- Id of the shift movement created for origin 'turno'
    "movementId" TEXT,
    "createdBy" TEXT,
    CONSTRAINT expenses_shift_matches_origin
        CHECK ((origin = 'turno') = ("shiftId" IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_expenses_period ON public.expenses (period);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read expenses for administrators" ON public.expenses;
CREATE POLICY "Allow read expenses for administrators"
    ON public.expenses FOR SELECT TO authenticated
    USING (public.has_role('administrador'));

-- Direct inserts are only for expenses paid outside the cash register;
-- origin 'turno' must go through register_expense_rpc.
DROP POLICY IF EXISTS "Allow insert expenses for administrators" ON public.expenses;
CREATE POLICY "Allow insert expenses for administrators"
    ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (public.has_role('administrador') AND origin <> 'turno');

DROP POLICY IF EXISTS "Allow update expenses for administrators" ON public.expenses;
CREATE POLICY "Allow update expenses for administrators"
    ON public.expenses FOR UPDATE TO authenticated
    USING (public.has_role('administrador') AND origin <> 'turno')
    WITH CHECK (public.has_role('administrador') AND origin <> 'turno');

DROP POLICY IF EXISTS "Allow delete expenses for administrators" ON public.expenses;
CREATE POLICY "Allow delete expenses for administrators"
    ON public.expenses FOR DELETE TO authenticated
    USING (public.has_role('administrador') AND origin <> 'turno');

-- -------------------------------------------------------------------------
-- register_expense_rpc
-- Saves an expense. For origin 'turno' it also appends a 'gasto' movement
-- (negative amount) to the open shift, atomically.
-- Idempotent on p_expense_id so offline replays never duplicate it.
-- -------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_expense_rpc(TEXT, TEXT, NUMERIC, TEXT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.register_expense_rpc(
    p_expense_id TEXT,
    p_category TEXT,
    p_amount NUMERIC,
    p_description TEXT,
    p_period DATE,
    p_paid_at TIMESTAMPTZ,
    p_origin TEXT,
    p_shift_id TEXT,
    p_movement_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_username TEXT;
    v_is_admin BOOLEAN;
    v_shift RECORD;
    v_movement_id TEXT;
    v_reason TEXT;
BEGIN
    IF NOT public.has_role('administrador', 'cajero') THEN
        RAISE EXCEPTION 'Unauthorized role execution.';
    END IF;

    -- Already registered (offline replay): nothing to do
    IF EXISTS (SELECT 1 FROM public.expenses WHERE id = p_expense_id) THEN
        RETURN;
    END IF;

    v_is_admin := public.has_role('administrador');
    SELECT username INTO v_username FROM public.users WHERE id = auth.uid();

    IF NOT v_is_admin AND p_origin <> 'turno' THEN
        RAISE EXCEPTION 'Solo el administrador puede cargar gastos pagados fuera de la caja.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto del gasto debe ser mayor a cero.';
    END IF;

    p_paid_at := COALESCE(p_paid_at, NOW());
    IF p_paid_at > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La fecha de la transacción está fuera del rango permitido (no se permiten fechas futuras).';
    END IF;

    -- Default period: month of the payment
    p_period := date_trunc('month', COALESCE(p_period, (p_paid_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date))::date;

    IF p_origin = 'turno' THEN
        SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
        IF v_shift.id IS NULL THEN
            RAISE EXCEPTION 'El turno de caja especificado no existe.';
        END IF;
        IF v_shift.status <> 'open' THEN
            RAISE EXCEPTION 'El turno de caja está cerrado.';
        END IF;
        IF NOT v_is_admin AND COALESCE(v_shift."openedByUser", v_shift."openedBy") IS DISTINCT FROM v_username THEN
            RAISE EXCEPTION 'Solo podés registrar gastos en tu propio turno.';
        END IF;

        v_movement_id := COALESCE(p_movement_id, extensions.gen_random_uuid()::text);
        v_reason := 'Gasto (' || p_category || ')' ||
            CASE WHEN COALESCE(p_description, '') <> '' THEN ' - ' || p_description ELSE '' END;

        UPDATE public.shifts
        SET movements = COALESCE(movements, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'id', v_movement_id,
                'date', p_paid_at,
                'type', 'gasto',
                'amount', -ABS(p_amount),
                'reason', v_reason,
                'expenseId', p_expense_id
            )
        )
        WHERE id = v_shift.id;
    ELSE
        p_shift_id := NULL;
    END IF;

    INSERT INTO public.expenses (
        id, category, amount, description, period, "paidAt", origin, "shiftId", "movementId", "createdBy"
    ) VALUES (
        p_expense_id, p_category, ABS(p_amount), NULLIF(p_description, ''), p_period, p_paid_at,
        p_origin, p_shift_id, v_movement_id, v_username
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

REVOKE EXECUTE ON FUNCTION public.register_expense_rpc(TEXT, TEXT, NUMERIC, TEXT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_expense_rpc(TEXT, TEXT, NUMERIC, TEXT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;

-- Realtime updates for the expenses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'expenses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    END IF;
END $$;
