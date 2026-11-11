{#
  A neighborhood name as the Analysis Neighborhoods dataset spells it. The Development Pipeline writes
  " - " where the official names use "/" ("Castro - Upper Market" for "Castro/Upper Market").
#}
{% macro analysis_neighborhood_name(expr) -%}
    replace({{ expr }}, ' - ', '/')
{%- endmacro %}
