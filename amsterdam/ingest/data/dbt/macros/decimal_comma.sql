{#
  A number as an EP-Online field records it: digits with a comma for the decimals ("518,00"), which becomes
  null when the field is empty.
#}
{% macro decimal_comma(expr) -%}
    CASE WHEN {{ expr }} ~ '^[0-9]+(,[0-9]+)?$' THEN replace({{ expr }}, ',', '.')::numeric END
{%- endmacro %}
