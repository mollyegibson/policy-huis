{# Rates outside 0% to 7%: Rent Ordinance Sec. 37.3(a)(1) caps the allowable annual increase at 7%. #}
SELECT effective_from, percent
FROM {{ ref('allowable_rent_increases') }}
WHERE percent < 0 OR percent > 7
