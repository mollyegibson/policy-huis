{#
  Plans whose tenure parts do not add up to the total the source publishes for them. The register totals each
  plan itself, and answers use its total as published: reported, not fatal.
#}
{{ config(severity='warn') }}

SELECT
    project_id, total_units,
    coalesce(units_social_rent_corporation, 0) + coalesce(units_social_rent_independent, 0)
        + coalesce(units_mid_rent, 0) + coalesce(units_private_rent, 0) + coalesce(units_private_sale, 0)
        + coalesce(units_affordable_sale, 0) + coalesce(units_private_rent_or_sale, 0)
        + coalesce(units_non_self_contained, 0) + coalesce(units_temporary, 0) + coalesce(units_student, 0)
        + coalesce(units_young, 0) + coalesce(units_self_build, 0) + coalesce(units_unknown_tenure, 0) AS units_by_tenure
FROM {{ ref('planned_housing') }}
WHERE coalesce(total_units, 0) <> coalesce(units_social_rent_corporation, 0) + coalesce(units_social_rent_independent, 0)
    + coalesce(units_mid_rent, 0) + coalesce(units_private_rent, 0) + coalesce(units_private_sale, 0)
    + coalesce(units_affordable_sale, 0) + coalesce(units_private_rent_or_sale, 0) + coalesce(units_non_self_contained, 0)
    + coalesce(units_temporary, 0) + coalesce(units_student, 0) + coalesce(units_young, 0) + coalesce(units_self_build, 0)
    + coalesce(units_unknown_tenure, 0)
