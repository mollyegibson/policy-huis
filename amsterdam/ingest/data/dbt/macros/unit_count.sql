{#
  A unit count as a Nieuwbouwplannen tenure field records it: a whole number, or "n.b." (nog niet bekend, not
  yet known) where the plan gives none, which becomes null so answers can tell an unknown count from a zero.
#}
{% macro unit_count(expr) -%}
    CASE WHEN {{ expr }} ~ '^[0-9]+$' THEN ({{ expr }})::integer END
{%- endmacro %}
