-- A small synthetic sf schema, shaped like the dbt models in san-francisco/ingest/dbt/models/sf.
CREATE EXTENSION IF NOT EXISTS postgis;
DROP SCHEMA IF EXISTS sf CASCADE;
CREATE SCHEMA sf;

CREATE TABLE sf.neighborhoods (name text PRIMARY KEY);
INSERT INTO sf.neighborhoods VALUES ('Mission Bay'), ('Castro/Upper Market');

CREATE TABLE sf.datasets (
    dataset_key text PRIMARY KEY, title text NOT NULL, publisher text, source_url text NOT NULL, license text,
    source_version date NOT NULL, publisher_description text
);
INSERT INTO sf.datasets VALUES
    ('development_pipeline', 'San Francisco Development Pipeline', 'City Planning Department',
     'https://data.sf.gov/d/6jgi-cpb4', 'CC0', '2026-08-28', 'Snapshot as of the end of 2026 Q2.'),
    ('affordable_pipeline', 'Affordable Housing Pipeline', 'MOHCD', 'https://data.sf.gov/d/aaxw-2cb8', 'PDDL',
     '2026-05-21', 'Snapshot.'),
    ('sfpuc_100yr_storm', '100-Year Storm Flood Risk Zone', NULL,
     'https://gis.sfpuc.org/server/rest/services/Hosted/100_Year_Storm_Flood_Risk_Map_2024_Update/FeatureServer/2',
     NULL, '2025-12-12', 'Stormwater flooding.');

CREATE TABLE sf.development_pipeline (
    snapshot text NOT NULL, project_key text NOT NULL, block_lot text NOT NULL, name_or_address text NOT NULL,
    status text NOT NULL, status_since date, planning_approved_on date, net_units integer, affordable_units integer,
    units_extremely_low integer, units_very_low integer, units_low integer, units_moderate integer,
    neighborhood text, supervisor_district integer, geom geometry(Point, 4326), load_id uuid,
    PRIMARY KEY (snapshot, project_key)
);
INSERT INTO sf.development_pipeline VALUES
    ('2026 Q2', '3800001:2019-000001PRJ:1', '3800001', '1 Test St', 'PL Approved', '2019-06-12', '2019-06-12',
     40, 8, 0, 4, 4, 0, 'Mission Bay', 6, ST_SetSRID(ST_MakePoint(-122.395, 37.775), 4326), NULL),
    ('2026 Q2', '3800001:2019-000002PRJ:1', '3800001', '1 Test St', 'BP Issued', '2025-01-10', '2020-03-01',
     12, 0, 0, 0, 0, 0, 'Castro/Upper Market', 8, ST_SetSRID(ST_MakePoint(-122.45, 37.75), 4326), NULL),
    ('2026 Q2', '3800002:2020-000003PRJ:1', '3800002', '2 Test St', 'Construction', NULL, NULL,
     20, 20, 5, 15, 0, 0, 'Mission Bay', 6, NULL, NULL),
    ('2026 Q1', '3800001:2019-000001PRJ:1', '3800001', '1 Test St', 'PL Approved', '2019-06-12', '2019-06-12',
     40, 8, 0, 4, 4, 0, 'Mission Bay', 6, NULL, NULL);

CREATE TABLE sf.affordable_pipeline (
    project_id text PRIMARY KEY, name text NOT NULL, status text NOT NULL, construction_status text NOT NULL,
    neighborhood text NOT NULL, supervisor_district integer NOT NULL, total_units integer NOT NULL,
    affordable_units integer NOT NULL, estimated_start date, estimated_completion date,
    geom geometry(Point, 4326) NOT NULL, load_id uuid
);
INSERT INTO sf.affordable_pipeline VALUES
    ('2024-001', 'Project 2024-001', 'Pre-Construction', '(3) Design with Entitlements Approved', 'Mission Bay', 6,
     100, 99, '2027-01-15', NULL, ST_SetSRID(ST_MakePoint(-122.395, 37.775), 4326), NULL),
    ('2024-002', 'Project 2024-002', 'Construction', '(5) First Construction Document Issued', 'Castro/Upper Market',
     8, 50, 50, '2025-02-01', '2026-12-01', ST_SetSRID(ST_MakePoint(-122.45, 37.75), 4326), NULL);

CREATE TABLE sf.affordable_pipeline_ami_units (project_id text NOT NULL, ami_band text NOT NULL, units integer NOT NULL);
INSERT INTO sf.affordable_pipeline_ami_units VALUES
    ('2024-001', '_50_ami', 60), ('2024-001', '_80_ami', 39), ('2024-002', '_50_ami', 50);

CREATE TABLE sf.zones (
    zone text PRIMARY KEY, name text NOT NULL, publisher text, source_edited_at date NOT NULL,
    publisher_description text, geom geometry(MultiPolygon, 4326), load_id uuid
);
INSERT INTO sf.zones VALUES
    ('sfpuc_100yr_storm', '100-Year Storm Flood Risk Zone', NULL, '2025-12-12', 'Stormwater flooding.',
     ST_GeomFromText('MULTIPOLYGON(((-122.40 37.77,-122.39 37.77,-122.39 37.78,-122.40 37.78,-122.40 37.77)))', 4326),
     NULL);

CREATE TABLE sf.project_zone_exposure (project_source text NOT NULL, project_id text NOT NULL, zone text NOT NULL);
INSERT INTO sf.project_zone_exposure VALUES
    ('development_pipeline', '3800001:2019-000001PRJ:1', 'sfpuc_100yr_storm'),
    ('affordable_pipeline', '2024-001', 'sfpuc_100yr_storm');
