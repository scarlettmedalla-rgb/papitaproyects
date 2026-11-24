-- ============================================================================
-- PIDE Y COMPITE — Plataforma de Subastas Inversas en Vivo
-- Esquema Relacional + Geoespacial (PostgreSQL / Supabase + PostGIS + RLS)
-- ============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 2. ENTIDADES PRINCIPALES
-- ============================================================================

-- 2.1 USERS (Sistema unificado Comprador <-> Proveedor)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role_active TEXT NOT NULL DEFAULT 'buyer' CHECK (role_active IN ('buyer', 'provider')),
  rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  saved_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 PROVIDER_PROFILES (Comercios locales y técnicos independientes)
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geo_point GEOGRAPHY(Point, 4326),
  coverage_radius_km NUMERIC(4, 1) NOT NULL DEFAULT 5.0 CHECK (coverage_radius_km >= 1 AND coverage_radius_km <= 20),
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  verified_status TEXT NOT NULL DEFAULT 'verified' CHECK (verified_status IN ('pending', 'verified', 'rejected')),
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  completed_orders_count INTEGER NOT NULL DEFAULT 0,
  total_bids_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_geo ON public.provider_profiles USING GIST (geo_point);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_categories ON public.provider_profiles USING GIN (categories);

-- 2.3 AUTO_BID_RULES (Piloto Automático — Cero Salas Vacías)
CREATE TABLE IF NOT EXISTS public.auto_bid_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(user_id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  max_distance_km NUMERIC(4, 1) NOT NULL DEFAULT 5.0 CHECK (max_distance_km >= 0.5 AND max_distance_km <= 20),
  min_budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 50),
  default_benefits TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(default_benefits) <= 3),
  active_hours_start TIME NOT NULL DEFAULT '00:00',
  active_hours_end TIME NOT NULL DEFAULT '23:59',
  delay_seconds INTEGER NOT NULL DEFAULT 6 CHECK (delay_seconds >= 1 AND delay_seconds <= 10),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_bid_rules_provider ON public.auto_bid_rules(provider_id, is_active);

-- 2.4 MISSIONS (Necesidades urgentes o programadas publicadas por compradores)
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  urgency_tags TEXT[] NOT NULL DEFAULT '{}',
  media_url TEXT,
  address_label TEXT NOT NULL DEFAULT 'Ubicación GPS actual',
  mode TEXT NOT NULL DEFAULT 'flash' CHECK (mode IN ('flash', 'scheduled')),
  duration_seconds INTEGER NOT NULL DEFAULT 300 CHECK (duration_seconds >= 30 AND duration_seconds <= 3600),
  expires_at TIMESTAMPTZ NOT NULL,
  max_budget NUMERIC(12, 2) NOT NULL CHECK (max_budget > 0),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geo_point GEOGRAPHY(Point, 4326),
  is_group_pool BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'completed', 'cancelled')),
  extra_time_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_geo ON public.missions USING GIST (geo_point);
CREATE INDEX IF NOT EXISTS idx_missions_status_category ON public.missions(status, category, expires_at);

-- 2.5 GROUP_POOL_MEMBERS (Modo "Vaquita Grupal" colaborativa en vivo)
CREATE TABLE IF NOT EXISTS public.group_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🙋',
  contribution_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (contribution_amount >= 0),
  voted_bid_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_pool_mission ON public.group_pool_members(mission_id);

-- 2.6 BIDS (Pujas en tiempo real con hasta 3 Cartas de Beneficio)
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  benefit_cards TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(benefit_cards) <= 3),
  eta_minutes INTEGER NOT NULL DEFAULT 25 CHECK (eta_minutes >= 1 AND eta_minutes <= 240),
  is_auto_bid BOOLEAN NOT NULL DEFAULT FALSE,
  value_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mission_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_bids_mission_score ON public.bids(mission_id, value_score DESC);

-- FK diferida para votos de la Vaquita Grupal
ALTER TABLE public.group_pool_members
  DROP CONSTRAINT IF EXISTS fk_group_pool_voted_bid;
ALTER TABLE public.group_pool_members
  ADD CONSTRAINT fk_group_pool_voted_bid
  FOREIGN KEY (voted_bid_id) REFERENCES public.bids(id) ON DELETE SET NULL;

-- 2.7 ORDERS (Escudo de Compromiso / Escrow y Validación QR)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID UNIQUE NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  winning_bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(user_id) ON DELETE RESTRICT,
  escrow_amount NUMERIC(12, 2) NOT NULL CHECK (escrow_amount > 0),
  qr_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  fulfillment_status TEXT NOT NULL DEFAULT 'preparing' CHECK (
    fulfillment_status IN ('preparing', 'on_the_way', 'at_doorstep', 'completed')
  ),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 MESSAGES (Sala de Ejecución — Chat en tiempo real con fotos)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_order_created ON public.messages(order_id, created_at ASC);

-- 2.9 REVIEWS (Calificación mutua 1 a 5 estrellas + etiquetas rápidas)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, reviewer_id)
);

-- ============================================================================
-- 3. FUNCIONES GEOESPACIALES Y TRIGGERS DE REGLAS DE NEGOCIO
-- ============================================================================

-- 3.1 Sincronizar automáticamente geo_point desde lat/lng
CREATE OR REPLACE FUNCTION public.sync_geo_point()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provider_geo ON public.provider_profiles;
CREATE TRIGGER trg_provider_geo
BEFORE INSERT OR UPDATE OF lat, lng ON public.provider_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_geo_point();

DROP TRIGGER IF EXISTS trg_mission_geo ON public.missions;
CREATE TRIGGER trg_mission_geo
BEFORE INSERT OR UPDATE OF lat, lng ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.sync_geo_point();

-- 3.2 Regla de Tiempo Extra (+30s en últimos 10s) + Cálculo de Value Score
CREATE OR REPLACE FUNCTION public.handle_bid_upsert()
RETURNS TRIGGER AS $$
DECLARE
  v_mission public.missions%ROWTYPE;
  v_rating NUMERIC;
  v_savings_ratio NUMERIC;
  v_benefit_bonus NUMERIC;
  v_eta_bonus NUMERIC;
BEGIN
  SELECT * INTO v_mission FROM public.missions WHERE id = NEW.mission_id FOR UPDATE;
  IF v_mission.status <> 'open' THEN
    RAISE EXCEPTION 'La misión ya no acepta ofertas.';
  END IF;

  SELECT COALESCE(rating_avg, 4.5) INTO v_rating FROM public.users WHERE id = NEW.provider_id;

  -- Cálculo del Value Score (Ahorro + Cartas de Beneficio + Calificación + ETA)
  v_savings_ratio := GREATEST(0, (v_mission.max_budget - NEW.amount) / NULLIF(v_mission.max_budget, 0));
  v_benefit_bonus := cardinality(NEW.benefit_cards) * 11.5;
  v_eta_bonus := GREATEST(0, (60 - NEW.eta_minutes) * 0.25);
  NEW.value_score := ROUND((50 + (v_savings_ratio * 90) + v_benefit_bonus + (v_rating * 6) + v_eta_bonus)::numeric, 2);

  -- Regla de Tiempo Extra: si faltan <= 10 segundos, extender +30 segundos
  IF (v_mission.expires_at - NOW()) <= INTERVAL '10 seconds' AND v_mission.expires_at > NOW() THEN
    UPDATE public.missions
    SET expires_at = expires_at + INTERVAL '30 seconds',
        extra_time_count = extra_time_count + 1
    WHERE id = NEW.mission_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bid_upsert ON public.bids;
CREATE TRIGGER trg_bid_upsert
BEFORE INSERT OR UPDATE ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.handle_bid_upsert();

-- 3.3 RPC Geoespacial: Radar de Oportunidades para un Proveedor por Radio en KM
CREATE OR REPLACE FUNCTION public.get_radar_missions(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_categories TEXT[]
)
RETURNS TABLE (
  mission_id UUID,
  title TEXT,
  category TEXT,
  max_budget NUMERIC,
  expires_at TIMESTAMPTZ,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.title,
    m.category,
    m.max_budget,
    m.expires_at,
    ROUND((ST_Distance(
      m.geo_point,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000.0)::numeric, 2) AS distance_km
  FROM public.missions m
  WHERE m.status = 'open'
    AND m.expires_at > NOW()
    AND (cardinality(p_categories) = 0 OR m.category = ANY(p_categories))
    AND ST_DWithin(
      m.geo_point,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000.0
    )
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.4 RPC Atómico: Validación QR y Liberación de Escrow al Proveedor
CREATE OR REPLACE FUNCTION public.verify_qr_and_release_escrow(
  p_order_id UUID,
  p_qr_token TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.qr_token <> p_qr_token OR v_order.fulfillment_status = 'completed' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.orders
  SET fulfillment_status = 'completed',
      completed_at = NOW()
  WHERE id = p_order_id;

  UPDATE public.missions
  SET status = 'completed'
  WHERE id = v_order.mission_id;

  UPDATE public.provider_profiles
  SET balance = balance + v_order.escrow_amount,
      completed_orders_count = completed_orders_count + 1
  WHERE user_id = v_order.provider_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.5 Actualizar promedio de estrellas automáticamente tras cada reseña
CREATE OR REPLACE FUNCTION public.recalculate_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET rating_avg = (
    SELECT ROUND(AVG(stars)::numeric, 2)
    FROM public.reviews
    WHERE target_id = NEW.target_id
  )
  WHERE id = NEW.target_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_rating ON public.reviews;
CREATE TRIGGER trg_review_rating
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recalculate_user_rating();

-- ============================================================================
-- 4. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_bid_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users: lectura pública de perfil básico, escritura solo del dueño
CREATE POLICY "Perfiles visibles para usuarios autenticados" ON public.users
  FOR SELECT USING (true);
CREATE POLICY "Usuario edita su propio perfil" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Provider Profiles: lectura pública para mostrar en podio, edición solo del comercio dueño
CREATE POLICY "Comercios visibles públicamente" ON public.provider_profiles
  FOR SELECT USING (true);
CREATE POLICY "Comercio gestiona su perfil" ON public.provider_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Auto Bid Rules: privadas de cada proveedor
CREATE POLICY "Proveedor gestiona sus reglas de piloto automático" ON public.auto_bid_rules
  FOR ALL USING (auth.uid() = provider_id);

-- Missions: visibles para todos en el radar/vaquita, creadas/editadas por su comprador
CREATE POLICY "Misiones visibles en vivo" ON public.missions
  FOR SELECT USING (true);
CREATE POLICY "Comprador crea misiones" ON public.missions
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Comprador actualiza su misión" ON public.missions
  FOR UPDATE USING (auth.uid() = buyer_id);

-- Group Pool Members: lectura y participación en misiones con is_group_pool = true
CREATE POLICY "Miembros de vaquita visibles" ON public.group_pool_members
  FOR SELECT USING (true);
CREATE POLICY "Invitados pueden sumarse a vaquita activa" ON public.group_pool_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_id AND m.is_group_pool = TRUE AND m.status = 'open'
    )
  );
CREATE POLICY "Participantes actualizan aporte o voto" ON public.group_pool_members
  FOR UPDATE USING (true);

-- Bids: lectura en vivo en el podio, inserción/mejora solo por proveedores verificados
CREATE POLICY "Pujas visibles en sala de subasta" ON public.bids
  FOR SELECT USING (true);
CREATE POLICY "Proveedor verificado envía pujas" ON public.bids
  FOR INSERT WITH CHECK (
    auth.uid() = provider_id AND
    EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.user_id = auth.uid() AND p.is_online = TRUE
    )
  );
CREATE POLICY "Proveedor mejora su propia puja" ON public.bids
  FOR UPDATE USING (auth.uid() = provider_id);

-- Orders: accesibles únicamente para el comprador y el proveedor adjudicado
CREATE POLICY "Participantes ven su orden y escrow" ON public.orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = provider_id);
CREATE POLICY "Comprador adjudica orden" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participantes actualizan estado de orden" ON public.orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = provider_id);

-- Messages: chat privado entre comprador y proveedor de la orden
CREATE POLICY "Chat privado de la orden" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.provider_id = auth.uid())
    )
  );
CREATE POLICY "Enviar mensaje en orden activa" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.provider_id = auth.uid())
    )
  );

-- Reviews: lectura pública de reputación, creación solo por participantes de orden completada
CREATE POLICY "Reseñas visibles públicamente" ON public.reviews
  FOR SELECT USING (true);
CREATE POLICY "Participantes califican orden completada" ON public.reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.fulfillment_status = 'completed'
        AND (o.buyer_id = auth.uid() OR o.provider_id = auth.uid())
    )
  );

-- ============================================================================
-- 5. REALTIME CHANNELS (WebSockets Bidireccionales)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.missions,
  public.group_pool_members,
  public.bids,
  public.orders,
  public.messages;
