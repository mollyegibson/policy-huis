{#
  The construction period of a building with a build year, in the bands the Dutch housing statistics use,
  which follow the building regulations that drove how homes were heated: pre-war brick before the war,
  the rebuild decades after it, and the efficiency standards since. A year without a band gives null.
#}
{% macro build_year_band(expr) -%}
    CASE
        WHEN {{ expr }} IS NULL THEN NULL
        WHEN {{ expr }} < 1900 THEN 'vóór 1900'
        WHEN {{ expr }} <= 1920 THEN '1900 tot 1920'
        WHEN {{ expr }} <= 1940 THEN '1921 tot 1940'
        WHEN {{ expr }} <= 1960 THEN '1941 tot 1960'
        WHEN {{ expr }} <= 1980 THEN '1961 tot 1980'
        WHEN {{ expr }} <= 2000 THEN '1981 tot 2000'
        WHEN {{ expr }} <= 2010 THEN '2001 tot 2010'
        ELSE '2011 en later'
    END
{%- endmacro %}
