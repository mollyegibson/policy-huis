# Affordable Housing Site Selection in San Francisco: Frameworks, Tools and Open Data

Research date: 2026-11-04. DataSF metadata was pulled live from `https://data.sf.gov/api/views/<id>.json` and the catalog `https://data.sf.gov/data.json` on that date. Opportunity-map tract counts were computed from the official TCAC XLSX files downloaded that day.

## 1. Official frameworks (TCAC/HCD Opportunity Map, SF Housing Element geographies, sites inventory, SB 79, AB 2011, surplus land, TCAC amenity points)

### Takeaway
State and city policy now steer affordable housing toward "High/Highest Resource" tracts (TCAC/HCD Opportunity Map, used directly in 9% tax-credit scoring) and toward transit. TCAC also scores sites on fixed straight-distance thresholds to transit, grocery stores, parks, libraries, schools, clinics and pharmacies. In SF, the Family Zoning Plan (effective 2026-01-12) carries out the Housing Element rezoning and is the city's proposed SB 79 "Alternative Plan". SB 79 took effect 2026-07-01, with temporary parcel exemptions through 2032. Litigation is pending.

### Cited Findings

**TCAC/HCD Opportunity Map**
- The current adopted version is the **2026 Opportunity and Neighborhood Change Maps, adopted December 2025**. A **2027 draft** is posted with methodology, statewide XLSX, shapefile, FAQ and an interactive tool. The draft file names carry the date stamp "102226", which suggests October 2026 (inferred). — [CTCAC Opportunity Area Maps](https://www.treasurer.ca.gov/ctcac/opportunity.asp); [2027 draft methodology PDF](https://treasurer.ca.gov/sites/default/files/ctcac/2027_OM_Methodology_102226.pdf); [2027 draft XLSX](https://treasurer.ca.gov/sites/default/files/ctcac/final_opp_2027_public.xlsx); [2026 summary ZIP](https://treasurer.ca.gov/sites/default/files/2025-11/summary_file.zip); [2026 interactive tool (Othering & Belonging Institute)](https://belonging.berkeley.edu/2026-ctcachcd-affh-mapping-tool)
- The 2026 final memo says no comments were received on the drafts, so no further changes were made. — [Final 2026 memo](https://www.treasurer.ca.gov/ctcac/opportunity/2026/CTCAC-HCD.pdf)
- HCD releases an updated map at the end of each year. — [HCD Opportunity Map](https://www.hcd.ca.gov/affh/opportunity-map)
- **Method:** each tract (rural areas use block groups) scores 1 point for each of 8 economic and educational indicators that is above the regional median. The 8 indicators are share above 200% of poverty, share with a bachelor's degree or higher, employment rate, median home value, math proficiency, reading proficiency, high-school graduation rate, and students not in poverty. A CalEnviroScreen 5.0 environmental-burden flag (top 5% of the region) subtracts 1 point. Categories: 8–9 = Highest, 6–7 = High, 4–5 = Moderate, below that = Low Resource. Tracts missing more than 2 indicators get no designation. A separate "High-Poverty & Segregated" overlay marks tracts with at least 30% of residents below the poverty line plus racial overrepresentation relative to the county. — [2027 draft methodology](https://treasurer.ca.gov/sites/default/files/ctcac/2027_OM_Methodology_102226.pdf) (column list confirmed in the [2027 XLSX](https://treasurer.ca.gov/sites/default/files/ctcac/final_opp_2027_public.xlsx))
- **Use in funding:** CTCAC adopted the map into its regulations in December 2017 to steer 9% LIHTC (Low-Income Housing Tax Credit) family housing toward high-opportunity areas. CDLAC regulations and HCD Super NOFA / HDFC programs also use it. — [2027 draft methodology](https://treasurer.ca.gov/sites/default/files/ctcac/2027_OM_Methodology_102226.pdf)
- **Scoring effect:** new-construction Large Family projects in a Highest or High Resource tract or block group earn **8 points**. They also get a tiebreaker bonus of +20 percentage points (Highest) or +10 (High) for non-rural projects, subject to exclusions. — [CTCAC regulations as adopted 2025-12-10 (gocodebook mirror; verify against the official regs)](https://gocodebook.com/library/us/ca/ca-ccr4-ctcac-regulations-adopted-2025-12-10/1.-transit-amenities)
- **SF classification (computed from the official XLSX, SF County, 242 tracts, Bay Area region):**

  | Map | Highest | High | Moderate | Low | No designation | High-Poverty & Segregated flag |
  |---|---|---|---|---|---|---|
  | 2026 (adopted) | 43 | 48 | 71 | 74 | 6 | 8 |
  | 2027 (draft) | 46 | 49 | 59 | 83 | 5 | 10 |

  — computed from [2026 summary](https://treasurer.ca.gov/sites/default/files/2025-11/summary_file.zip) and [2027 draft XLSX](https://treasurer.ca.gov/sites/default/files/ctcac/final_opp_2027_public.xlsx)

**SF Housing Element geographies**
- The 2022 Housing Element names **Priority Equity Geographies**, based on DPH's Community Health Needs Assessment. They are codified as a Planning Code Special Use District, Sec. 249.97. — [SF Planning Code Sec. 249.97 (gocodebook mirror)](https://gocodebook.com/library/us/ca/san-francisco-planning/article-2-use-districts/sec.-249.97.-priority-equity-geographies-special-use-district); [SF Planning 2021 release](https://sfplanning.org/news/san-francisco-planning-releases-draft-citys-first-housing-plan-focused-racial-and-social)
- **Well-Resourced Neighborhoods** are defined as High or Highest Resource Areas on the CTCAC/HCD Opportunity Map. A 2023 MOHCD NOFA Q&A cites the 2023 map for this. The Q&A points to `sfhousingelement.org/priority-equity-geographies` for the Priority Equity Geographies map, which I did not retrieve. — [MOHCD 2023 Acquisitions NOFA Q&A](https://www.sf.gov/sites/default/files/2023-03/QandA%202023%20Acquisitions%20NOFA.pdf)
- RHNA (Regional Housing Needs Allocation) for 2023–2031 is **82,069 units**. The city must rezone for a shortfall of about **36,200 units**. — [SF Family Zoning Plan page](https://sfplanning.org/sf-family-zoning-plan)
- **Family Zoning Plan:** the Planning Commission adopted it 2025-09-11 and the Board of Supervisors 2025-12-09. The Mayor signed it 2025-12-12 and it took effect **2026-01-12**. It concentrates mid-rise (6–8 storeys) and high-rise (9+) housing on transit and commercial streets in state-designated "Housing Opportunity Areas" (northern and western SF). HCD sent a preliminary substantial-compliance letter on 2025-09-09. I found no final HCD determination. — [SF Family Zoning Plan](https://sfplanning.org/sf-family-zoning-plan); [HCD preliminary letter](https://sfplanning.org/sites/default/files/documents/housing-for-all/housingelement-HCD-sf-draft-rezoning-package-09092025.pdf); [interactive adopted zoning map](https://experience.arcgis.com/experience/6e0e399f9c82456dbda233eacebc433d/)
- **Litigation:** YIMBY Law, California Housing Defense Fund and Californians for Homeownership have sued over the plan. A separate suit challenges its use as an SB 79 alternative plan. — [YIMBY Law press release](https://www.yimbylaw.org/press/yimby-law-california-housing-defense-fund-and-californians-for-homeownership-sue-san-francisco-for-violating-state-housing-law-with-family-zoning-plan); [KQED](https://www.kqed.org/news/12069226/neighborhood-small-business-groups-file-lawsuit-over-san-francisco-rezoning-plan)

**Housing Element Sites Inventory**
- Jurisdictions submit inventories electronically on HCD's Sites Inventory Form, as required by SB 6, through HCD Connect. HCD sends the data to DGS for a statewide map. Contact: sitesinventory@hcd.ca.gov. — [HCD Sites Inventory](https://hcd.ca.gov/housing-element/sites-inventory); [HCD instructions (2022-09-15)](https://www.hcd.ca.gov/sites/default/files/docs/planning-and-community/sites-inventory-instructions-09152022.pdf); [DGS data dictionary](https://www.dgs.ca.gov/-/media/Divisions/RESD/Resources/Projects/Affordable-Housing-Development-Opportunities-Search-Tool/103122/Housing-Element-Sites2021-and-byond-Data-Dictionaryv1c-4-ADA.pdf)
- The SF rezoning reused Housing Element sites assumptions at HCD's request. HCD required "suitable and available" filtering and "net neutral" capacity amendments. — [SF FZP Land Use Committee presentation 2025-11-17](https://sfplanning.org/sites/default/files/documents/citywide/fzp_land_use_committee_presentation-111725.pdf) (search-result summary only, not read in full)

**SB 79 (2025)**
- **Enacted:** signed 2025-10-10, codified at Gov. Code §§ 65912.155–65912.162, effective **2026-07-01**. — [MTC](https://mtc.ca.gov/node/4042149); [Streetsblog Cal](https://cal.streetsblog.org/2025/10/10/newsom-signs-sb-79-legislation-to-spur-housing-production-near-transit); [KQED](https://www.kqed.org/news/12059533/newsom-signs-ambitious-bill-to-boost-housing-density-near-public-transit)
- **SF effect, per SF Planning's factsheet:**
  - SB 79 covers more than **120,000 SF parcels** (over three-quarters of the city); about 75,000 are inside the Family Zoning Plan area.
  - It allows heights of 55–95 ft (5–9 storeys) near transit. The highest limits apply near BART and Caltrain; intermediate limits apply near Muni light rail and major BRT stops.
  - **From July 2026 to 2032**, a parcel is temporarily exempt if it is (a) vulnerable to at least 1 ft of sea-level rise, (b) a local historic landmark as of 2025-01-01, (c) zoned for at least 50% of SB 79 density, or (d) in a state-designated "Low Resource" area.
  - An **Alternative Plan** must provide at least equal total capacity (units and floor area), at least 50% of SB 79 density on every housing parcel, and at least 50% of unit capacity in each station area.
  - Without the plan, SB 79 would allow more height than the FZP on 57,000 parcels.

  — [SF Planning: FZP and SB 79 Compliance factsheet](https://sfplanning.org/sites/default/files/documents/citywide/fzp-sb-79-compliance.pdf)
- The FZP-as-Alternative-Plan claim rests on the city's "preliminary analysis". Some parcels outside the FZP needed extra zoning changes. I did not verify whether those changes were adopted. — same factsheet

**AB 2011 / AB 2243**
- AB 2243 took effect 2025-01-01. It redefines "commercial corridor" as any non-freeway street with a right-of-way of 70–150 ft, allows mixed-income projects on narrower corridors, and exempts office conversions from the frontage requirement. — [BB&K on AB 2243](https://bbklaw.com/resources/la-093024-ab-2243-significant-expansion-of-sb-6-ab-2011); [JD Supra](https://jdsupra.com/legalnews/ab-2243-significant-expansion-of-sb-6-5765341)
- SF Planning sends applicants to Director's Bulletin No. 9 and an AB 2011 FAQ. — [SF Planning AB 2011 FAQ](https://sfplanning.org/sites/default/files/documents/director/AB2011PackageFAQ.pdf)

**Surplus / public land**
- SF Administrative Code **Chapter 23A (Surplus Public Lands Ordinance)**:
  - Its purpose is to prioritize surplus and underutilized public land for deed-restricted affordable housing.
  - The Board of Supervisors holds an annual hearing on the Surplus Property Report by **April 15**.
  - Transferred property goes to MOHCD (the Mayor's Office of Housing and Community Development), which solicits developers competitively.

  — [SF Admin Code Ch. 23A (amlegal)](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-14343)
- Prop K (2015) exempted some of the largest public landowners from reporting, per local reporting. — [Potrero View](https://www.potreroview.net/?p=4049) (secondary source)
- Example transfer: 1939 Market St was declared exempt surplus land for 100% affordable housing. — [BOS resolution r0202-25](https://sfbos.org/sites/default/files/r0202-25.pdf) (search summary; not opened)

**TCAC site amenity points (CCR Title 4 §10325(c)(5)(A), regulations adopted 2025-12-10)**
- **Transit:**
  - 7 points: within 1/3 mi of a stop with service at least every 30 min at weekday peak, and project density above 25 du/ac.
  - 6 points: within 1/3 mi of such a stop.
  - 5 points: within 1/2 mi of such a stop.
  - 4 points: within 1/3 mi of any stop.
  - 3 points: within 1/2 mi of any stop.
- **Public park or community center:** 3 points within 1/2 mi; 2 points within 3/4 mi.
- **Library** (with inter-branch lending): 3 points within 1/2 mi; 2 points within 1 mi.
- **Full-scale grocery** (at least 25,000 sq ft): 5 / 4 / 3 points within 1/2 / 1 / 1.5 mi.
- **Neighborhood market** (at least 5,000 sq ft): 4 points within 1/4 mi; 3 points within 1/2 mi.
- **Certified farmers' market:** 2 points within 1/2 mi; 1 point within 1 mi.
- **Adult education or community college:** 3 points within 1 mi.
- **Public schools** (projects with at least 25% of units having 3+ bedrooms): 3 points if within 1/4 mi of an elementary, 1/2 mi of a middle or 1 mi of a high school, **and** inside that school's attendance area; 2 points within an extra 1/2 mi.
- **Senior center:** 3 points within 1/2 mi; 2 points within 3/4 mi.
- **Special-needs facility:** 3 points within 1/2 mi; 2 points within 1 mi.
- **Clinic** (at least 40 h/week, accepts Medi-Cal) **or hospital:** 3 points within 1/2 mi; 2 points within 1 mi.
- **Pharmacy:** 2 points within 1/2 mi; 1 point within 1 mi.
- **Free broadband** (at least 25 Mbps for 15 years): 2 points.
- Rural projects get longer distances.

  — [CTCAC regs adopted 2025-12-10 (gocodebook mirror)](https://gocodebook.com/library/us/ca/ca-ccr4-ctcac-regulations-adopted-2025-12-10/1.-transit-amenities)
- **Cap:** applicants can earn up to **15 points** for site amenities. — [Assembly analysis of AB 2270 (2026)](https://billtexts.s3.amazonaws.com/ca/ca-analysishttps-leginfo-legislature-ca-gov-faces-billAnalysisClient-xhtml-bill-id-202520260AB2270-ca-analysis-399016.pdf)
- **Measurement method:** the threshold section of the same regulations measures one recreation-area waiver "as measured by a walkable path". The amenity section text I retrieved did not state the method. — [same mirror, threshold section](https://gocodebook.com/library/us/ca/ca-ccr4-ctcac-regulations-adopted-2025-12-10/1.-transit-amenities)

### Inferences
- In SF, a TCAC amenity score is largely saturated for most infill sites: dense Muni service, small grocers and many parks are close to almost everything. The differentiating factors are opportunity category (8 points plus tiebreaker), whether a 25,000 sq ft supermarket is within 1/2 mi, and school attendance-area alignment.
- The 2026→2027 draft shift (Low Resource tracts 74→83, Moderate 71→59) matters twice. It changes which tracts earn the 8 resource-area points, and Low Resource status is one of SB 79's temporary-exemption criteria. A tool should version its opportunity-map layer by year.
- "Well-Resourced Neighborhoods" is not a separate dataset; it is derived from the Opportunity Map. A tool should compute it from the TCAC file instead of copying a map.

### Gaps
- I did not fetch the official CTCAC regulations PDF from treasurer.ca.gov; the amenity rules above come from a third-party mirror. The amenity distance-measurement method (straight-line vs walking route) and the 15-point cap should be confirmed against the official text.
- **AB 2097** (parking-minimum ban within 1/2 mi of a major transit stop) was not researched in this pass.
- The Priority Equity Geographies boundary file was not located as open data; it was not found in the DataSF catalog.
- Not verified: HCD's final determination on the FZP; the outcome of the FZP and SB 79 lawsuits; whether SF submitted or certified its SB 79 Alternative Plan.
- The current Ch. 23A Surplus Property Report and a list of MOHCD-owned or acquisition sites were not found.
- The SF Housing Element sites inventory as a machine-readable file (HCD/DGS) was not located; the DGS statewide viewer is the likely source.

## 2. Existing site-analysis tools

### Takeaway
The public, free tools are the TCAC/HCD interactive map (Othering & Belonging Institute), SF Planning's ArcGIS zoning experience, ABAG/MTC's HESS tool, and the state DGS map of state-owned and sites-inventory parcels. Proprietary platforms (UrbanFootprint, Regrid, Gridics, Zoneomics) were not verified in this pass.

### Cited Findings
- **ABAG/MTC Housing Element Site Selection (HESS) Tool:** a web map that helps Bay Area jurisdictions find potential housing sites. It is aimed at municipalities, not developers. — [ABAG HESS](https://abag.ca.gov/technical-assistance/housing-element-site-selection-hess-tool)
- **State public-land map:** Executive Order N-06-19 (2019-01-15) created an interactive DGS/HCD map of state-owned sites with housing potential. — [HCD press release](https://hcd.ca.gov/about-hcd/newsroom/department-of-general-services-department-of-housing-and-community-development-announce-interactive-map-identifying-state-owned-sites-potential)
- **Terner Center:** publishes parcel-level public and institutional land research, such as SB 4 faith-based and college land (about 171,000 eligible acres statewide), with code on GitHub. It is research, not a site-selection product. — [Terner 2023 report](https://ternercenter.berkeley.edu/wp-content/uploads/2023/08/Faith-Based-and-College-Lands-Housing-2023-.pdf); [GitHub SB4-Analysis](https://github.com/Terner-Center/SB4-Analysis); [USPS sites analysis](https://ternercenter.berkeley.edu/research-and-policy/repurposing-public-land-for-housing-an-analysis-of-californias-united-states-postal-service-sites)
- **TCAC/HCD interactive map:** maintained by UC Berkeley's Othering & Belonging Institute; free. — [2026 tool](https://belonging.berkeley.edu/2026-ctcachcd-affh-mapping-tool); [2027 draft tool](https://belonging.berkeley.edu/2027-ctcachcd-affh-mapping-tool)
- **SF Planning official zoning map:** an ArcGIS Experience. — [link cited in the DataSF zoning metadata](https://experience.arcgis.com/experience/573d02b43b7b46e381df04b7f225da95)
- **MTC/ABAG growth geographies:** MTC hosts 2021 Transit Priority Areas, built from Plan Bay Area 2050 planned transit and existing regional stops. Plan Bay Area 2050+ Final Blueprint was adopted in 2025. — [MTC ArcGIS TPA 2021 FeatureServer](https://services3.arcgis.com/i2dkYWmb4wHvYPda/ArcGIS/rest/services/transit_priority_areas_2021/FeatureServer); [MTC Res. 4739 referencing PBA 2050+](https://sta.ca.gov/wp-content/uploads/2026/05/Transit-Priority-Policy-for-Roadways-MTC-Resolution-4739.pdf)

### Inferences
- No free tool combines Opportunity Map category, TCAC amenity distances, current SF zoning (FZP / SB 79 status) and public ownership for a single SF parcel. That gap is what the proposed tool would fill.

### Gaps
- Not verified this pass: UrbanFootprint, Regrid, Gridics and Zoneomics pricing, SF coverage and users.
- I could not confirm a 2024/2025 or PBA 2050+ vintage TPA or PDA layer on opendata.mtc.ca.gov.
- I found no evidence of a Terner Center interactive site-selection tool.

## 3. Open datasets for amenity proximity, parcels and zoning in SF

### Takeaway
DataSF provides nearly everything at parcel and point level under PDDL / CC0 / public-domain licences: parcels, zoning, height, land use, the assessor roll, Muni stops, schools (from CDE), Rec & Park properties, city facilities, registered businesses, and the development and affordable pipelines. The weak spots are grocery identification, since the NAICS description columns were dropped in July 2026, plus libraries and health facilities as standalone layers. SFMTA GTFS needs a licence click-through; regional GTFS (BART, Caltrain) comes from 511 with a free token.

### Cited Findings (DataSF, verified via `https://data.sf.gov/api/views/<id>.json` on 2026-11-04)
"Freq" is the publisher's stated "Data change / Publishing frequency". "Rows updated" is the API `rowsUpdatedAt` date.

| Dataset | ID | Publisher | Geometry | Freq | Rows updated | Licence |
|---|---|---|---|---|---|---|
| Parcels – Active and Retired | [acdm-wktn](https://data.sf.gov/api/views/acdm-wktn.json) | DataSF / Technology | multipolygon | Daily | 2026-11-04 | PDDL |
| Parcels with overlay attributes | [9grn-xjpx](https://data.sf.gov/api/views/9grn-xjpx.json) | GSA / City Administrator | point | As needed / Daily | 2026-11-04 | PDDL |
| Zoning Map – Zoning Districts | [3i4a-hu95](https://data.sf.gov/api/views/3i4a-hu95.json) | Planning | multipolygon | Quarterly | 2026-11-04 | PDDL |
| Zoning Map – Height and Bulk Districts | [h9wh-cg3m](https://data.sf.gov/api/views/h9wh-cg3m.json) | Planning | multipolygon | Quarterly | 2026-11-04 | Public Domain (US Gov) |
| Zoning Map – Special Use Districts | [5yf5-ms5f](https://data.sf.gov/api/views/5yf5-ms5f.json) | Planning | (not checked) | — | catalog modified 2026-11-04 | Public Domain (US Gov) |
| San Francisco Land Use (existing use per parcel) | [c5ge-t6pj](https://data.sf.gov/api/views/c5ge-t6pj.json) | Planning | multipolygon | As needed / Annually | 2026-08-17 | CC0 |
| Assessor Historical Secured Property Tax Rolls | [wv5m-vpq2](https://data.sf.gov/api/views/wv5m-vpq2.json) | Assessor-Recorder | point | Annually | 2026-06-26 | PDDL |
| SF Development Pipeline (as of 2026 Q2) | [6jgi-cpb4](https://data.sf.gov/api/views/6jgi-cpb4.json) | Planning | point | Quarterly | 2026-08-28 | CC0 |
| MOHCD Affordable Housing Pipeline | [aaxw-2cb8](https://data.sf.gov/api/views/aaxw-2cb8.json) | MOHCD / Mayor | location | Quarterly | 2026-05-21 | PDDL |
| MOHCD Affordable Housing Portfolio | [pyxv-n29e](https://data.sf.gov/api/views/pyxv-n29e.json) | MOHCD | (not checked) | — | catalog modified 2026-05-21 | (not stated in catalog) |
| Housing Production 2005–present | [xdht-4php](https://data.sf.gov/api/views/xdht-4php.json) | Planning | none | As needed | 2026-10-30 | Public Domain (US Gov) |
| Housing Sustainability Districts | [7way-43xh](https://data.sf.gov/api/views/7way-43xh.json) | Planning | multipolygon | As needed | 2026-03-03 | Public Domain (US Gov) |
| AHBP eligible parcels (legacy Affordable Housing Bonus Program) | [fizh-zaxt](https://data.sf.gov/api/views/fizh-zaxt.json) | Planning | multipolygon | As needed | **2015-09-10 (stale)** | PDDL |
| City Facilities (city-owned/leased) | [nc68-ngbr](https://data.sf.gov/api/views/nc68-ngbr.json) | GSA / City Administrator | point | As needed / Daily | 2026-11-04 | PDDL |
| Muni Stops | [i28k-bkz6](https://data.sf.gov/api/views/i28k-bkz6.json) | SFMTA | point | Updated each service "Sign-up" (3–6 months) | 2026-04-11 | PDDL |
| Muni Simple Routes | [9exe-acju](https://data.sf.gov/api/views/9exe-acju.json) | SFMTA | multiline | As needed | 2026-04-11 | PDDL |
| SFMTA GTFS (Production) | [dni7-qpv3](https://data.sf.gov/api/views/dni7-qpv3.json) | SFMTA | file (GTFS zip) | Quarterly | blob row date 2022-06-01; catalog modified 2026-08-28 | Catalog says CC0, but use needs agreement to the SFMTA Transit Data License Agreement |
| Schools (from CDE, open schools as of Feb 2026) | [7e7j-59qk](https://data.sf.gov/api/views/7e7j-59qk.json) | SFUSD | point | As needed | 2026-02-06 | PDDL |
| SFUSD School Attendance Areas (2024–2025) | [e6tr-sxwg](https://data.sf.gov/api/views/e6tr-sxwg.json) | SFUSD | (not checked) | — | catalog modified 2024-08-26 | (not stated) |
| Recreation and Parks Properties | [gtr9-ntp6](https://data.sf.gov/api/views/gtr9-ntp6.json) | Rec & Park | multipolygon | Weekly | 2026-11-04 | PDDL |
| Recreation and Parks Facilities | [ib5c-xgwu](https://data.sf.gov/api/views/ib5c-xgwu.json) | Rec & Park | multipolygon | Daily | 2026-11-04 | PDDL |
| Registered Business Locations | [g8m3-pdis](https://data.sf.gov/api/views/g8m3-pdis.json) | Treasurer-Tax Collector | point | Daily | 2026-11-04 | PDDL |
| Mental Health & SUD Provider Directory – Site List | [p6m6-pkpk](https://data.sf.gov/api/views/p6m6-pkpk.json) | Public Health | **none** (addresses only) | As needed / Daily | 2026-11-04 | PDDL |
| Census 2020 Tracts for SF | [tmph-tgz9](https://data.sf.gov/api/views/tmph-tgz9.json) | GSA | multipolygon | Not updated (historical) | 2022-03-04 | PDDL |
| Equity Strategy Neighborhoods (Muni) | [f8bh-m8ez](https://data.sf.gov/api/views/f8bh-m8ez.json) | SFMTA | multipolygon | Bi-annually | 2024-07-30 | PDDL |

Dataset-specific caveats, from the DataSF metadata:
- **Registered Business Locations:** on **2026-07-06**, after SF Prop M, the NAICS column became "self-reported, up to 6-digit NAICS" only, and the NAICS description columns were deprecated. Current columns include `self_reported_naics_code`, `location_start_date`/`location_end_date` and `administratively_closed`. Locations are marked "Administratively Closed" after 3 years without filings. — [g8m3-pdis metadata](https://data.sf.gov/api/views/g8m3-pdis.json)
- **Assessor roll:** the description says it covers "July 1, 2007 to June 30, 2024", but the API returns `max(closed_roll_year) = 2025`, so the description lags the data. Columns include `use_code`, `number_of_units`, `zoning_code`, `lot_area`, `assessed_land_value`, `assessed_improvement_value` and `exemption_code`. It is updated annually after roll certification (around August). — [wv5m-vpq2 metadata](https://data.sf.gov/api/views/wv5m-vpq2.json); [SoQL max query](https://data.sf.gov/resource/wv5m-vpq2.json?$select=max(closed_roll_year))
- **Schools:** downloaded from CDE; includes only schools open as of February 2026. Columns include `cds_code`, `public_yesno`, `charter_yesno`, `low_grade` and `high_grade`. — [7e7j-59qk metadata](https://data.sf.gov/api/views/7e7j-59qk.json)
- **City Facilities:** covers city-owned and leased facilities from the Facility System of Record, with `block_lot`, `owned_leased`, `department_name` and `land_id`. It excludes SFHA, OCII and City College. — [nc68-ngbr metadata](https://data.sf.gov/api/views/nc68-ngbr.json)

### Cited Findings (regional / state / federal)
- **511 SF Bay Open Data (MTC):** free with a token. The regional consolidated GTFS uses `operator_id=RG`; historic monthly feeds are available, plus regional GTFS-Realtime. Rate limit is 60 requests per 3,600 s per token. BART and Caltrain feeds are listed via the `gtfsoperators` endpoint (their operator IDs were not confirmed here). — [511 Transit Open Data](https://511.org/open-data/transit); [token request](https://511.org/open-data/token)
- **USDA ERS Food Access Research Atlas:** the latest indicator year is **2019**, released April 2021 and replacing 2015 data. In 2026 ERS added a SNAP-Authorized Retailer Access Map and a Large Retailer Access Map, presented in a 2026-08-20 webinar. Downloads are XLSX/CSV at tract level. — [ERS update history](https://www.ers.usda.gov/data-products/food-access-research-atlas/update-and-revision-history); [ERS 2026 webinar](https://www.ers.usda.gov/newsroom/events/2026/08/20/data-training-webinar-updated-food-access-research-atlas); [data.gov entry](https://catalog.data.gov/dataset/food-access-research-atlas)
- **TCAC/HCD Opportunity Map shapefiles:** [2027 draft](https://treasurer.ca.gov/sites/default/files/ctcac/om-shapefile.zip); [2026 adopted](https://treasurer.ca.gov/sites/default/files/2025-11/shapefile.zip). Updated annually (December).

### Inferences
- **Grocery:** with NAICS descriptions removed, filter `g8m3-pdis` on self-reported NAICS 445110 (supermarkets) and 445131 (convenience retailers) for active locations. TCAC uses a square-footage threshold (25,000 / 5,000 sq ft) that no open dataset records. Options include joining to the assessor `property_area`, to OSM `shop=supermarket`, or to USDA SNAP retailer locations (not verified here). Self-reported codes will include misclassifications.
- **Libraries / clinics:** no standalone SFPL branch or licensed-health-facility layer turned up in DataSF. `nc68-ngbr` (City Facilities, filter `department_name`) may hold SFPL branches; I did not check this. For hospitals and clinics, the state HCAI licensed-facility list is the likely source (not verified).
- **Vacant / underutilized parcels:** no "vacant parcels" dataset exists on DataSF. Derive it from `c5ge-t6pj` (land-use category, e.g. vacant), the assessor roll (improvement-to-land value ratio, `number_of_units`, built FAR = building area ÷ lot area), and zoning or height capacity. Exclude pipeline parcels (`6jgi-cpb4`, `aaxw-2cb8`).
- **Public land:** combine `nc68-ngbr` (owned), Rec & Park properties (to exclude), and the assessor `exemption_code` (government-owned exemptions) to flag public ownership candidates.

### Gaps
- Not verified: DataSF IDs for SF Public Library locations and for health or medical facilities (none found in catalog title search); the CDE Public Schools directory URL itself (DataSF says the data came from cde.ca.gov); HCAI facility data; BART and Caltrain standalone GTFS URLs.
- Priority Equity Geographies, Family Zoning Plan height/density layers and SB 79 station-area layers were not found as DataSF datasets. The FZP is published as an ArcGIS Experience and PDFs only. A REST endpoint behind the ArcGIS Experience probably exists but was not checked.
- Licences for `pyxv-n29e` and `e6tr-sxwg` are blank in the catalog.

## 4. Methods: measuring walkability and transit access, and pitfalls

### Takeaway
California law and TCAC use fixed distance bands (1/4, 1/3, 1/2 and 1 mi) from "major transit stops" or frequent stops. A defensible tool should compute **network walking distance** (e.g. on OSM pedestrian graphs) from the parcel, report both network and straight-line distance, and derive frequency from GTFS headways for the actual peak window, not from stop presence alone.

### Cited Findings
- TCAC transit points depend on stop type, distance (1/3 or 1/2 mi) and **peak frequency of at least every 30 minutes** on weekdays, with a density condition (more than 25 du/ac) for the top tier. — [CTCAC regs mirror](https://gocodebook.com/library/us/ca/ca-ccr4-ctcac-regulations-adopted-2025-12-10/1.-transit-amenities)
- TCAC uses "as measured by a walkable path" for at least one distance rule (the recreation-area waiver), which shows walking-path measurement is used in the regulations. — [same](https://gocodebook.com/library/us/ca/ca-ccr4-ctcac-regulations-adopted-2025-12-10/1.-transit-amenities)
- SB 79 tiers are defined by transit mode: BART and Caltrain are highest; Muni light rail and BRT are intermediate. Distance bands run up to 1/2 mi. — [SF Planning SB 79 factsheet](https://sfplanning.org/sites/default/files/documents/citywide/fzp-sb-79-compliance.pdf); [MTC](https://mtc.ca.gov/node/4042149)
- Muni stop locations change with each service "Sign-up" (every 3–6 months), so stop-based proximity must be versioned. — [i28k-bkz6 metadata](https://data.sf.gov/api/views/i28k-bkz6.json)
- The Opportunity Map is tract-level, with block groups in rural areas only. Every parcel in a tract inherits the same category. — [2027 methodology](https://treasurer.ca.gov/sites/default/files/ctcac/2027_OM_Methodology_102226.pdf)

### Inferences
- **Pitfalls:**
  - Straight-line buffers overstate access in SF's hilly, barrier-cut terrain (freeways, Twin Peaks, Presidio, Bayview rail).
  - Distance from parcel centroid and from parcel boundary give different results; TCAC wording ("site within") suggests the boundary, but this was not verified.
  - Stop presence is not service: compute headways from GTFS `stop_times` for a defined peak window.
  - Grocery "existence" is not TCAC grocery: there is a size threshold.
  - School proximity is not school eligibility: the attendance-area condition applies.
  - Tract-level categories hide within-tract variation.
  - Policy layers are moving targets (yearly opportunity maps; SB 79 exemptions sunset in 2032; FZP litigation).

### Gaps
- **Statutory definitions not retrieved:** leginfo returned HTTP 403, so the text of PRC §21064.3 ("major transit stop") and §21155 ("high-quality transit corridor", 15-minute peak headway) was not verified. From general knowledge, a major transit stop is a rail or BRT station, a ferry terminal served by bus or rail, or the intersection of two or more bus routes with peak-period headways of 15 minutes or less. Verify this at [leginfo PRC 21064.3](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PRC&sectionNum=21064.3) before relying on it.
- SB 79 statutory tier definitions (Tier 1 / Tier 2 heights and densities by distance) were taken only from the SF factsheet's summary, not from the statute text.
- No peer-reviewed comparison of network vs Euclidean distance error for SF was retrieved.
