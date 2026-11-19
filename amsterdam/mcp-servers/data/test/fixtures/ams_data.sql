-- A small synthetic ams_data schema, shaped like the dbt models in amsterdam/ingest/data/dbt/models/ams_data.
CREATE EXTENSION IF NOT EXISTS postgis;
DROP SCHEMA IF EXISTS ams_data CASCADE;
CREATE SCHEMA ams_data;

CREATE TABLE ams_data.datasets (
    dataset_key text PRIMARY KEY, title text NOT NULL, publisher text, source_url text NOT NULL, license text,
    source_version date NOT NULL, publisher_description text
);
INSERT INTO ams_data.datasets VALUES
    ('nieuwbouwplannen', 'Woningbouwplannen Openbaar', 'Gemeente Amsterdam',
     'https://api.data.amsterdam.nl/v1/nieuwbouwplannen/woningbouwplannen_openbaar', 'CC-BY', '2026-07-01',
     'De woningbouwplannen op de peildatum.'),
    ('ep_online_energielabels', 'EP-Online energielabels', 'RVO', 'https://public.ep-online.nl', NULL, '2026-11-01',
     'De energielabels van gebouwen.'),
    ('inside_airbnb_listings', 'Inside Airbnb Amsterdam listings', 'Inside Airbnb',
     'https://data.insideairbnb.com', 'CC-BY', '2026-09-16', 'One day''s scrape.'),
    ('cbs_kerncijfers', 'Kerncijfers wijken en buurten 2025', 'Centraal Bureau voor de Statistiek',
     'https://opendata.cbs.nl/ODataApi/OData/86165NED', 'CC BY 4.0', '2025-01-01', NULL);

CREATE TABLE ams_data.districts (district_code text PRIMARY KEY, name text NOT NULL);
INSERT INTO ams_data.districts VALUES
    ('A', 'Centrum'), ('K', 'Zuid'), ('N', 'Noord'), ('S', 'Weesp');

CREATE TABLE ams_data.neighborhoods (neighborhood_code text PRIMARY KEY, name text NOT NULL, district_code text NOT NULL);
INSERT INTO ams_data.neighborhoods VALUES
    ('A01', 'Centrum-West', 'A'), ('KP', 'Zuidas', 'K'), ('N2', 'Nieuwendammerdijk', 'N'), ('S1', 'Weesp', 'S');

CREATE TABLE ams_data.planned_housing (
    project_id text PRIMARY KEY, name text NOT NULL, district_code text, stadsdeel text,
    area_code text, gebied text, neighborhood_code text, wijk text, buurt_code text, buurt text,
    publication_stage text, construction_start_planned date, construction_start_realised date,
    units_social_rent_corporation integer, units_social_rent_independent integer, units_mid_rent integer,
    units_private_rent integer, units_private_sale integer, units_affordable_sale integer,
    units_private_rent_or_sale integer, units_non_self_contained integer, units_temporary integer,
    units_student integer, units_young integer, units_self_build integer, units_unknown_tenure integer,
    total_units integer NOT NULL, total_self_contained_units integer,
    peildatum date NOT NULL, source_version date NOT NULL, geom geometry(MultiPolygon, 4326), load_id uuid
);
INSERT INTO ams_data.planned_housing VALUES
    ('P1', 'Ravel kavel I', 'K', 'Zuid', 'GK12', 'Buitenveldert, Zuidas', 'KP', 'Zuidas', 'KP05', 'Vivaldi',
     'Fase 4: Voorbereiding en uitvoering', '2027-05-01', NULL, 40, 0, 20, 10, 20, 10, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, 100, 70, '2026-07-01', '2026-07-01', NULL, NULL),
    ('P2', 'Havengebied dwellings', 'A', 'Centrum', 'GM15', 'Indische Buurt, Oostelijk Havengebied', 'A01',
     'Centrum-West', NULL, NULL, 'Fase 1: Planning', NULL, '2025-01-01', 30, NULL, NULL, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, NULL, NULL, NULL, 30, 30, '2026-07-01', '2026-07-01', NULL, NULL),
    ('P3', 'Noord self build', 'N', 'Noord', 'GN19', 'Oud-Noord', 'N2', 'Nieuwendammerdijk', NULL, NULL,
     'Fase 2: Ontwerp', '2028-01-01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10, NULL,
     NULL, 5, 15, 0, '2026-07-01', '2026-07-01', NULL, NULL),
    ('P4', 'Weesp homes', NULL, NULL, 'GS25', 'Weesp, Driemond', 'S1', 'Weesp', NULL, NULL, NULL, '2026-12-01',
     NULL, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 12, 12, '2026-07-01',
     '2026-07-01', NULL, NULL);

CREATE TABLE ams_data.energy_labels (
    bag_prefix text NOT NULL, bag_verblijfsobject_id text NOT NULL, postcode text NOT NULL, house_number integer NOT NULL,
    house_letter text, house_number_suffix text, registered_on date NOT NULL, recorded_on date, valid_until date,
    build_year integer, build_year_band text, label text NOT NULL, label_class text NOT NULL, surface numeric,
    source_version date NOT NULL, load_id uuid
);
INSERT INTO ams_data.energy_labels VALUES
    ('0363', '0363010000721378', '1011JS', 1, NULL, NULL, '2026-03-05', '2026-02-20', '2036-03-05', 1931,
     '1921 tot 1940', 'A++', 'A', 88.50, '2026-11-01', NULL),
    ('0363', '0363010000990001', '1011JS', 1, 'B', NULL, '2026-01-10', '2026-01-02', '2036-01-10', 1931,
     '1921 tot 1940', 'A', 'A', 518.00, '2026-11-01', NULL),
    ('0457', '0457100000012345', '1381AB', 2, NULL, NULL, '2025-12-01', '2025-11-20', '2035-12-01', 1901,
     '1900 tot 1920', 'G', 'G', 96.00, '2026-11-01', NULL),
    ('0363', '0363010000555555', '1018XK', 42, NULL, 'III', '2026-06-15', '2026-06-01', '2036-06-15', 2015,
     '2011 en later', 'B', 'B', 74.30, '2026-11-01', NULL),
    ('0363', '0363010000666666', '1043DL', 7, NULL, NULL, '2026-08-01', '2026-07-20', '2036-08-01', NULL,
     NULL, 'C', 'C', NULL, '2026-11-01', NULL);

CREATE TABLE ams_data.short_term_rentals (
    listing_id text PRIMARY KEY, name text, room_type text NOT NULL, neighbourhood text, nightly_price numeric,
    minimum_nights integer, nights_available integer, estimated_occupancy_nights integer, estimated_revenue numeric,
    number_of_reviews integer, registration text, registered boolean NOT NULL, host_listings_count integer,
    geom geometry(Point, 4326), load_id uuid
);
INSERT INTO ams_data.short_term_rentals VALUES
    ('L1', 'Light canal apartment', 'Entire home/apt', 'Centrum-West', 250.00, 3, 90, 45, 11250, 12,
     '0363 78AD 8875 790E', true, 1, NULL, NULL),
    ('L2', 'Jordaan room', 'Private room', 'Centrum-West', 95.50, 2, 365, 180, 17316, 40, 'Exempt', false, 3, NULL, NULL),
    ('L3', 'Museum quarter flat', 'Entire home/apt', 'Zuid', 1200.00, 30, NULL, NULL, NULL, 2, NULL, false, 7, NULL, NULL),
    ('L4', 'NDSM loft', 'Hotel room', 'Centrum-West', 400.00, 1, 200, 100, 40000, 8, '036341086EC3C2FF2493', true, 2, NULL, NULL);

CREATE TABLE ams_data.housing_stock (
    area_level text NOT NULL, area_code text NOT NULL, area_name text NOT NULL, neighborhood_code text,
    neighborhood_name text, housing_stock integer NOT NULL, new_homes integer, non_housing_stock integer,
    new_non_housing integer, average_woz_value_thousand_eur numeric, pct_single_family_homes numeric,
    pct_multi_family_homes numeric, pct_vacant_homes numeric, pct_owner_occupied numeric, pct_rent numeric,
    pct_corporation_owned numeric, pct_other_landlord_owned numeric, pct_built_before_last_ten_years numeric,
    pct_built_last_ten_years numeric, average_gas_use_m3 numeric, pct_district_heating numeric,
    pct_homes_without_gas numeric, pct_homes_with_gas numeric, pct_homes_with_solar_power numeric,
    pct_homes_mainly_electric_heating numeric, source_version date NOT NULL, load_id uuid
);
INSERT INTO ams_data.housing_stock (
    area_level, area_code, area_name, neighborhood_code, neighborhood_name, housing_stock, new_homes,
    average_woz_value_thousand_eur, pct_single_family_homes, pct_multi_family_homes, pct_vacant_homes,
    pct_owner_occupied, pct_rent, pct_corporation_owned, pct_other_landlord_owned, pct_built_last_ten_years,
    average_gas_use_m3, pct_district_heating, pct_homes_without_gas, pct_homes_with_gas,
    pct_homes_with_solar_power, pct_homes_mainly_electric_heating, source_version
) VALUES
    ('gemeente', '0363', 'Amsterdam', NULL, NULL, 1000, 10, 500, 20, 80, 5, 30, 70, 40, 30, 15, 800, 8, 19, 76, 10, 4,
     '2025-01-01'),
    ('wijk', 'KP', 'Zuidas', NULL, NULL, 600, 8, 700, 10, 90, 3, 25, 75, 20, 55, 20, 600, 30, 98, 2, 1, 14,
     '2025-01-01'),
    ('buurt', 'KP05', 'Vivaldi', 'KP', 'Zuidas', 400, 5, 800, 5, 95, 2, 20, 80, 15, 65, 30, 500, 40, 96, 4, 2, 12,
     '2025-01-01'),
    ('wijk', 'N2', 'Nieuwendammerdijk', NULL, NULL, 400, 2, 300, 30, 70, 2, 35, 65, 60, 5, 10, 1000, 0, 24, 76, 6, 1,
     '2025-01-01'),
    ('buurt', 'KP06', 'Gustav Mahlerplein', 'KP', 'Zuidas', 100, NULL, NULL, 2, 98, 1, 10, 90, NULL, 80, 40, 400, 60,
     95, 5, 3, 9, '2025-01-01');
