DO $$$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_plot1_id UUID;
    v_plot2_id UUID;
    v_plot3_id UUID;
    v_station_id UUID;
BEGIN
    -- Obtenemos el ID de tu usuario recién registrado
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    -- Si no hay usuario, frena
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No hay ningún usuario registrado. Registrate en la app primero.';
    END IF;

    -- 1. Crear Organización
    INSERT INTO organizations (name, region) VALUES ('Estancia Didáctica Concordia', 'Entre Ríos') RETURNING id INTO v_org_id;

    -- 2. Crear Membresía (Productor)
    INSERT INTO memberships (user_id, organization_id, role) VALUES (v_user_id, v_org_id, 'producer');

    -- 3. Crear Lotes (Geometría aproximada para Concordia según PRD)
    INSERT INTO plots (organization_id, name, crop, geom, threshold_min, threshold_max) 
    VALUES (v_org_id, 'Costa 1', 'Citrus', ST_GeomFromText('POLYGON((-58.0169 -31.3934, -58.0100 -31.3934, -58.0100 -31.3950, -58.0169 -31.3950, -58.0169 -31.3934))', 4326), 25, 45)
    RETURNING id INTO v_plot1_id;

    INSERT INTO plots (organization_id, name, crop, geom, threshold_min, threshold_max) 
    VALUES (v_org_id, 'Costa 2', 'Citrus', ST_GeomFromText('POLYGON((-58.0169 -31.3960, -58.0100 -31.3960, -58.0100 -31.3980, -58.0169 -31.3980, -58.0169 -31.3960))', 4326), 25, 45)
    RETURNING id INTO v_plot2_id;

    INSERT INTO plots (organization_id, name, crop, geom, threshold_min, threshold_max) 
    VALUES (v_org_id, 'Monte A', 'Soja', ST_GeomFromText('POLYGON((-58.0169 -31.4000, -58.0100 -31.4000, -58.0100 -31.4020, -58.0169 -31.4020, -58.0169 -31.4000))', 4326), 25, 45)
    RETURNING id INTO v_plot3_id;

    -- 4. Agregar Válvulas
    INSERT INTO valves (plot_id, name, status) VALUES (v_plot1_id, 'Válvula Costa 1', 'closed');
    INSERT INTO valves (plot_id, name, status) VALUES (v_plot2_id, 'Válvula Costa 2', 'closed');
    INSERT INTO valves (plot_id, name, status) VALUES (v_plot3_id, 'Válvula Monte A', 'closed');

    -- 5. Agregar Estaciones base
    INSERT INTO stations (plot_id, name, lat, lng) VALUES (v_plot1_id, 'Estación 1', -31.3942, -58.0130) RETURNING id INTO v_station_id;

    -- 6. Lectura inicial (Humedad Óptima)
    INSERT INTO readings (station_id, measured_at, moisture_pct, temp_c, source) VALUES (v_station_id, NOW(), 35, 24, 'sensor');

END $$$;

