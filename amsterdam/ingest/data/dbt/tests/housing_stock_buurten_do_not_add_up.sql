{#
  Editions where the buurten's housing stock does not add up to the city's own figure. CBS publishes the city
  total alongside its parts, and answers at a coarser level use that total as published: a mismatch is reported,
  not fatal.
#}
{{ config(severity='warn') }}

SELECT
    city.housing_stock AS city_housing_stock,
    sum(buurt.housing_stock) AS buurten_housing_stock
FROM {{ ref('housing_stock') }} AS city
CROSS JOIN {{ ref('housing_stock') }} AS buurt
WHERE city.area_level = 'gemeente'
    AND buurt.area_level = 'buurt'
GROUP BY city.housing_stock
HAVING city.housing_stock <> coalesce(sum(buurt.housing_stock), 0)
