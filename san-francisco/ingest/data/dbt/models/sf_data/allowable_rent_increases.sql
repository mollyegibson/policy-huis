{#
    One row per period of the Rent Board's annual allowable rent increase for rent-controlled units, from the latest
    load of DataSF hsxb-ci7b. A period runs until the day before the next one starts. The latest runs to the day
    before the next March 1, since the dataset's description says the rates "are effective every year on March 1".
#}
WITH periods AS (
    SELECT
        (record ->> 'effective_starting_date')::timestamp::date AS effective_from,
        (record ->> 'annual_allowable_increase')::numeric AS percent,
        load_id
    FROM {{ source('raw_sf_data', 'allowable_rent_increase') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf_data', 'allowable_rent_increase') }}
)
SELECT
    effective_from,
    coalesce(
        lead(effective_from) OVER (ORDER BY effective_from) - 1,
        make_date(extract(year FROM effective_from)::integer + 1, 3, 1) - 1
    ) AS effective_to,
    percent,
    load_id
FROM periods
