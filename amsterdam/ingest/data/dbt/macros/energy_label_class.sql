{#
  The label class of an EP-Online energy label: the register names the classes "A" up to and including "G",
  with the classes above "A" carrying plus signs ("A++") for how far above the standard they reach, and a
  building's label being asked about as its class. A label without a class gives null.
#}
{% macro energy_label_class(expr) -%}
    upper(substring(nullif({{ expr }}, '') from 1 for 1))
{%- endmacro %}
