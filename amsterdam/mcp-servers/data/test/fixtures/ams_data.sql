-- A small synthetic ams_data schema, shaped like the dbt models in amsterdam/ingest/data/dbt/models/ams_data.
-- Tables are added with the models; the schema is empty until then.
CREATE EXTENSION IF NOT EXISTS postgis;
DROP SCHEMA IF EXISTS ams_data CASCADE;
CREATE SCHEMA ams_data;
