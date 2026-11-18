{#
  Labels that run out before they were registered. The register holds currently valid labels, each running
  from its registration to its day of expiry; a label whose expiry precedes its registration would be a row
  the register cannot have meant, and answers about how long a label still holds would break; the build fails
  instead.
#}
SELECT bag_verblijfsobject_id, registered_on, valid_until
FROM {{ ref('energy_labels') }}
WHERE valid_until < registered_on
