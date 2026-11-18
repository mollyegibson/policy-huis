{#
  One row per Amsterdam area in the latest CBS Kerncijfers load: the city, its wijken and its buurten, with the
  housing figures CBS publishes for each. CBS reports at these three levels and has no stadsdeel, so a buurt
  carries the wijk it stands in as the city's own code (BU0363AA01 -> wijk AA) and a wijk has no parent here. The
  rows carry codes only: each area's name comes from the table's own WijkenEnBuurten dimension, read as the
  cbs_region_names source. Tenure, construction period, vacancy and the heating and solar figures are percentages of
  the area's homes, which CBS suppresses for small areas, so a null is an unpublished figure rather than a zero.
  Average WOZ value is in thousands of euros and average gas use in cubic metres, as CBS publishes them.
#}
WITH latest AS (
    SELECT load_id, source_version
    FROM {{ source('raw_ams_data', 'load_manifest') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_ams_data', 'cbs_kerncijfers') }}
),

regions AS (
    SELECT
        btrim(record ->> 'Key') AS region_key,
        record ->> 'Title' AS name
    FROM {{ source('raw_ams_data', 'cbs_region_names') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_ams_data', 'cbs_region_names') }}
),

codes AS (
    SELECT
        btrim(record ->> 'WijkenEnBuurten') AS region_key,
        record,
        load_id
    FROM {{ source('raw_ams_data', 'cbs_kerncijfers') }}
    WHERE load_id = (SELECT load_id FROM latest)
),

areas AS (
    SELECT
        region_key,
        CASE left(region_key, 2)
            WHEN 'GM' THEN 'gemeente'
            WHEN 'WK' THEN 'wijk'
            WHEN 'BU' THEN 'buurt'
        END AS area_level,
        CASE left(region_key, 2)
            WHEN 'GM' THEN substring(region_key from 3 for 4)
            ELSE substring(region_key from 7)
        END AS area_code,
        record,
        load_id
    FROM codes
)

SELECT
    a.area_level,
    a.area_code,
    r.name AS area_name,
    CASE WHEN a.area_level = 'buurt' THEN left(a.area_code, 2) END AS neighborhood_code,
    CASE WHEN a.area_level = 'buurt' THEN w.name END AS neighborhood_name,
    {{ policyhuis_macros.cbs_number("a.record ->> 'Woningvoorraad_35'") }}::integer AS housing_stock,
    {{ policyhuis_macros.cbs_number("a.record ->> 'NieuwbouwWoningen_36'") }}::integer AS new_homes,
    {{ policyhuis_macros.cbs_number("a.record ->> 'NietWoningvoorraad_37'") }}::integer AS non_housing_stock,
    {{ policyhuis_macros.cbs_number("a.record ->> 'NieuwbouwNietWoningen_38'") }}::integer AS new_non_housing,
    {{ policyhuis_macros.cbs_number("a.record ->> 'GemiddeldeWOZWaardeVanWoningen_39'") }} AS average_woz_value_thousand_eur,
    {{ policyhuis_macros.cbs_number("a.record ->> 'PercentageEengezinswoning_40'") }} AS pct_single_family_homes,
    {{ policyhuis_macros.cbs_number("a.record ->> 'PercentageMeergezinswoning_45'") }} AS pct_multi_family_homes,
    {{ policyhuis_macros.cbs_number("a.record ->> 'OnbewoondeWoningen_46'") }} AS pct_vacant_homes,
    {{ policyhuis_macros.cbs_number("a.record ->> 'Koopwoningen_47'") }} AS pct_owner_occupied,
    {{ policyhuis_macros.cbs_number("a.record ->> 'HuurwoningenTotaal_48'") }} AS pct_rent,
    {{ policyhuis_macros.cbs_number("a.record ->> 'InBezitWoningcorporatie_49'") }} AS pct_corporation_owned,
    {{ policyhuis_macros.cbs_number("a.record ->> 'InBezitOverigeVerhuurders_50'") }} AS pct_other_landlord_owned,
    {{ policyhuis_macros.cbs_number("a.record ->> 'BouwjaarMeerDanTienJaarGeleden_51'") }} AS pct_built_before_last_ten_years,
    {{ policyhuis_macros.cbs_number("a.record ->> 'BouwjaarAfgelopenTienJaar_52'") }} AS pct_built_last_ten_years,
    {{ policyhuis_macros.cbs_number("a.record ->> 'GemiddeldAardgasverbruik_55'") }} AS average_gas_use_m3,
    {{ policyhuis_macros.cbs_number("a.record ->> 'PercentageWoningenMetStadsverwarming_56'") }} AS pct_district_heating,
    {{ policyhuis_macros.cbs_number("a.record ->> 'AardgasvrijeWoningen_57'") }} AS pct_homes_without_gas,
    {{ policyhuis_macros.cbs_number("a.record ->> 'Aardgaswoningen_58'") }} AS pct_homes_with_gas,
    {{ policyhuis_macros.cbs_number("a.record ->> 'WoningenMetZonnestroom_59'") }} AS pct_homes_with_solar_power,
    {{ policyhuis_macros.cbs_number("a.record ->> 'WoningenHoofdzElektrischVerwarmd_60'") }} AS pct_homes_mainly_electric_heating,
    (SELECT source_version FROM latest) AS source_version,
    a.load_id
FROM areas AS a
LEFT JOIN regions AS r ON r.region_key = a.region_key
LEFT JOIN regions AS w ON w.region_key = 'WK0363' || left(a.area_code, 2)
