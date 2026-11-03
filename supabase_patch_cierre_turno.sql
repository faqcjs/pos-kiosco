-- =========================================================================
-- PARCHE SQL: PERMITIR CERRAR TURNOS (RLS de shifts)
-- Ejecutar este script en el SQL Editor de Supabase (primero en dev)
--
-- Error que corrige: "new row violates row-level security policy for
-- table shifts" al cerrar un turno.
-- El WITH CHECK exigía status = 'open' sobre la fila ya modificada, y
-- cerrar un turno es justamente pasarla a 'closed'.
-- Ahora solo el USING exige que el turno esté abierto: se puede modificar
-- (y cerrar) un turno abierto propio o siendo administrador; un turno ya
-- cerrado no se puede modificar desde la app.
-- =========================================================================

DROP POLICY IF EXISTS "Allow update shifts for shift owner or admin" ON public.shifts;

CREATE POLICY "Allow update shifts for shift owner or admin"
    ON public.shifts FOR UPDATE TO authenticated
    USING (
        status = 'open' AND (
            "openedBy" = (SELECT username FROM public.users WHERE id = auth.uid()) OR
            public.has_role('administrador')
        )
    )
    -- No status check here: the new row may be closed (closing a shift).
    WITH CHECK (
        "openedBy" = (SELECT username FROM public.users WHERE id = auth.uid()) OR
        public.has_role('administrador')
    );
