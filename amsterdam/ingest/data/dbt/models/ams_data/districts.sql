{#
  One row per Amsterdam district (stadsdeel): the city's subdivisions, each with its own housing board. The
  codes and names come from the Nieuwbouwplannen records, which name the district each plan stands in.
#}
SELECT DISTINCT
    record ->> 'stadsdeelCode' AS district_code,
    record ->> 'stadsdeelNaam' AS name
FROM {{ source('raw_ams_data', 'nieuwbouwplannen') }}
WHERE load_id = {{ policyhuis_macros.latest_load('raw_ams_data', 'nieuwbouwplannen') }}
    AND record ->> 'stadsdeelCode' IS NOT NULL
