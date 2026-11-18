{#
  A number as a CBS StatLine field records it: digits with a dot for the decimals ("1.6"), or empty where CBS
  suppresses a figure to protect a small group, which becomes null so answers can tell an unpublished figure
  from a zero.
#}
{% macro cbs_number(expr) -%}
    CASE WHEN {{ expr }} ~ '^-?[0-9]+(\.[0-9]+)?$' THEN ({{ expr }})::numeric END
{%- endmacro %}
