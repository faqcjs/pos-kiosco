-- =========================================================================
-- PARCHE SQL: DUEÑO DEL TURNO = USUARIO LOGUEADO
-- Ejecutar este script en el SQL Editor de Supabase (primero en dev,
-- después de supabase_patch_cierre_turno.sql)
--
-- Problema: "openedBy" guarda el nombre que el cajero escribe al abrir el
-- turno, pero la política RLS lo comparaba con el username. Si no
-- coincidían, el cajero no podía registrar movimientos ni cerrar su propio
-- turno (el update no modificaba nada, sin error).
--
-- Solución: nueva columna "openedByUser" con el username del usuario
-- logueado, completada por un trigger al crear el turno (el cliente no la
-- puede falsear). "openedBy" sigue guardando el nombre escrito, que se usa
-- para mostrar y para las métricas por empleado.
-- Turnos anteriores (sin "openedByUser") siguen usando "openedBy".
-- =========================================================================

ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS "openedByUser" TEXT;

CREATE OR REPLACE FUNCTION public.set_shift_owner()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
BEGIN
    SELECT username INTO v_username FROM public.users WHERE id = auth.uid();
    -- Only trust the logged-in user; keep the value for service-role inserts
    IF v_username IS NOT NULL THEN
        NEW."openedByUser" := v_username;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_shift_owner_before_insert ON public.shifts;
CREATE TRIGGER set_shift_owner_before_insert
    BEFORE INSERT ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.set_shift_owner();

DROP POLICY IF EXISTS "Allow update shifts for shift owner or admin" ON public.shifts;

CREATE POLICY "Allow update shifts for shift owner or admin"
    ON public.shifts FOR UPDATE TO authenticated
    USING (
        status = 'open' AND (
            COALESCE("openedByUser", "openedBy") = (SELECT username FROM public.users WHERE id = auth.uid()) OR
            public.has_role('administrador')
        )
    )
    -- No status check here: the new row may be closed (closing a shift).
    WITH CHECK (
        COALESCE("openedByUser", "openedBy") = (SELECT username FROM public.users WHERE id = auth.uid()) OR
        public.has_role('administrador')
    );
