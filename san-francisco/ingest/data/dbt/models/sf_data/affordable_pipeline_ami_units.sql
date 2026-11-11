{# Units per project and income band: an unpivot of the source's AMI columns, as named in its metadata. #}
{% set ami_columns = [
    '_20_ami', '_30_ami', '_40_ami', '_50_ami', '_55_ami', '_60_ami', '_80_ami', '_90_ami',
    '_100_ami', '_105_ami', '_110_ami', '_120_ami', '_130_ami', '_150_ami', 'ami_undeclared'
] %}

SELECT project_id, ami_band, units
FROM (
    {% for column in ami_columns %}
    SELECT
        record ->> 'project_id' AS project_id,
        '{{ column }}' AS ami_band,
        (record ->> '{{ column }}')::integer AS units
    FROM {{ source('raw_sf_data', 'affordable_pipeline') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf_data', 'affordable_pipeline') }}
    {% if not loop.last %}UNION ALL{% endif %}
    {% endfor %}
) AS bands
WHERE units > 0
