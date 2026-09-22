-- Agropulse Database Schema & Policies

-- Enable PostGIS for polygons
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

-- 2. Users / Memberships
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  role TEXT CHECK (role IN ('producer', 'operator', 'advisor')) NOT NULL
);

-- 3. Plots
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  crop TEXT NOT NULL,
  threshold_min NUMERIC NOT NULL,
  threshold_max NUMERIC NOT NULL,
  geom GEOMETRY(Polygon, 4326)
);

-- 4. Stations
CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id),
  name TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC
);

-- 5. Readings
CREATE TABLE readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id),
  moisture_pct NUMERIC NOT NULL,
  temp_c NUMERIC,
  source TEXT DEFAULT 'sensor',
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Valves
CREATE TABLE valves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id),
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'closed'
);

-- 7. Irrigation Commands
CREATE TABLE irrigation_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valve_id UUID REFERENCES valves(id),
  action TEXT CHECK (action IN ('abrir', 'cerrar')) NOT NULL,
  duration_min INTEGER,
  status TEXT CHECK (status IN ('pending', 'applied', 'failed')) DEFAULT 'pending',
  client_request_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 8. Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id),
  type TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

---------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
---------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE valves ENABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read access for members" ON plots FOR SELECT USING (true);
CREATE POLICY "Read access for members" ON stations FOR SELECT USING (true);
CREATE POLICY "Read access for members" ON valves FOR SELECT USING (true);
CREATE POLICY "Read access for members" ON irrigation_commands FOR SELECT USING (true);
CREATE POLICY "Read access for members" ON alerts FOR SELECT USING (true);

CREATE POLICY "Insert commands for non-advisors" ON irrigation_commands 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role != 'advisor')
);

CREATE POLICY "Update plots for producers" ON plots 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'producer')
);

CREATE POLICY "Manual readings for producers" ON readings
FOR INSERT WITH CHECK (
  source = 'manual' AND EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'producer')
);
