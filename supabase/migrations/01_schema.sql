-- Extensiones
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT
);

-- 2. Memberships
CREATE TABLE memberships (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('producer', 'operator', 'advisor')),
    PRIMARY KEY (user_id, organization_id)
);

-- 3. Plots (Lotes)
CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    crop TEXT,
    geom geometry(Polygon, 4326) NOT NULL,
    threshold_min NUMERIC NOT NULL DEFAULT 25,
    threshold_max NUMERIC NOT NULL DEFAULT 45
);

-- 4. Stations
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lat NUMERIC,
    lng NUMERIC
);

-- 5. Readings
CREATE TABLE readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    moisture_pct NUMERIC NOT NULL,
    temp_c NUMERIC,
    rain_mm NUMERIC,
    source TEXT NOT NULL CHECK (source IN ('sensor', 'manual'))
);
CREATE INDEX idx_readings_station_measured ON readings(station_id, measured_at DESC);

-- 6. Valves
CREATE TABLE valves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'closed'
);

-- 7. Irrigation Commands
CREATE TABLE irrigation_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valve_id UUID NOT NULL REFERENCES valves(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('abrir', 'cerrar', 'regar')),
    duration_min INTEGER,
    status TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'failed', 'cancelled')) DEFAULT 'pending',
    client_request_id UUID UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);

-- 8. Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);
