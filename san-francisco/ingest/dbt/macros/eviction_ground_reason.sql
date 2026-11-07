{#
  The reason in the Rent Board's annual eviction report that an Eviction Notices ground column records. The
  report gives each reason's Ordinance section; the dataset names its columns in its own words, so this pairs
  them by wording. A column it does not name gives null, which fails the eviction_grounds tests.
#}
{% macro eviction_ground_reason(column) -%}
    CASE {{ column }}
        WHEN 'non_payment' THEN 'non-payment of rent'
        WHEN 'late_payments' THEN 'habitual late payment of rent'
        WHEN 'breach' THEN 'breach of rental agreement'
        WHEN 'nuisance' THEN 'committing a nuisance'
        WHEN 'illegal_use' THEN 'illegal use of rental unit'
        WHEN 'failure_to_sign_renewal' THEN 'failure to renew agreement'
        WHEN 'access_denial' THEN 'failure to permit landlord access'
        WHEN 'unapproved_subtenant' THEN 'unapproved subtenant'
        WHEN 'owner_move_in' THEN 'owner/relative move-in'
        WHEN 'condo_conversion' THEN 'condo conversion sale'
        WHEN 'demolition' THEN 'demolition (single unit)'
        WHEN 'capital_improvement' THEN 'capital improvement work'
        WHEN 'substantial_rehab' THEN 'substantial rehabilitation'
        WHEN 'ellis_act_withdrawal' THEN 'Ellis (withdrawal of unit)'
        WHEN 'lead_remediation' THEN 'lead remediation'
        WHEN 'development' THEN 'development agreement'
        WHEN 'good_samaritan_ends' THEN 'Good Samaritan'
        WHEN 'roommate_same_unit' THEN 'roommate eviction'
        WHEN 'other_cause' THEN 'other or no reason given'
    END
{%- endmacro %}
