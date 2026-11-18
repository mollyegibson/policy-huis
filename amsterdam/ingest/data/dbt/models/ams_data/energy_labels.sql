{#
  One row per energy label the RVO register gives an Amsterdam address, from the latest EP-Online load. An
  address belongs to Amsterdam when its BAG verblijfsobject ID carries the municipality code of Amsterdam
  (0363) or of Weesp (0457), which Amsterdam absorbed in 2022 and whose addresses kept their code: the
  register's postcodes do not line up with the city, since Amsterdam's postcode range holds the postcodes of
  Diemen and Amstelveen too. Each label is for one thermally zoned part of a building, so an address can hold
  several labels. The dates are the registration of the label, the date its energy performance was recorded,
  and the day it runs to. `source_version` is the register file's publication date.
#}
WITH latest AS (
    SELECT load_id, source_version
    FROM {{ source('raw_ams_data', 'load_manifest') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_ams_data', 'ep_online_energielabels') }}
),

labels AS (
    SELECT
        record,
        record ->> 'BAGVerblijfsobjectID' AS bag_verblijfsobject_id,
        CASE WHEN record ->> 'Bouwjaar' ~ '^[0-9]+$' THEN (record ->> 'Bouwjaar')::integer END AS build_year,
        load_id
    FROM {{ source('raw_ams_data', 'ep_online_energielabels') }}
    WHERE load_id = (SELECT load_id FROM latest)
        AND (record ->> 'BAGVerblijfsobjectID' LIKE '0363%' OR record ->> 'BAGVerblijfsobjectID' LIKE '0457%')
)

SELECT
    substring(bag_verblijfsobject_id FROM 1 FOR 4) AS bag_prefix,
    bag_verblijfsobject_id,
    record ->> 'Postcode' AS postcode,
    (record ->> 'Huisnummer')::integer AS house_number,
    nullif(record ->> 'Huisletter', '') AS house_letter,
    nullif(record ->> 'Huisnummertoevoeging', '') AS house_number_suffix,
    to_date(record ->> 'Registratiedatum', 'YYYYMMDD') AS registered_on,
    to_date(record ->> 'Opnamedatum', 'YYYYMMDD') AS recorded_on,
    to_date(record ->> 'GeldigTot', 'YYYYMMDD') AS valid_until,
    build_year,
    {{ build_year_band('build_year') }} AS build_year_band,
    record ->> 'Energieklasse' AS label,
    {{ energy_label_class("record ->> 'Energieklasse'") }} AS label_class,
    {{ decimal_comma("record ->> 'GebruiksoppervlakteThermischeZone'") }} AS surface,
    (SELECT source_version FROM latest) AS source_version,
    load_id
FROM labels
