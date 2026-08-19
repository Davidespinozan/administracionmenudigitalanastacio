-- ═══════════════════════════════════════════════════════════════════════
-- Anastacio — método de pago + endurecimiento de RLS
-- Correr COMPLETO en Supabase Dashboard → SQL Editor (una sola vez).
--
-- Por qué:
-- 1) Los pedidos por WhatsApp no se guardaban; el menú empezará a
--    insertarlos con payment_method='whatsapp'. El webhook de Stripe
--    marcará 'stripe'. Este script crea la columna y hace backfill.
-- 2) TRACKING_SETUP.md creó "Allow anon read" en page_views: cualquiera
--    con la anon key (pública en el HTML) puede leer los datos. Este
--    script quita SELECT/UPDATE/DELETE de anon/public en las 4 tablas y
--    deja: INSERT para anon (lo que el menú necesita) y SELECT para
--    authenticated (lo que el admin necesita), más UPDATE de orders
--    para authenticated (cambiar status desde el admin).
--
-- Orden de despliegue: 1º este SQL → 2º menú → 3º redeploy smart-function
-- → 4º admin. El script es idempotente: correrlo dos veces no daña nada.
--
-- Verificado (2026-08-19): el menú público (~/anastacio-1) solo hace
-- INSERTs (leads, page_views, pixel_events) — ningún SELECT. Quitar la
-- lectura anónima NO puede romper el menú. El webhook de Stripe usa
-- service_role, que ignora RLS, así que tampoco se afecta.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Columna payment_method + backfill ────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;

-- Todo pedido existente entró por el webhook de Stripe (tiene session id)
UPDATE public.orders
SET payment_method = 'stripe'
WHERE payment_method IS NULL AND stripe_session_id IS NOT NULL;

-- ── 2. RLS activo en las 4 tablas ───────────────────────────────────────
ALTER TABLE public.orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_events ENABLE ROW LEVEL SECURITY;

-- ── 3. Quitar todo lo que no sea INSERT para anon/public ────────────────
-- (se dropean también políticas ALL; el INSERT necesario se repone abajo)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('orders','leads','page_views','pixel_events')
      AND cmd IN ('SELECT','UPDATE','DELETE','ALL')
      AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    RAISE NOTICE 'DROP: % en %', p.policyname, p.tablename;
  END LOOP;
END $$;

-- ── 4. Reponer lo que el menú público SÍ necesita: solo INSERT ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='anon_insert_orders') THEN
    CREATE POLICY anon_insert_orders ON public.orders FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='leads' AND policyname='anon_insert_leads') THEN
    CREATE POLICY anon_insert_leads ON public.leads FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='page_views' AND policyname='anon_insert_page_views') THEN
    CREATE POLICY anon_insert_page_views ON public.page_views FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pixel_events' AND policyname='anon_insert_pixel_events') THEN
    CREATE POLICY anon_insert_pixel_events ON public.pixel_events FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- ── 5. Lo que el admin (usuario logueado) necesita ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='auth_read_orders') THEN
    CREATE POLICY auth_read_orders ON public.orders FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='leads' AND policyname='auth_read_leads') THEN
    CREATE POLICY auth_read_leads ON public.leads FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='page_views' AND policyname='auth_read_page_views') THEN
    CREATE POLICY auth_read_page_views ON public.page_views FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pixel_events' AND policyname='auth_read_pixel_events') THEN
    CREATE POLICY auth_read_pixel_events ON public.pixel_events FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='auth_update_orders') THEN
    CREATE POLICY auth_update_orders ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- ── 6. VERIFICACIÓN — revisar que el resultado sea exactamente esto:
--    · cada tabla: INSERT→{anon} y SELECT→{authenticated}
--    · orders además: UPDATE→{authenticated}
--    · NINGUNA fila con SELECT/UPDATE/DELETE para {anon} o {public}
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('orders','leads','page_views','pixel_events')
ORDER BY tablename, cmd, policyname;
