-- Seed Data for Agropulse

-- Insert Organization
INSERT INTO organizations (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Estancia Didáctica Concordia')
ON CONFLICT DO NOTHING;

-- Note: The users (productor@agropulse.test, operador@agropulse.test, asesor@agropulse.test) 
-- must be created through Supabase Auth first. Then you link them in the memberships table.
-- Assuming user UUIDs are placeholder here:

-- INSERT INTO memberships (user_id, organization_id, role) VALUES 
-- ('<uuid-productor>', '11111111-1111-1111-1111-111111111111', 'producer'),
-- ('<uuid-operador>', '11111111-1111-1111-1111-111111111111', 'operator'),
-- ('<uuid-asesor>', '11111111-1111-1111-1111-111111111111', 'advisor');

-- Insert Plots
INSERT INTO plots (id, organization_id, name, crop, threshold_min, threshold_max, geom) VALUES
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Costa 1', 'Citrus', 25, 45, ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-58.013,-31.397],[-58.011,-31.397],[-58.011,-31.395],[-58.013,-31.395],[-58.013,-31.397]]]}')),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Costa 2', 'Citrus', 25, 45, ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-58.016,-31.398],[-58.014,-31.398],[-58.014,-31.396],[-58.016,-31.396],[-58.016,-31.398]]]}')),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Monte A', 'Soja', 30, 50, ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-58.018,-31.400],[-58.016,-31.400],[-58.016,-31.398],[-58.018,-31.398],[-58.018,-31.400]]]}'))
ON CONFLICT DO NOTHING;

-- Insert Stations
INSERT INTO stations (id, plot_id, name, lat, lng) VALUES
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'Station C1', -31.396, -58.012),
('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Station C2', -31.397, -58.015),
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223', 'Station MA', -31.399, -58.017)
ON CONFLICT DO NOTHING;

-- Insert Valves
INSERT INTO valves (id, plot_id, name, status) VALUES
('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', 'Válvula C1', 'closed'),
('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', 'Válvula C2', 'closed'),
('44444444-4444-4444-4444-444444444443', '22222222-2222-2222-2222-222222222223', 'Válvula MA', 'closed')
ON CONFLICT DO NOTHING;
