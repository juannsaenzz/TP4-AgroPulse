-- 1. Habilitar PostGIS para geometrías (mapas de lotes)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Limpiar esquemas anteriores (opcional, para desarrollo)
DROP TABLE IF EXISTS alerts, irrigation_commands, valves, readings, stations, plots, memberships, organizations CASCADE;

-- 3. Crear tablas
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL
);

CREATE TABLE memberships (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('producer', 'operator', 'advisor')),
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop TEXT,
  geom geometry(Polygon, 4326),
  threshold_min NUMERIC DEFAULT 25,
  threshold_max NUMERIC DEFAULT 45
);

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC
);

CREATE TABLE readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  moisture_pct NUMERIC NOT NULL,
  temp_c NUMERIC,
  rain_mm NUMERIC,
  source TEXT NOT NULL CHECK (source IN ('sensor', 'manual'))
);

CREATE TABLE valves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'closed'
);

CREATE TABLE irrigation_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valve_id UUID REFERENCES valves(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('abrir', 'cerrar')),
  duration_min INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'failed', 'cancelled')) DEFAULT 'pending',
  client_request_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 4. Índices para rendimiento (RF-09, RF-10)
CREATE INDEX idx_readings_station_measured ON readings (station_id, measured_at DESC);
CREATE INDEX idx_plots_org ON plots (organization_id);

-- 5. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE readings, valves, irrigation_commands, alerts;

-- 6. RLS (Row Level Security) - MUST (RF-02)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE valves ENABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Memberships: el usuario solo ve las membresías de las organizaciones a las que pertenece
CREATE POLICY "Users can view their own memberships" ON memberships
  FOR SELECT USING (auth.uid() = user_id);

-- Organizations: el usuario ve las organizaciones si tiene membresía
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.organization_id = organizations.id AND memberships.user_id = auth.uid())
  );

-- Plots: el usuario ve lotes de las organizaciones a las que pertenece
CREATE POLICY "Users can view plots of their orgs" ON plots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.organization_id = plots.organization_id AND memberships.user_id = auth.uid())
  );

-- Actualizar lotes (solo producer y operator, asessor solo SELECT)
CREATE POLICY "Producer and Operator can update plots" ON plots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM memberships WHERE memberships.organization_id = plots.organization_id AND memberships.user_id = auth.uid() AND memberships.role IN ('producer', 'operator'))
  );

-- Mismas reglas de lectura para hijos de plots
CREATE POLICY "Users can view stations of their orgs" ON stations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM plots JOIN memberships ON plots.organization_id = memberships.organization_id WHERE plots.id = stations.plot_id AND memberships.user_id = auth.uid())
  );

CREATE POLICY "Users can view readings of their orgs" ON readings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stations JOIN plots ON stations.plot_id = plots.id JOIN memberships ON plots.organization_id = memberships.organization_id WHERE stations.id = readings.station_id AND memberships.user_id = auth.uid())
  );

CREATE POLICY "Users can view valves of their orgs" ON valves
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM plots JOIN memberships ON plots.organization_id = memberships.organization_id WHERE plots.id = valves.plot_id AND memberships.user_id = auth.uid())
  );

CREATE POLICY "Users can view commands of their orgs" ON irrigation_commands
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM valves JOIN plots ON valves.plot_id = plots.id JOIN memberships ON plots.organization_id = memberships.organization_id WHERE valves.id = irrigation_commands.valve_id AND memberships.user_id = auth.uid())
  );

-- Solo producer y operator pueden insertar comandos
CREATE POLICY "Producer and Operator can insert commands" ON irrigation_commands
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM valves JOIN plots ON valves.plot_id = plots.id JOIN memberships ON plots.organization_id = memberships.organization_id WHERE valves.id = valve_id AND memberships.user_id = auth.uid() AND memberships.role IN ('producer', 'operator'))
  );
