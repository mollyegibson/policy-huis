{#
  One row per listing in the latest Inside Airbnb scrape of Amsterdam. The nightly price is the scrape's
  price field, recorded with its currency sign and thousand separators ("$1,234.00"), which the model
  strips; a listing without a price, such as one no longer bookable, gives null. `registration` is the
  registration the host gives, as the site records it, and `registered` says whether that is a registration
  number in the form the city issues, which starts with the address's four-digit BAG municipality code: the
  site also records hosts as exempt and gives placeholder values, which are not registrations. The scrape's
  listing locations are the latitude and longitude the loader recorded, in the schema's 4326.
#}
WITH latest AS (
    SELECT load_id, source_version
    FROM {{ source('raw_ams_data', 'load_manifest') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_ams_data', 'inside_airbnb_listings') }}
)

SELECT
    record ->> 'id' AS listing_id,
    record ->> 'name' AS name,
    record ->> 'room_type' AS room_type,
    nullif(record ->> 'neighbourhood_cleansed', '') AS neighbourhood,
    CASE WHEN record ->> 'price' ~ '[0-9]' THEN regexp_replace(record ->> 'price', '[^0-9.]', '', 'g')::numeric END
        AS nightly_price,
    CASE WHEN record ->> 'minimum_nights' ~ '^[0-9]+$' THEN (record ->> 'minimum_nights')::integer END
        AS minimum_nights,
    CASE WHEN record ->> 'availability_365' ~ '^[0-9]+$' THEN (record ->> 'availability_365')::integer END
        AS nights_available,
    CASE WHEN record ->> 'estimated_occupancy_l365d' ~ '^[0-9]+$' THEN (record ->> 'estimated_occupancy_l365d')::integer END
        AS estimated_occupancy_nights,
    CASE WHEN record ->> 'estimated_revenue_l365d' ~ '^[0-9]+$' THEN (record ->> 'estimated_revenue_l365d')::numeric END
        AS estimated_revenue,
    CASE WHEN record ->> 'number_of_reviews' ~ '^[0-9]+$' THEN (record ->> 'number_of_reviews')::integer END
        AS number_of_reviews,
    nullif(record ->> 'license', '') AS registration,
    (record ->> 'license' ~ '^[0-9]{4} ') AS registered,
    CASE WHEN record ->> 'calculated_host_listings_count' ~ '^[0-9]+$'
        THEN (record ->> 'calculated_host_listings_count')::integer END AS host_listings_count,
    geom,
    (SELECT source_version FROM latest) AS source_version,
    load_id
FROM {{ source('raw_ams_data', 'inside_airbnb_listings') }}
WHERE load_id = (SELECT load_id FROM latest)
