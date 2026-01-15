-- ============================================
-- STREAM PROVIDERS TABLE
-- Sistema di monitoring per provider di streaming
-- ============================================

-- Drop existing table if exists (for development)
-- DROP TABLE IF EXISTS stream_providers;

CREATE TABLE stream_providers (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Provider Identity
    key TEXT UNIQUE NOT NULL,              -- Identificatore univoco (es. 'vixsrc', 'vidsrcCc')
    name TEXT NOT NULL,                    -- Nome human-readable (es. 'VixSrc', 'VidSrc.cc')
    host TEXT NOT NULL,                    -- URL base (es. 'https://vixsrc.to')
    family TEXT NOT NULL CHECK (family IN ('query-tmdb', 'path-tmdb', 'path-imdb', 'videoid-tmdb')),
    
    -- URL Templates
    movie_path_template TEXT,              -- Template per film (es. '/movie/{id}')
    tv_path_template TEXT,                 -- Template per TV (es. '/tv/{id}/{season}/{episode}')
    extra_params JSONB DEFAULT '{}'::jsonb, -- Parametri extra specifici del provider
    
    -- Manual Controls (Admin UI)
    is_active BOOLEAN DEFAULT true,        -- Abilitato manualmente dall'admin
    priority INTEGER DEFAULT 100,          -- Ordine di preferenza (1 = più alto)
    notes TEXT,                            -- Note manuali (es. 'molte ads', 'UI pulita')
    
    -- Health Status (Monitor Service)
    is_healthy BOOLEAN DEFAULT false,      -- Ultimo health check passato
    status_code INTEGER,                   -- Ultimo HTTP status code
    response_time_ms INTEGER,              -- Tempo di risposta in ms
    success_rate_24h NUMERIC(5,2) DEFAULT 0.00, -- % successo ultime 24h (0.00 - 100.00)
    consecutive_failures INTEGER DEFAULT 0, -- Fallimenti consecutivi
    
    -- Timestamps
    last_check_at TIMESTAMPTZ,             -- Ultimo health check
    last_success_at TIMESTAMPTZ,           -- Ultimo check riuscito
    last_failure_reason TEXT,              -- Motivo ultimo fallimento
    
    -- Capabilities
    supports_movies BOOLEAN DEFAULT true,  -- Supporta film
    supports_tv BOOLEAN DEFAULT true,      -- Supporta serie TV
    requires_imdb BOOLEAN DEFAULT false,   -- Richiede IMDB ID invece di TMDB
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Query frequente: provider attivi e healthy ordinati per priorità
CREATE INDEX idx_stream_providers_active_healthy 
ON stream_providers(is_active, is_healthy, priority);

-- Query per tipo di contenuto
CREATE INDEX idx_stream_providers_movies 
ON stream_providers(is_active, is_healthy, supports_movies) 
WHERE supports_movies = true;

CREATE INDEX idx_stream_providers_tv 
ON stream_providers(is_active, is_healthy, supports_tv) 
WHERE supports_tv = true;

-- Query per key (lookup veloce)
CREATE INDEX idx_stream_providers_key ON stream_providers(key);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_stream_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stream_providers_updated_at
    BEFORE UPDATE ON stream_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_stream_providers_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE stream_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Tutti possono leggere (per frontend)
CREATE POLICY "stream_providers_select_all" 
ON stream_providers
FOR SELECT
USING (true);

-- Policy: Solo service_role può inserire (Monitor Service)
CREATE POLICY "stream_providers_insert_service" 
ON stream_providers
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Policy: Solo service_role può aggiornare (Monitor Service + Admin)
CREATE POLICY "stream_providers_update_service" 
ON stream_providers
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Policy: Solo service_role può eliminare
CREATE POLICY "stream_providers_delete_service" 
ON stream_providers
FOR DELETE
USING (auth.role() = 'service_role');

-- ============================================
-- SEED DATA: Provider Iniziali
-- ============================================

INSERT INTO stream_providers (key, name, host, family, movie_path_template, tv_path_template, priority, notes) VALUES
-- Priority 1: VixSrc (UI pulita, stabile)
('vixsrc', 'VixSrc', 'https://vixsrc.to', 'path-tmdb', 
 '/movie/{id}', '/tv/{id}/{season}/{episode}', 
 1, 'UI pulita, stabile, raccomandato'),

-- Priority 2: VidSrc.cc (il nostro storico primary)
('vidsrcCc', 'VidSrc.cc', 'https://vidsrc.cc', 'path-tmdb', 
 '/v2/embed/movie/{id}', '/v2/embed/tv/{id}/{season}/{episode}', 
 2, 'Storico primary, a volte blocca localhost'),

-- Priority 3: VidSrc.me (classic fallback)
('vidsrcMe', 'VidSrc.me', 'https://vidsrc.me', 'query-tmdb', 
 '/embed/movie?tmdb={id}', '/embed/tv?tmdb={id}&season={season}&episode={episode}', 
 3, 'Classic fallback'),

-- Priority 4: VidSrc.xyz (mirror)
('vidsrcXyz', 'VidSrc.xyz', 'https://vidsrc.xyz', 'query-tmdb', 
 '/embed/movie?tmdb={id}', '/embed/tv?tmdb={id}&season={season}&episode={episode}', 
 4, 'Mirror di vidsrc'),

-- Priority 5: MoviesAPI Club
('moviesApiClub', 'MoviesAPI', 'https://moviesapi.club', 'query-tmdb', 
 '/embed/movie?tmdb={id}', '/embed/tv?tmdb={id}&season={season}&episode={episode}', 
 5, 'Alternativa affidabile'),

-- Priority 10: 2Embed (IMDB fallback)
('twoEmbed', '2Embed', 'https://www.2embed.cc', 'path-imdb', 
 '/embed/movie/{id}', '/embed/tv/{id}/{season}/{episode}', 
 10, 'Fallback IMDB, usato quando TMDB non funziona');

-- Provider extra dalla pagina servers che non sono in PROVIDERS attuale
INSERT INTO stream_providers (key, name, host, family, movie_path_template, tv_path_template, priority, is_active, notes) VALUES
('vidlink', 'VidLink', 'https://vidlink.pro', 'path-tmdb', 
 '/movie/{id}', '/tv/{id}/{season}/{episode}', 
 6, false, 'Da verificare'),

('embedapi', 'EmbedAPI', 'https://embed-api.stream', 'path-tmdb', 
 '/movie/{id}', '/tv/{id}/{season}/{episode}', 
 7, false, 'Da verificare'),

('vidsrcWin', 'VidSrc.win', 'https://vidsrc.win', 'path-tmdb', 
 '/movie/{id}', '/tv/{id}/{season}/{episode}', 
 8, false, 'Da verificare'),

('vsrcSu', 'VSrc.su', 'https://vsrc.su', 'path-tmdb', 
 '/movie/{id}', '/tv/{id}/{season}/{episode}', 
 9, false, 'Da verificare');

-- ============================================
-- HELPER VIEWS (opzionali)
-- ============================================

-- View: Provider attivi e healthy per query rapide
CREATE OR REPLACE VIEW healthy_providers AS
SELECT 
    id, key, name, host, family,
    movie_path_template, tv_path_template, extra_params,
    priority, response_time_ms, success_rate_24h,
    supports_movies, supports_tv, requires_imdb,
    last_check_at
FROM stream_providers
WHERE is_active = true AND is_healthy = true
ORDER BY priority ASC, success_rate_24h DESC, response_time_ms ASC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE stream_providers IS 'Provider di streaming con stato health check e metadati URL';
COMMENT ON COLUMN stream_providers.key IS 'Identificatore univoco usato nel codice';
COMMENT ON COLUMN stream_providers.family IS 'Tipo di URL builder: query-tmdb (query params), path-tmdb (path params), path-imdb (IMDB ID), videoid-tmdb';
COMMENT ON COLUMN stream_providers.is_active IS 'Controllo manuale admin: se false, provider ignorato anche se healthy';
COMMENT ON COLUMN stream_providers.is_healthy IS 'Risultato ultimo health check automatico';
COMMENT ON COLUMN stream_providers.success_rate_24h IS 'Percentuale successo health checks ultime 24h';
