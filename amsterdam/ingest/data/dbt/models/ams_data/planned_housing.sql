{#
  One row per planned housing project in the latest Nieuwbouwplannen load, the city's register of new-build
  plans. The tenure counts are the units each plan gives per tenure, as published: a count the plan has not
  given yet is null (unit_count), and the source's own total is kept as total_units, which the source may
  count differently from the published parts. The levels of place are kept in the city's own terms, Dutch:
  stadsdeel (district), gebied (the area level the city and Inside Airbnb report at), wijk (neighborhood)
  and buurt. A plan's start of construction is what the plan states, planned or realised. `source_version`
  is that load's peildatum, the date the plans state their numbers as of. The plan geometries are recorded
  in RD coordinates (EPSG:28992), which the loader tags 4326; the model re-tags and transforms them to the
  schema's 4326.
#}
WITH latest AS (
    SELECT load_id, source_version
    FROM {{ source('raw_ams_data', 'load_manifest') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_ams_data', 'nieuwbouwplannen') }}
)

SELECT
    record ->> 'id' AS project_id,
    record ->> 'projectnaamAfkorting' AS name,
    record ->> 'stadsdeelCode' AS district_code,
    record ->> 'stadsdeelNaam' AS stadsdeel,
    record ->> 'gebiedCode' AS area_code,
    record ->> 'gebiedNaam' AS gebied,
    record ->> 'wijkCode' AS neighborhood_code,
    record ->> 'wijkNaam' AS wijk,
    record ->> 'buurtCode' AS buurt_code,
    record ->> 'buurtNaam' AS buurt,
    record ->> 'plaberumPublicatie' AS publication_stage,
    (record ->> 'startBouwGepland')::timestamp::date AS construction_start_planned,
    (record ->> 'startBouwGerealiseerd')::timestamp::date AS construction_start_realised,
    {{ unit_count("record ->> 'socialeHuurCorporatie'") }} AS units_social_rent_corporation,
    {{ unit_count("record ->> 'socialeHuurZelfstPerm'") }} AS units_social_rent_independent,
    {{ unit_count("record ->> 'middeldureHuur'") }} AS units_mid_rent,
    {{ unit_count("record ->> 'vrijeSectorHuur'") }} AS units_private_rent,
    {{ unit_count("record ->> 'vrijeSectorKoop'") }} AS units_private_sale,
    {{ unit_count("record ->> 'betaalbareKoop'") }} AS units_affordable_sale,
    {{ unit_count("record ->> 'vrijeSectorNb'") }} AS units_private_rent_or_sale,
    {{ unit_count("record ->> 'onzelfstandig'") }} AS units_non_self_contained,
    {{ unit_count("record ->> 'tijdelijk'") }} AS units_temporary,
    {{ unit_count("record ->> 'studenten'") }} AS units_student,
    {{ unit_count("record ->> 'jongeren'") }} AS units_young,
    {{ unit_count("record ->> 'zelfbouw'") }} AS units_self_build,
    {{ unit_count("record ->> 'onbekend'") }} AS units_unknown_tenure,
    {{ unit_count("record ->> 'totaal'") }} AS total_units,
    {{ unit_count("record ->> 'totaalZelfstPerm'") }} AS total_self_contained_units,
    (record ->> 'peildatum')::timestamp::date AS peildatum,
    (SELECT source_version FROM latest) AS source_version,
    CASE WHEN geom IS NOT NULL THEN ST_Transform(ST_SetSRID(geom, 28992), 4326) END AS geom,
    load_id
FROM {{ source('raw_ams_data', 'nieuwbouwplannen') }} AS r
WHERE load_id = (SELECT load_id FROM latest)
