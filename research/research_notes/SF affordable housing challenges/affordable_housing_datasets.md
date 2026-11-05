# Open datasets on San Francisco affordable housing production, funding and access

Verification method: DataSF metadata was pulled live on 2026-11-04 from `https://data.sf.gov/api/views/<id>.json`, and row counts came from `https://data.sf.gov/resource/<id>.json?$select=count(*)`. The State's APR data was checked through the data.ca.gov CKAN API (`package_show`, `datastore_search_sql`). "Last updated" means Socrata `rowsUpdatedAt`, the date the data changed, not the date the metadata was edited. DataSF API URLs follow the pattern `https://data.sf.gov/api/views/<id>.json`.

## 1. Verified dataset inventory (metadata, fields, joins)

### Takeaway
DataSF publishes a coherent set of joinable datasets on affordable housing production. The MOHCD Pipeline, the MOHCD Portfolio and Non-Unit Inclusionary Alternatives are quarterly or as-needed. Planning's Housing Production, Development Pipeline and Projects datasets and DBI's permits and completions update from daily to annually. They join on block/lot, Planning case/PRJ number, building permit application number and lat/long. The Rent Board Housing Inventory gives rents for the rental stock in bands, with a block-level address. The State's HCD APR tables add SF permits, entitlements and completions by income category for 2018–2025, plus 6th-cycle RHNA progress.

### Cited Findings

**A. MOHCD Affordable Housing Pipeline — `aaxw-2cb8`** ([metadata](https://data.sf.gov/api/views/aaxw-2cb8.json))
- Full name: "Mayor's Office of Housing and Community Development Affordable Housing Pipeline". Publisher: MOHCD. License: ODC PDDL. Publishing frequency: Quarterly. Geographic unit: street address. Rows last updated 2026-05-21; created 2016-07-21. Row count: 190 ([count](https://data.sf.gov/resource/aaxw-2cb8.json?$select=count(*))). — [metadata](https://data.sf.gov/api/views/aaxw-2cb8.json)
- Description: MOHCD and OCII pipeline projects financed through city funding agreements, ground leases, DDAs and conduit bonds, plus Inclusionary units. **Caveat:** the description still says "Data reflects all projects as of September 30, 2023", although the rows were updated on 2026-05-21. The as-of date is therefore unclear. — [metadata](https://data.sf.gov/api/views/aaxw-2cb8.json)
- 68 columns. Keys and other notable fields:
  - IDs and location: `project_id`, `project_name`, `project_status`, `construction_status`, `plannning_approval_address` (misspelled in the source), `block`, `lot`, `planning_case_number`, `supervisor_district`, `city_analysis_neighborhood`.
  - Program and tenure: `lead_agency`, `general_housing_program`, `program_area`, `housing_tenure`, `section_415_declaration`.
  - Milestone dates: `issuance_of_building_permit`, `estimated_construction_completion`, `entitlement_approval`.
  - Unit totals: `total_project_units`, `mohcd_affordable_units`.
  - Units by bedroom count: `sro_units` through `_5_bd_units`.
  - Units by population served: `family_units`, `senior_units`, `tay_units`, `homeless_units`, `losp_units`, `public_housing_replacement_units`.
  - Units by AMI band: `_20_ami` … `_150_ami`, `ami_undeclared`.
  - Geometry: `latitude`, `longitude`, `location`.
  — [metadata](https://data.sf.gov/api/views/aaxw-2cb8.json)
- Grouped by project status, the 190 rows sum to 3,101 / 868 / 418 / 5,713 MOHCD affordable units across the four statuses. The latest estimated completion is 2037-06-01. — [query](https://data.sf.gov/resource/aaxw-2cb8.json?$select=max(estimated_construction_completion),count(*),sum(mohcd_affordable_units)&$group=project_status)

**B. MOHCD Affordable Housing Portfolio (completed and existing stock) — `pyxv-n29e`** ([metadata](https://data.sf.gov/api/views/pyxv-n29e.json))
- Full name: "Mayor's Office of Housing and Community Development Affordable Housing Portfolio". Publisher: MOHCD. **License field empty.** Quarterly. Rows last updated 2026-05-21; created 2023-08-21. 850 rows. — [metadata](https://data.sf.gov/api/views/pyxv-n29e.json)
- Scope: affordable rental and ownership housing financed by MOHCD or OCII, or required under the Planning or Administrative Code, including Section 415 Inclusionary units. — [metadata](https://data.sf.gov/api/views/pyxv-n29e.json)
- 34 columns:
  - IDs and location: `mohcd_development_id`, `development_name`, `marketing_address`, `supervisor_district`, `planning_neighborhood`, `ocii_project_area`.
  - Program and status: `tenure`, `project_status`, `general_housing_program`, `housing_program_program_name`, `estimated_actual_construction`.
  - Unit totals: `total_project_units`, `income_restricted_resid_units`.
  - Units by bedroom count: bedroom rollups.
  - Units by population served: `senior`, `tay`, `homeless`, `losp`, `vash` rollups.
  - Geometry: lat/long `location`.
  - **No AMI-band columns and no block/lot.** — [metadata](https://data.sf.gov/api/views/pyxv-n29e.json)
- Income-restricted units in the "Construction Complete" rows, by program:
  - MOHCD 100% Affordable (New Development): 359 developments, 26,722 units.
  - Inclusionary Housing: 292 developments, 4,562 units.
  - Other Ownership Programs: 116, 1,734.
  - MOHCD 100% Affordable (Preservation): 65, 1,035.
  — [query](https://data.sf.gov/resource/pyxv-n29e.json?$select=project_status,general_housing_program,count(*),sum(income_restricted_resid_units)&$group=project_status,general_housing_program&$limit=50)

**C. MOHCD Non-Unit Inclusionary Housing Alternatives — `g6kh-9pnv`** ([metadata](https://data.sf.gov/api/views/g6kh-9pnv.json))
- Projects that met their Section 415 requirement by fee, land dedication or off-site units, alone or combined with on-site units. Publisher: MOHCD. **License field empty.** Updated "as needed". Rows last updated 2026-05-21. 153 rows. — [metadata](https://data.sf.gov/api/views/g6kh-9pnv.json)
- Fields: `mohcd_development_id`, `planning_case_number_to_be`, `building_permit_application`, `section_415_declaration`, `project_units_planned`, `on_site_inclusionary_units`, `non_unit_inclusionary_type`, `affordable_project_created`, lat/long. — [metadata](https://data.sf.gov/api/views/g6kh-9pnv.json)
- Rows by compliance type: Fee Payment 101; Fee & On-Site Units 44; Land Dedication 5; Fee & Off-Site Units 1; Land Dedication & On-Site Units 1; Off-Site Units 1. **No fee dollar amounts.** — [query](https://data.sf.gov/resource/g6kh-9pnv.json?$select=non_unit_inclusionary_type,count(*)&$group=non_unit_inclusionary_type)

**D. Housing Production – 2005-present — `xdht-4php`** ([metadata](https://data.sf.gov/api/views/xdht-4php.json))
- Publisher: SF Planning. License: Public Domain (USGOV_WORKS). Published annually (change frequency "as needed"). Rows last updated 2026-10-30. 6,164 rows. Completion dates run from 2005-01-03 to 2026-10-22, and `bmr_reporting_year` goes up to 2026. — [metadata](https://data.sf.gov/api/views/xdht-4php.json); [query](https://data.sf.gov/resource/xdht-4php.json?$select=max(latest_completion_date),min(first_completion_date),max(bmr_reporting_year))
- Scope: completed and partially completed permits that added or removed units, including demolitions and alterations, with BMR units by affordability level. — [metadata](https://data.sf.gov/api/views/xdht-4php.json)
- Fields:
  - Join keys: `bpa`, `blocklot`, `ppts_project_id`.
  - Unit counts: `net_units`, `net_units_completed`, `adu_legalization_units`, `market_rate`, `affordable_units`.
  - Units by income level: `extremely_low_income`, `very_low_income`, `low_income`, `moderate_income`.
  - Affordability flags: `affordable_is_estimate`, `project_affordability_type`.
  - Dates: `first_completion_date`, `latest_completion_date`.
  - Geography and zoning: `supervisor_district`, `analysis_neighborhood`, `plan_area`, `zoning_district`.
  - **No point geometry.** — [metadata](https://data.sf.gov/api/views/xdht-4php.json)

**E. San Francisco Development Pipeline (quarterly) — `6jgi-cpb4`** ([metadata](https://data.sf.gov/api/views/6jgi-cpb4.json))
- Publisher: SF Planning. License: CC0 1.0. Published quarterly. Rows last updated 2026-08-28. Snapshot "as of the end of 2026 Q2". 1,917 rows. Earlier quarterly snapshots are kept as separate datasets, linked from the description. — [metadata](https://data.sf.gov/api/views/6jgi-cpb4.json)
- 66 columns:
  - Join keys: `blklot`, `case_no`, `bpa_no`.
  - Status: `current_status`, `has_approved_entitlement`.
  - Unit counts: `net_pipeline_units`, `pipeline_affordable_units`, `aff_estimation_type`.
  - BMR units by income level: `bmr_units_ex_low`, `bmr_units_very_low`, `bmr_units_low`, `bmr_units_moderate`.
  - Project type and approval path: `affordability_type`, `tenure_type`, `adu`, `state_density`.
  - Geography and zoning: `sd22`, `nhood41`, `zoning_district`, `pda`.
  - Geometry: lat/long point. — [metadata](https://data.sf.gov/api/views/6jgi-cpb4.json)

**F. Planning Department Records – Projects — `qvu5-m3a2`** ([metadata](https://data.sf.gov/api/views/qvu5-m3a2.json))
- PRJ records from Planning's Accela system. License: Public Domain. Updated daily. Rows last updated 2026-11-04. 54,697 rows. Geographic unit: block/lot. — [metadata](https://data.sf.gov/api/views/qvu5-m3a2.json)
- 107 columns:
  - IDs: `record_id`, `block`, `lot`, `building_permits`.
  - Decision: `project_decision`, `project_decision_date`.
  - Unit counts: `number_of_affordable_units`, `number_of_market_rate_units`, `number_affordable_units_prop`.
  - Program and streamlining flags: `inclusionary`, `sb35`, `ab2162`, `sb330`, `homesf`, `state_density_bonus_*`, `ahbp_100_percent_affordable`.
  - Units by unit type, existing and proposed. — [metadata](https://data.sf.gov/api/views/qvu5-m3a2.json)

**G. DBI Building Permits — `i98e-djp9`** ([metadata](https://data.sf.gov/api/views/i98e-djp9.json))
- Publisher: DBI. License: ODC PDDL. Published daily. Rows last updated 2026-11-04. 1,297,870 rows; one permit can appear on several rows, one per address. — [metadata](https://data.sf.gov/api/views/i98e-djp9.json)
- Related views: `f2jc-ivnc` (deduplicated on primary address, 1,151,767 rows) and `p4e4-a5a7` (permits filed since 2013). — [count](https://data.sf.gov/resource/f2jc-ivnc.json?$select=count(*)); [p4e4 metadata](https://data.sf.gov/api/views/p4e4-a5a7.json)
- Since 2024-12-10 the dataset publishes only new or updated rows; use `data_as_of` to find the latest data. — [metadata](https://data.sf.gov/api/views/i98e-djp9.json)
- Fields: `permit_number`, `block`, `lot`, `existing_units`, `proposed_units`, `filed_date`, `issued_date`, `completed_date`, `first_construction_document_date`, `adu`, `estimated_cost`, `location` (point). — [metadata](https://data.sf.gov/api/views/i98e-djp9.json)
- **PermitSF Permitting Data `tyz3-vt28`** is a new system that went live in February 2026. As of 2026-09-14 it covered only minor permit types, such as windows, reroofing, electrical and plumbing. — [metadata](https://data.sf.gov/api/views/tyz3-vt28.json)

**H. Dwelling Unit Completion Counts by Building Permit — `j67f-aayr`** ([metadata](https://data.sf.gov/api/views/j67f-aayr.json))
- Publisher: DBI. Monthly. Rows last updated 2026-11-03. 2,574 rows. Covers new units approved for occupancy since January 2018. Five fields: `building_permit_application`, `building_address`, `date_issued`, `document_type`, `number_of_units_certified`.
- The description calls these counts "preliminary" and says Planning's annual Housing Inventory is more complete. **No affordability split.** — [metadata](https://data.sf.gov/api/views/j67f-aayr.json)

**I. Rent Board Housing Inventory — `gdc7-dmcn`** ([metadata](https://data.sf.gov/api/views/gdc7-dmcn.json))
- Publisher: Rent Arbitration Board. License: ODC PDDL. Published daily. Rows last updated 2026-11-04. 560,304 rows. It is a filtered view of parent `45m8-u7si`. — [metadata](https://data.sf.gov/api/views/gdc7-dmcn.json)
- Legal basis: owners must report since 2022 (buildings of 10+ units) or 2023 (condos and smaller buildings), with updates due each March 1. — [metadata](https://data.sf.gov/api/views/gdc7-dmcn.json)
- Rows by `submission_year`: 2022: 66,744; 2023: 107,886; 2024: 111,513; 2025: 132,088; 2026: 133,320; 2027: 8,753. — [query](https://data.sf.gov/resource/gdc7-dmcn.json?$select=submission_year,count(*)&$group=submission_year)
- Fields:
  - Location: `block_num`, `block_address` (block-level, e.g. "100 Block of WILLARD ST"), `point`, `analysis_neighborhood`, `supervisor_district`.
  - Unit: `unit_count`, `bedroom_count`, `bathroom_count`, `square_footage` (banded), `year_property_built`.
  - Occupancy: `occupancy_type`, `occupancy_or_vacancy_date`, `vacancy_date`.
  - Rent: `monthly_rent` (banded, e.g. "$1501-$1750"), utility-inclusion flags.
  — [metadata](https://data.sf.gov/api/views/gdc7-dmcn.json); [sample row](https://data.sf.gov/resource/gdc7-dmcn.json?$limit=1)
- About 68,393 rows have a blank `monthly_rent`, the largest single group. — [query](https://data.sf.gov/resource/gdc7-dmcn.json?$select=monthly_rent,count(*)&$group=monthly_rent&$order=count(*)%20desc&$limit=15)
- A note dated 2026-03-18 says an earlier bug left out some current-fiscal-year reports and has been fixed. — [metadata](https://data.sf.gov/api/views/gdc7-dmcn.json)

**J. Annual Allowable Rent Increase — `hsxb-ci7b`**
- Rent Board. Annual. Rows last updated 2026-05-01. 46 rows. Two fields: `effective_starting_date`, `annual_allowable_increase`. Rule: 60% of the change in CPI-U for San Francisco-Oakland-San Jose. — [metadata](https://data.sf.gov/api/views/hsxb-ci7b.json)

**K. Funding datasets**
- **GO Bonds Program Spending and Status `m793-kis4`.** Controller. Annual. Rows last updated 2026-04-25. 151 rows.
  - Fields: `bondprogram`, `year`, `component_programitem`, `bondauthamount`, `revisedbudget`, `issuedtodate`, `expended`, `encumbrance`, `remaining_balance`, project end dates. — [metadata](https://data.sf.gov/api/views/m793-kis4.json)
  - Includes "Affordable Housing" components of the 2015, 2019 and 2024 bonds. For example, one 2024 component of $240M has $2.91M expended. — [query](https://data.sf.gov/resource/m793-kis4.json?$select=bondprogram,year,bondauthamount,expended&$where=upper(bondprogram)%20like%20'%25HOUSING%25'&$limit=20)
- **GO Bond Projects `d3dc-v5yr`.** Controller. Annual. Rows last updated 2026-04-24. 305 rows. Planned and completed project names by bond and component; **no project ID or block/lot**. — [metadata](https://data.sf.gov/api/views/d3dc-v5yr.json)
- **Historical, not current:**
  - MOHCD Bond Issuances `2sdw-jdpk`: 68 rows, last updated 2016-06-15.
  - MOHCD Grants and Loans `ez9i-q28j`: 662 rows, last updated 2016-06-14; fields `project_id`, `loan_id`, `funding_agreement_date`, `amount_of_loan_commitment`.
  - Community Development Projects by Funding Source `b3ix-g8t8`: FY2018-19 only, last updated 2020-05-21.
  — [2sdw](https://data.sf.gov/api/views/2sdw-jdpk.json); [ez9i](https://data.sf.gov/api/views/ez9i-q28j.json); [b3ix](https://data.sf.gov/api/views/b3ix-g8t8.json)

**L. Housing stock and parcels**
- **Assessor Historical Secured Property Tax Rolls `wv5m-vpq2`.** Assessor-Recorder. Annual. Rows last updated 2026-06-26. 3,934,467 rows; the description says it covers roll years 2007-07-01 to 2024-06-30.
  - Fields: `parcel_number`, `block`, `lot`, `use_code`, `year_property_built`, `number_of_units`, `number_of_bedrooms`, `exemption_code` (the welfare exemption identifies some nonprofit affordable housing — *inference, not verified in the data*), assessed values, `the_geom` (point). — [metadata](https://data.sf.gov/api/views/wv5m-vpq2.json)
- Parcels, address and land-use datasets exist for joining: Parcels `acdm-wktn`, Addresses with Units `ramy-di5m`, Land Use `c5ge-t6pj`. These were seen in a catalog search; **their metadata was not inspected**. — [catalog search](https://api.us.socrata.com/api/catalog/v1?domains=data.sf.gov&search_context=data.sf.gov&q=assessor&limit=50)

**M. Census and demographics on DataSF**
- **San Francisco Population and Demographic Census Data `4qbq-hvtt`.** ACS-derived long table with estimates, MOEs and an `acs_table` field. Rows last updated 2025-03-27. — [metadata](https://data.sf.gov/api/views/4qbq-hvtt.json)

**N. Historical and zoning context**
- Housing Balance March 2016 `8iri-b2sz`: historical only. — [metadata](https://data.sf.gov/api/views/8iri-b2sz.json)
- Regression data for the Inclusionary Housing Simulation Model `vcwn-f2xk`: Controller, 2016, historical. — [metadata](https://data.sf.gov/api/views/vcwn-f2xk.json)
- AHBP eligible parcels `fizh-zaxt`: 2015. — [metadata](https://data.sf.gov/api/views/fizh-zaxt.json)
- Housing Sustainability Districts `7way-43xh`: polygons, 2026-03-03. — [metadata](https://data.sf.gov/api/views/7way-43xh.json)

**O. CA HCD Housing Element Annual Progress Report (APR) data** ([package](https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year))
- Publisher: California HCD. **"License not specified".** Package modified 2026-10-30. CSV resources with the datastore active: Tables A, A2, C, D, E, F, F2, G, H and K, each with a DOCX data dictionary. — [CKAN package_show](https://data.ca.gov/api/3/action/package_show?id=housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year)
- Legal basis: Gov. Code §65400, as described by HCD. — [package](https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year); [HCD APR page](https://www.hcd.ca.gov/planning-and-community-development/annual-progress-reports)
- **Table A2** (resource `fe505d9b-8c36-42ba-ba30-08bc4f34e022`): entitlements, building permits and certificates of occupancy, by income category, split into deed-restricted (`_DR`) and non-deed-restricted (`_NDR`).
  - SF rows by year: 2018: 758; 2019: 1,053; 2020: 658; 2021: 794; 2022: 673; 2023: 586; 2024: 805; 2025: 572.
  - Fields: `APN`, `JURS_TRACKING_ID` (SF uses Planning PRJ numbers, e.g. "2017-012151PRJ"), `UNIT_CAT`, `TENURE`, `FIN_ASSIST_NAME`, `DR_TYPE`, `TERM_AFF_DR`, `DEM_DES_UNITS`, `APPROVE_SB35`, density bonus fields, `LATITUDE`, `LONGITUDE`.
  — [CKAN SQL](https://data.ca.gov/api/3/action/datastore_search_sql); [resource](https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year)
- **Table A** (`c78b769d-cc02-4050-91ef-79ded665b5a8`): housing development applications submitted, with proposed, approved and disapproved units by income. SF has 3,130 rows for 2018–2025. — [resource](https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year)
- **Table E** (`ec5124e6-a6ce-435d-82b1-0c963aaf15dd`): commercial development bonus projects. Fields: `APN`, `JURS_TRACKING_ID`, units by income, `DATE_APPROVED`. — [resource](https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year)
- **RHNA Progress Report** ([package](https://data.ca.gov/dataset/rhna-progress-report)), 6th Cycle resource `1e80a9cf-724c-432d-8374-e9708a6a92dc`. License "Other (Public Domain)". Modified 2026-10-30.
  - SF row: planning period 01/31/2023–01/31/2031.

    | Income category | Units permitted | RHNA allocation | Share met |
    |---|---|---|---|
    | Very low | 1,685 | 20,867 | 8% |
    | Low | 1,215 | 12,014 | 10% |
    | Moderate | 971 | 13,717 | 7% |
    | Above moderate | 2,215 | 35,471 | 6% |

  — [CKAN SQL query of resource 1e80a9cf](https://data.ca.gov/dataset/rhna-progress-report)
- HCD also runs an interactive APR dashboard. — [HCD APR dashboard](https://www.hcd.ca.gov/housing-open-data-tools/apr-dashboard)

**P. Income limits, maximum rents and AMI**
- MOHCD's 2026 Income and Rent Limits:
  - Effective 2026-06-01 until the 2027 update.
  - Based on HUD's *unadjusted* AMI for the San Francisco HMFA, effective 2026-05-01; AMI rose 4% from 2025.
  - Two charts: Maximum Incomes by Household Size (1–9 persons) and Maximum Monthly Rent by Unit Type (including High and Low HOME rents).
  - Utility allowances from the SF Housing Authority, effective 2026-01-01.
  — [sf.gov 2026-2027 AMI guidance](https://www.sf.gov/2026-2027-area-median-income-guidance)
- A 2026 AMI income limits PDF is posted. **Published as PDF, not as a machine-readable table, so it would need parsing.** — [2026_AMI-IncomeLimits-HMFA.pdf](https://media.api.sf.gov/documents/2026_AMI-IncomeLimits-HMFA.pdf)
- Separate pages exist for MOHCD homeownership income limits and sales prices, and for inclusionary rental limits. — [homeownership limits](https://www.sf.gov/reports--income-limits-and-sales-price-levels-mohcd-homeownership-programs); [inclusionary rental limits (May 2024)](https://www.sf.gov/reports--may-2024--income-and-rent-limits-inclusionary-rental-units)
- HUD Income Limits portal: page reachable (HTTP 200); its contents were not inspected. — [HUD IL](https://www.huduser.gov/portal/datasets/il.html)

**Q. Census ACS and HUD CHAS**
- ACS 5-year 2024 table **B25070** (Gross Rent as a Percentage of Household Income) exists in the Census API, with brackets from "<10%" to "50.0 percent or more" (`B25070_010E`). — [Census API groups/B25070](https://api.census.gov/data/2024/acs/acs5/groups/B25070.json)
- HUD CHAS portal is reachable (HTTP 200), but the page content could not be extracted. — [HUD CHAS](https://www.huduser.gov/portal/datasets/cp.html)

### Inferences
- **Join spine:**
  - Block/lot links aaxw-2cb8, xdht-4php, 6jgi-cpb4, qvu5-m3a2, i98e-djp9, wv5m-vpq2 and APR `APN`. Format differs: `blklot`/`blocklot` are concatenated, others are separate `block` and `lot` fields.
  - Planning case/PRJ number links aaxw-2cb8 `planning_case_number`, 6jgi-cpb4 `case_no`, qvu5-m3a2 `record_id`, g6kh-9pnv and APR `JURS_TRACKING_ID`.
  - Building permit application number links xdht-4php `bpa`, 6jgi-cpb4 `bpa_no`, j67f-aayr, g6kh-9pnv and i98e-djp9.
  - MOHCD development ID links pyxv-n29e and g6kh-9pnv. aaxw-2cb8 uses `project_id`; whether it matches the development ID is **unverified**.
- The Portfolio (pyxv-n29e) has no block/lot. Joining it to parcels needs lat/long or address geocoding.
- Rent Board data is block-level and banded. It supports neighborhood rent distributions, not unit-level rents, and it does not flag which units are BMR or rent-controlled.

### Gaps
- MOHCD's quarterly refresh cadence versus the stale "as of September 30, 2023" text in aaxw-2cb8 is unresolved. Check `estimated_construction_completion` and the status fields against the MOHCD Pipeline report.
- Rent Board parent dataset `45m8-u7si` was not inspected.
- Planning's annual Housing Inventory report and the Housing Balance Report (current editions) were not located in machine-readable form.
- HUD CHAS latest vintage was not confirmed.
- ACS tract-level query for SF (county 075) returned no data in testing (possibly an API key or rate limit). Not verified.

## 2. Funding and access: bonds, OCOH, DAHLIA and lotteries

### Takeaway
Bond spending is machine-readable at program-component level (m793-kis4), but MOHCD loan-level funding data on DataSF stopped in 2016. Our City Our Home (Prop C) spending is published as annual Controller data stories, not as a found open dataset. DAHLIA is open-source code with no documented public listings or applications API. Lottery results are posted per listing, historically as PDFs.

### Cited Findings
- **OCOH (Prop C):** the Controller publishes annual data stories; FY25 reports about $331M invested. The Oversight Committee page links six-month and annual reports. No DataSF dataset was found. — [OCOH FY25 report](https://www.sf.gov/our-city-our-home-fund-annual-report-fy25); [OCOH Oversight Committee](https://www.sf.gov/departments--our-city-our-home-oversight-committee); [FY22-23 executive summary](https://www.sf.gov/data--ocoh-fund-annual-report-fy22-23-executive-summary)
- **GO Bond reporting:** the Controller's GO Bond Report homepage and dashboards are linked from m793-kis4. — [GO Bond report](https://www.sf.gov/general-obligation-bond-program-report); [m793-kis4 metadata](https://data.sf.gov/api/views/m793-kis4.json)
- **DAHLIA:**
  - The portal is housing.sfgov.org (reachable). — [DAHLIA](https://housing.sfgov.org/)
  - Source code is at SFDigitalServices/sf-dahlia-web, a Rails/AngularJS front end on a Salesforce backend. A search summary reported it as GPL-3.0; **not directly verified**. — [GitHub mirror reference](https://github.com/bk3c/sf-dahlia-web); [Exygy](https://exygy.com/work/affordable-housing-sf)
  - No public listings API or dataset was found.
- **Lotteries:**
  - MOHCD says results are posted on each listing no later than one week after the lottery, filtered by preference category. — [How MOHCD runs lotteries](https://www.sf.gov/information--learn-how-mohcd-runs-affordable-housing-lotteries)
  - Older per-lottery result PDFs exist. — [example 2020](https://sfmohcd.org/sites/default/files/Documents/MOH/Lottery%20Results/101%20Crescent%232102%20-%20Final%20LotteryResults%203.23.20.pdf)
  - The DALP (Down Payment Assistance) lottery results page exists. — [DALP lottery results](https://www.sf.gov/dalp-lottery-results)
- **Aggregate outcomes exist only in ad hoc documents.** For example, an Oct 13, 2026 MOHCD veteran-priority deck reports, per a search summary (**not directly verified**):
  - FY24-25 to FY25-26 applications: 427 → 854.
  - Signed leases: 12 → 34.
  — [MOHCD veterans deck](https://media.api.sf.gov/documents/Veterans_Affairs_Council_Meeting_Veteran_Priority_MOHCD_10.13.2026.pdf)
- **Certificate of Preference:** an OCII FY2021-22 annual report (search summary, **not directly verified**) states that 87 COP holders applied and 17 were housed, with 991 rental units offered through DAHLIA. — [OCII COP report](https://sfocii.org/sites/default/files/2024-09/2021-22%20MEMO_COP%20Annual%20Report%20w%20Att.pdf)
- **Condominium Lottery Drawing Results `h9dp-7wd4`** (Public Works, last updated 2021-08-23) concerns condo conversion, not affordable housing. Metadata was not inspected. — [catalog search](https://api.us.socrata.com/api/catalog/v1?domains=data.sf.gov&search_context=data.sf.gov&q=lottery&limit=50)

### Inferences
- A cited-answer tool can answer access questions with income limits and rents (PDF parse) plus Portfolio and Pipeline unit mixes. It cannot answer "how many people applied, or what were my odds" from open data.

### Gaps
- No open dataset of DAHLIA applications, lottery rankings, preference outcomes or waitlists was found.
- OCOH spending by service area exists only in embedded dashboards; no downloadable dataset was found.
- Housing Trust Fund annual expenditure reports were not located.
- Prop A 2019 and 2024 bond accountability reports beyond m793-kis4 were not located.
- Current MOHCD loan commitments by project: the latest open data is 2016.

## 3. Legal and program texts (Rent Ordinance, Planning Code §415, MOHCD rules)

### Takeaway
All the key rule texts are public, but as PDFs or HTML, not structured data. The Rent Ordinance is published by the Rent Board as a PDF (amended 2026-06-29). The Planning Code is on American Legal, which returned HTTP 403 to scripted requests. MOHCD and Planning publish the Inclusionary Monitoring and Procedures Manual, Small Sites NOFAs and manuals as PDFs.

### Cited Findings
- **Rent Ordinance (Admin Code Ch. 37):**
  - The Rent Board PDF is dated as amended June 29, 2026, and is marked as not the official record. — [600_Ordinance_6-29-26.pdf](https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf); [Rent Ordinance page](https://www.sf.gov/rent-ordinance)
  - American Legal is the official publisher. — [amlegal Ch. 37 §37.1](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-15928)
  - Per-section HTML pages also exist on sf.gov. — [§37.1 on sf.gov](https://www.sf.gov/information--sec-371-title-finding)
- **Planning Code §415:**
  - American Legal hosts the codified text. Automated fetches returned **HTTP 403** (tested 2026-11-04), so bulk loading may need a manual download or another access route. — [amlegal SF codes](https://codelibrary.amlegal.com/codes/san_francisco/latest/overview)
  - The sf.gov Inclusionary program page summarizes the rules (10+ units; on-site, off-site, fee or land options; NSR recording; MOHCD lottery) but does not link fee schedules. — [sf.gov Inclusionary Housing Program](https://www.sf.gov/information--inclusionary-housing-program)
- **Inclusionary Affordable Housing Program Monitoring and Procedures Manual:**
  - Planning resource page last updated 04/29/2025, linking a manual dated 7.25.24. — [SF Planning resource](https://sfplanning.org/resource/inclusionary-affordable-housing-program-monitoring-and-procedures); [Manual PDF 7.25.24](https://sfplanning.org/sites/default/files/documents/legis/inclusionary-affordable-requirements/Inclusionary_Affordable_Housing_Monitoring_and_Procedures_Manual_7.25.24.pdf)
  - Earlier versions: the 2018 manual and a May 2024 draft. — [2018 manual](https://sfmohcd.org/sites/default/files/Documents/MOH/Inclusionary%20Manuals/Inclusionary%20Affordable%20Housing%20Program%20Manual%2010.15.2018.pdf); [2024 draft](https://www.sf.gov/sites/default/files/2024-05/Inclusionary%20Affordable%20Housing%20Program%20Manual_DRAFT_POSTED%20ONLINE_5.13.2024.pdf)
- **Small Sites Program:**
  - 2019 NOFA. — [Small Sites NOFA 2019](https://sfmohcd.org/sites/default/files/Documents/MOH/Small%20Sites/Small%20Sites%20NOFA-2019-final.pdf)
  - 2022 Preservation/SSP underwriting guidelines memo. — [memo](https://sf.gov/sites/default/files/2022-11/Approved%20Preservation%20Program%20Guidelines%20Reform%20Memo%20-%20Loan%20Committee%209-9-2022.pdf)
  - SSP Marketing and Leasing Manual (2021). — [manual](https://sfmohcd.org/sites/default/files/Documents/MOH/Asset%20Management/21-0524%20SSP%20Marketing%20and%20Leasing%20Manual_0.pdf)
- **Housing Element sites inventory:**
  - HCD sends sites inventory data to DGS for a statewide ArcGIS map. The HCD page mentions **no downloadable dataset**. — [HCD sites inventory](https://hcd.ca.gov/housing-element/sites-inventory); [DGS/HCD map](https://experience.arcgis.com/experience/670e112e04ae415e9755f2d65fded76c/)
  - SF's May 2022 draft Housing Element PDF is on HCD's site. — [SF 6th cycle draft](https://www.hcd.ca.gov/housing-elements/docs/san-francisco-6th-draft051022.pdf)
  - SCAG's compiled statewide HE sites service may include SF parcels; **not verified**. — [SCAG HE sites service](https://maps.scag.ca.gov/scaggis/rest/services/LDX/HousingElementSite_poly_scag/MapServer)

### Inferences
- For a cited-answer tool, rule texts can be loaded as versioned PDF snapshots with section-level chunking. The Rent Board PDF and the Inclusionary manual are the most practical sources. The Planning Code will likely need a manual export from American Legal.

### Gaps
- The current (2025–2026) Small Sites NOFA and guidelines were not found.
- The current Inclusionary fee schedule (MOHCD/DBI annual fee adjustment) was not located.
- SF's adopted (as opposed to draft) Housing Element sites inventory in tabular form was not located.
- Whether American Legal allows bulk export or API access was not determined.

## 4. Questions each dataset answers, limits, and joinability

### Takeaway
Together the verified datasets answer most "how much, where, for whom, at what income level, and how far along" questions on affordable production, plus RHNA progress and bond spending. They cannot answer applicant- or lottery-level access questions, or current per-project subsidy amounts.

### Cited Findings
**Policymaker questions:**
- **How many affordable units have been completed since 2005, by year, neighborhood and income tier, and what share of net new units is that?**
  - Source: xdht-4php.
  - Caveat: `affordable_is_estimate` flags estimated counts. — [metadata](https://data.sf.gov/api/views/xdht-4php.json)
- **What is in the pipeline: units entitled versus under construction, by AMI band and population served (homeless, senior, TAY), and when will they be completed?**
  - Sources: aaxw-2cb8 (MOHCD/OCII deals) and 6jgi-cpb4 (all projects, BMR units by income).
  - Caveat: the aaxw-2cb8 as-of date is unclear. — [aaxw](https://data.sf.gov/api/views/aaxw-2cb8.json); [6jgi](https://data.sf.gov/api/views/6jgi-cpb4.json)
- **How do developers meet inclusionary requirements (fee versus on-site versus land)?**
  - Source: g6kh-9pnv, joined to Planning records via case number.
  - Caveat: no dollar amounts. — [g6kh](https://data.sf.gov/api/views/g6kh-9pnv.json)
- **How far is SF from its 6th-cycle RHNA by income category?**
  - Source: the RHNA Progress Report.
  - The share met is 6–10% across categories as of the 2026-10-30 refresh (see section 1 table). — [RHNA package](https://data.ca.gov/dataset/rhna-progress-report)
- **How much of each affordable housing bond has been issued and spent?**
  - Source: m793-kis4.
  - Caveat: program-component level only; no project linkage. — [m793](https://data.sf.gov/api/views/m793-kis4.json)
- **How many projects used SB 35, AB 2162, HOME-SF or state density bonus streamlining?**
  - Sources: qvu5-m3a2 flags; APR Table A2 `APPROVE_SB35` and density bonus fields. — [qvu5](https://data.sf.gov/api/views/qvu5-m3a2.json); [APR](https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year)

**Resident questions:**
- **What affordable buildings exist near me, for seniors or families, and with what unit sizes?**
  - Source: pyxv-n29e (lat/long, bedroom and population rollups).
  - Caveat: no AMI levels in the Portfolio. — [pyxv](https://data.sf.gov/api/views/pyxv-n29e.json)
- **Do I qualify, and what is the maximum rent at 50% or 80% AMI for my household size?**
  - Source: the MOHCD 2026 income and rent limits (PDF). — [AMI guidance](https://www.sf.gov/2026-2027-area-median-income-guidance)
- **What do rents typically look like for a 2-bedroom in my neighborhood?**
  - Source: the Rent Board Housing Inventory, banded rents by `analysis_neighborhood`.
  - Caveat: self-reported, banded, many blanks. — [gdc7](https://data.sf.gov/api/views/gdc7-dmcn.json)
- **How much can my rent-controlled rent go up this year?**
  - Source: hsxb-ci7b. — [hsxb](https://data.sf.gov/api/views/hsxb-ci7b.json)
- **What share of renters in my area pay 30% or 50%+ of income on rent?**
  - Source: ACS B25070 (tract-level availability not tested successfully). — [Census API](https://api.census.gov/data/2024/acs/acs5/groups/B25070.json)

### Inferences
- **Licensing:** pyxv-n29e and g6kh-9pnv have an empty license field, and the HCD APR package is "License not specified". A tool should cite these and flag the license as unstated rather than assume public domain. The other DataSF sets are PDDL, CC0 or USGOV public domain.
- **Overlapping production counts:** xdht-4php, j67f-aayr, 6jgi-cpb4 and APR Table A2 measure overlapping things with different rules (completion definition, estimates). Answers should name which source they use rather than mix them.

### Gaps
- No verified crosswalk between MOHCD `project_id` / `mohcd_development_id` and Planning PRJ numbers beyond the shared `planning_case_number` field.
- Match rates were not tested.
