-- A small synthetic sf_data schema, shaped like the dbt models in san-francisco/ingest/data/dbt/models/sf_data.
CREATE EXTENSION IF NOT EXISTS postgis;
DROP SCHEMA IF EXISTS sf_data CASCADE;
CREATE SCHEMA sf_data;

CREATE TABLE sf_data.neighborhoods (name text PRIMARY KEY);
INSERT INTO sf_data.neighborhoods VALUES ('Mission Bay'), ('Castro/Upper Market');

CREATE TABLE sf_data.datasets (
    dataset_key text PRIMARY KEY, title text NOT NULL, publisher text, source_url text NOT NULL, license text,
    source_version date NOT NULL, publisher_description text
);
INSERT INTO sf_data.datasets VALUES
    ('development_pipeline', 'San Francisco Development Pipeline', 'City Planning Department',
     'https://data.sf.gov/d/6jgi-cpb4', 'CC0', '2026-08-28', 'Snapshot as of the end of 2026 Q2.'),
    ('affordable_pipeline', 'Affordable Housing Pipeline', 'MOHCD', 'https://data.sf.gov/d/aaxw-2cb8', 'PDDL',
     '2026-05-21', 'Snapshot.'),
    ('sfpuc_100yr_storm', '100-Year Storm Flood Risk Zone', NULL,
     'https://gis.sfpuc.org/server/rest/services/Hosted/100_Year_Storm_Flood_Risk_Map_2024_Update/FeatureServer/2',
     NULL, '2025-12-12', 'Stormwater flooding.');

CREATE TABLE sf_data.development_pipeline (
    snapshot text NOT NULL, source_version date NOT NULL, project_key text NOT NULL, block_lot text NOT NULL,
    name_or_address text NOT NULL, status text NOT NULL, status_since date, planning_approved_on date, net_units integer, affordable_units integer,
    units_extremely_low integer, units_very_low integer, units_low integer, units_moderate integer,
    neighborhood text, supervisor_district integer, geom geometry(Point, 4326), load_id uuid,
    PRIMARY KEY (snapshot, project_key)
);
INSERT INTO sf_data.development_pipeline VALUES
    ('2026 Q2', '2026-08-28', '3800001:2019-000001PRJ:1', '3800001', '1 Test St', 'PL Approved', '2019-06-12', '2019-06-12',
     40, 8, 0, 4, 4, 0, 'Mission Bay', 6, ST_SetSRID(ST_MakePoint(-122.395, 37.775), 4326), NULL),
    ('2026 Q2', '2026-08-28', '3800001:2019-000002PRJ:1', '3800001', '1 Test St', 'BP Issued', '2025-01-10', '2020-03-01',
     12, 0, 0, 0, 0, 0, 'Castro/Upper Market', 8, ST_SetSRID(ST_MakePoint(-122.45, 37.75), 4326), NULL),
    ('2026 Q2', '2026-08-28', '3800002:2020-000003PRJ:1', '3800002', '2 Test St', 'Construction', NULL, NULL,
     20, 20, 5, 15, 0, 0, 'Mission Bay', 6, NULL, NULL),
    ('2026 Q1', '2026-05-21', '3800001:2019-000001PRJ:1', '3800001', '1 Test St', 'PL Approved', '2019-06-12', '2019-06-12',
     40, 8, 0, 4, 4, 0, 'Mission Bay', 6, NULL, NULL);

CREATE TABLE sf_data.affordable_pipeline (
    project_id text PRIMARY KEY, name text NOT NULL, status text NOT NULL, construction_status text NOT NULL,
    neighborhood text NOT NULL, supervisor_district integer NOT NULL, total_units integer NOT NULL,
    affordable_units integer NOT NULL, estimated_start date, estimated_completion date,
    geom geometry(Point, 4326) NOT NULL, load_id uuid
);
INSERT INTO sf_data.affordable_pipeline VALUES
    ('2024-001', 'Project 2024-001', 'Pre-Construction', '(3) Design with Entitlements Approved', 'Mission Bay', 6,
     100, 99, '2027-01-15', NULL, ST_SetSRID(ST_MakePoint(-122.395, 37.775), 4326), NULL),
    ('2024-002', 'Project 2024-002', 'Construction', '(5) First Construction Document Issued', 'Castro/Upper Market',
     8, 50, 50, '2025-02-01', '2026-12-01', ST_SetSRID(ST_MakePoint(-122.45, 37.75), 4326), NULL);

CREATE TABLE sf_data.affordable_pipeline_ami_units (project_id text NOT NULL, ami_band text NOT NULL, units integer NOT NULL);
INSERT INTO sf_data.affordable_pipeline_ami_units VALUES
    ('2024-001', '_50_ami', 60), ('2024-001', '_80_ami', 39), ('2024-002', '_50_ami', 50);

CREATE TABLE sf_data.zones (
    zone text PRIMARY KEY, name text NOT NULL, publisher text, source_edited_at date NOT NULL,
    publisher_description text, geom geometry(MultiPolygon, 4326), load_id uuid
);
INSERT INTO sf_data.zones VALUES
    ('sfpuc_100yr_storm', '100-Year Storm Flood Risk Zone', NULL, '2025-12-12', 'Stormwater flooding.',
     ST_GeomFromText('MULTIPOLYGON(((-122.40 37.77,-122.39 37.77,-122.39 37.78,-122.40 37.78,-122.40 37.77)))', 4326),
     NULL);

CREATE TABLE sf_data.project_zone_exposure (project_source text NOT NULL, project_id text NOT NULL, zone text NOT NULL);
INSERT INTO sf_data.project_zone_exposure VALUES
    ('development_pipeline', '3800001:2019-000001PRJ:1', 'sfpuc_100yr_storm'),
    ('affordable_pipeline', '2024-001', 'sfpuc_100yr_storm');

INSERT INTO sf_data.datasets VALUES
    ('eviction_notices', 'Eviction Notices', NULL, 'https://data.sf.gov/d/5cei-gny5',
     'Open Data Commons Public Domain Dedication and License', '2026-11-06', 'Notices filed with the Rent Board.'),
    ('eviction_report', '2025-2026 Rent Board Annual Report on Eviction Notices',
     'San Francisco Residential Rent Stabilization and Arbitration Board',
     'https://media.api.sf.gov/documents/Rent_Board_Annual_Eviction_Report_25-26_2HGK2Cl.pdf', NULL, '2026-04-08', NULL);

CREATE TABLE sf_data.eviction_grounds (ground_key text PRIMARY KEY, label text NOT NULL, section text, report_load_id uuid);
INSERT INTO sf_data.eviction_grounds VALUES
    ('owner_move_in', 'owner/relative move-in', '37.9(a)(8)', NULL),
    ('breach', 'breach of rental agreement', '37.9(a)(2)', NULL),
    ('roommate_same_unit', 'roommate eviction', '37.9(b)', NULL),
    ('other_cause', 'other or no reason given', NULL, NULL);

CREATE TABLE sf_data.eviction_notices (
    eviction_id text PRIMARY KEY, file_date date NOT NULL, file_month date NOT NULL, neighborhood text,
    supervisor_district integer, geom geometry(Point, 4326), load_id uuid
);
INSERT INTO sf_data.eviction_notices VALUES
    ('M1', '2024-01-15', '2024-01-01', 'Mission Bay', 6, NULL, NULL),
    ('M2', '2024-02-03', '2024-02-01', 'Mission Bay', 6, NULL, NULL),
    ('M3', '2025-07-30', '2025-07-01', 'Castro/Upper Market', 8, NULL, NULL),
    ('M4', '2025-08-12', '2025-08-01', NULL, NULL, NULL, NULL);

CREATE TABLE sf_data.eviction_notice_grounds (eviction_id text NOT NULL, ground_key text NOT NULL);
INSERT INTO sf_data.eviction_notice_grounds VALUES
    ('M1', 'owner_move_in'), ('M2', 'breach'), ('M2', 'owner_move_in'), ('M3', 'breach');
