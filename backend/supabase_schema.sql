-- GeoResolve AI - Database Schema Schema & Migrations

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('Admin', 'Developer', 'User');
CREATE TYPE key_status AS ENUM ('Active', 'Revoked');
CREATE TYPE address_status AS ENUM ('Success', 'Cached', 'Failed');

-- 3. USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'User'::user_role,
    company VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_address TEXT NOT NULL,
    normalized_address TEXT,
    landmark VARCHAR(255),
    street VARCHAR(255),
    locality VARCHAR(255),
    area VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    language VARCHAR(50) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RESOLVED ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.resolved_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    confidence NUMERIC(3, 2) CHECK (confidence >= 0.0 AND confidence <= 1.0) NOT NULL,
    reasoning TEXT,
    matched_landmark VARCHAR(255),
    matched_pincode VARCHAR(20),
    nearby_pois JSONB DEFAULT '[]'::jsonb,
    response_time_ms INT NOT NULL,
    status address_status DEFAULT 'Success'::address_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SEARCH HISTORY LEDGER
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    raw_address TEXT NOT NULL,
    resolved_address_id UUID REFERENCES public.resolved_addresses(id) ON DELETE SET NULL,
    response_time_ms INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    original_address TEXT NOT NULL,
    corrected_address TEXT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. API KEYS TABLE
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    status key_status DEFAULT 'Active'::key_status,
    usage INT DEFAULT 0,
    max_limit INT DEFAULT 25000,
    expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. ANALYTICS METRICS TABLE
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    avg_confidence NUMERIC(3, 2) DEFAULT 0.0,
    avg_latency_ms INT DEFAULT 0,
    cache_hit_rate NUMERIC(5, 2) DEFAULT 0.00,
    timestamp DATE UNIQUE DEFAULT CURRENT_DATE
);

-- 10. SYSTEM TELEMETRY LOGS
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_addresses_pincode ON public.addresses(pincode);
CREATE INDEX IF NOT EXISTS idx_resolved_lat_lon ON public.resolved_addresses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 12. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Allow users to view their own profile details" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile details" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- Addresses and Resolved Addresses (Readable by authenticated users)
CREATE POLICY "Authenticated users can query resolved database records"
    ON public.addresses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can write geocoded address payloads"
    ON public.addresses FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read coordinates payloads"
    ON public.resolved_addresses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create coordinates payloads"
    ON public.resolved_addresses FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Search History policies
CREATE POLICY "Users can query their own search histories"
    ON public.search_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can append search history events"
    ON public.search_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their search logs"
    ON public.search_history FOR DELETE
    USING (auth.uid() = user_id);

-- API Keys policies
CREATE POLICY "Users can inspect their registered API Keys"
    ON public.api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can register API keys"
    ON public.api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete API keys"
    ON public.api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Analytics & System Logs (Readable by Admin/Developers)
CREATE POLICY "System logs read constraints"
    ON public.system_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role IN ('Admin', 'Developer')
        )
    );

CREATE POLICY "Analytics visible to users"
    ON public.analytics FOR SELECT
    TO authenticated
    USING (true);
