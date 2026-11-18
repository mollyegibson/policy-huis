{#
  One row per Amsterdam neighborhood (wijk), the subdivision of a district that the city reports housing
  figures at, with the district it stands in. The codes and names come from the Nieuwbouwplannen records;
  a plan can span neighborhoods, whose records name no wijk, so a wijk appears here once a plan names it.
#}
SELECT DISTINCT
    record ->> 'wijkCode' AS neighborhood_code,
    record ->> 'wijkNaam' AS name,
    record ->> 'stadsdeelCode' AS district_code
FROM {{ source('raw_ams_data', 'nieuwbouwplannen') }}
WHERE load_id = {{ policyhuis_macros.latest_load('raw_ams_data', 'nieuwbouwplannen') }}
    AND record ->> 'wijkCode' IS NOT NULL
