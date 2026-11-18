{#
  Listings whose nights available in the coming year, or whose estimated occupancy, fall outside the year the
  fields are counted in. Both are counted in nights of one year; a value outside it would be a scrape the
  scrape cannot have meant, and answers about how much of the year a listing is offered would break; the
  build fails instead.
#}
SELECT listing_id, nights_available, estimated_occupancy_nights
FROM {{ ref('short_term_rentals') }}
WHERE nights_available NOT BETWEEN 0 AND 365
    OR estimated_occupancy_nights NOT BETWEEN 0 AND 365
