# Climate and Housing in San Francisco and the Bay Area: Tools, Datasets and Rules (as of November 2026)

Research date: 2026-11-03. About 20 search and fetch calls. Many findings come from search-result summaries rather than full-page fetches; those are marked "(search summary)" and should be re-checked before anyone quotes them. Items dated before 2025 are marked **[possibly outdated]**.

## Sea-level rise and flooding: datasets, formats, licenses, update dates

### Takeaway
SF has open, machine-readable sea-level-rise (SLR) and storm-flood layers on DataSF, released under a public-domain license (PDDL), and BCDC's ART Flood Explorer offers regional GIS downloads. The layers are old: SLR modeling rests on 2010 ground conditions, and SFPUC republishes its storm-flood map each year. An assistant can cite them, but it must carry each layer's disclaimer with it: planning-level, no adaptation assumed, and coverage limits (SFPUC stormwater only; ART Bay side only).

### Cited Findings
- **108" Inundation Vulnerability Zone Line (SLR + 100-yr flood)** on DataSF, ID `92e4-7ptg`. Formats: JSON, XML, CSV, KML, KMZ, GeoJSON. License: Open Data Commons PDDL 1.0. Created 2017-03-20, last modified 2024-06-26. — [data.gov record](https://catalog.data.gov/dataset/108-inundation-vulnerability-zone-line-sea-level-rise-100yr-flood-event)
- The layer shows the most extreme possible SLR combined with a king tide and a 100-year storm. It is a "planning level tool" built on 2010 ground conditions and a 1 m DEM from 2010–2011 LiDAR. It excludes piers and does not show exact flood location or depth. **[possibly outdated: the base data is from 2010]** — [data.gov record](https://catalog.data.gov/dataset/108-inundation-vulnerability-zone-line-sea-level-rise-100yr-flood-event)
- The 108-inch Sea Level Rise Vulnerability Zone is 66" of SLR plus 42" of tidal and storm surge. It comes from SF Planning's Sea Level Rise Vulnerability and Consequences Assessment (SLRVCA, 2020). **[possibly outdated]** — [SLRVCA report](https://default.sfplanning.org/plans-and-programs/planning-for-the-city/sea-level-rise/SLRVCA_Report_00.pdf); [SLRVCA executive summary](https://sfplanning.s3.amazonaws.com/default/files/plans-and-programs/planning-for-the-city/sea-level-rise/SLRVCA_Report_Executive_Summary.pdf); [SLRVC handout, Feb 2020](https://default.sfplanning.org/plans-and-programs/planning-for-the-city/sea-level-rise/SLRVC_Handout-020720.pdf)
- A related DataSF layer, "100-year storm + 66 inches Sea Level Rise", exists (ID reported as `6ann-usi8`, from a search summary, not verified). — [data.gov record](https://catalog.data.gov/dataset/100-year-storm-66-inches-sea-level-rise)
- The SLRVCA contains neighborhood consequence profiles. Mission Bay, the Financial District and Potrero Hill/Central Waterfront are among the vulnerable neighborhoods (search summary). — [SLRVCA executive summary](https://sfplanning.s3.amazonaws.com/default/files/plans-and-programs/planning-for-the-city/sea-level-rise/SLRVCA_Report_Executive_Summary.pdf)
- **SFPUC 100-Year Storm Flood Risk Zone (July 2022)** is on DataSF. SFPUC updates the map at least once a year, on or before July 1, to reflect parcel-review removals, so users should check SFPUC for anything newer than the shapefile. The map covers storm runoff only, not Bay or ocean inundation. **[July 2022 version: possibly outdated; check for a newer annual update]** — [data.gov record](https://catalog.data.gov/dataset/100-year-storm-flood-risk-zone-july-2022); [SFPUC flood maps page](https://sfpuc.org/learning/emergency-preparedness/flood-maps)
- **SFPUC 100-Year Storm Flood Elevations (December 2024)** is a separate dataset of flood-elevation zones tied to the risk zone. — [data.gov record](https://catalog.data.gov/dataset/100-year-storm-flood-elevations-december-2024); [SFPUC news: map updated with elevation data](https://www.sfpuc.gov/about-us/news/we-updated-our-flood-map-include-elevation-data-heres-why)
- SFPUC also publishes FAQs, a disclaimer and a parcel review process, and runs an ArcGIS FeatureServer named `FloodMap`. — [FAQs](https://sfpuc.gov/sites/default/files/documents/SFPUC_100_Year_Flood_Map_FAQs.pdf); [Disclaimer](https://sfpuc.gov/sites/default/files/learning/SFPUC_100_Year_Flood_Map_Disclaimer.pdf); [Parcel review](https://Sfpuc.Org/sites/default/files/learning/100YRFloodRiskMapParcelReviewProcess.pdf); [FeatureServer](https://services.arcgis.com/Zs2aNLFN00jrS4gG/ArcGIS/rest/services/FloodMap/FeatureServer/layers)
- **BCDC ART Bay Shoreline Flood Explorer** covers SLR scenarios from 0" to 108" above MHHW. County maps download as PDF or geodatabase (.gdb) for ten water levels, with flood depth (polygon and raster), overtopping depth and disconnected low-lying areas (search summary). It covers San Francisco Bay only, not SF's Pacific coast west of the Golden Gate. — [ABAG ART Flood Explorer page](https://abag.ca.gov/technical-assistance/art-bay-shoreline-flood-explorer); [data.gov: Flood Explorer](https://catalog.data.gov/dataset/adapting-to-rising-tides-bay-shoreline-flood-explorer); [data.gov: SLR and shoreline analysis maps](https://catalog.data.gov/dataset/adapting-to-rising-tides-bay-area-sea-level-rise-and-shoreline-analysis-maps)
- Caltrans republishes ART layers as ArcGIS REST map and feature services (`CHhqenvi/DEA_BCDC_SLR`) with JSON queries. The metadata warns that the maps reflect the best data available at publication and may not show later infrastructure. — [Caltrans MapServer](https://gisdata.dot.ca.gov/arcgis/rest/services/CHhqenvi/DEA_BCDC_SLR/MapServer); [FeatureServer](https://gisdata.dot.ca.gov/arcgis/rest/services/CHhqenvi/DEA_BCDC_SLR/FeatureServer)
- **Port of SF Waterfront Resilience Program / USACE SF Waterfront Coastal Flood Study.** The Draft Integrated Feasibility Report/EIS (Tentatively Selected Plan) came out in January 2024. It is about a $13.5B coastal flood defense from Aquatic Park to Heron's Head Park, with up to 65% potential federal cost share. A Recommended Plan was expected in 2025 and needs congressional authorization; construction is generally expected from about 2030. — [Port StoryMap](https://storymaps.arcgis.com/stories/1ed3561c936244f2979ad68cda6a681a); [2025 GOBOC presentation](https://media.api.sf.gov/documents/2018SeawallBondGOBOCPresentation_2025_2.pdf); [2025 Seawall Bond GOBOC annual report](https://media.api.sf.gov/documents/2018_Seawall_Bond_GOBOC_Annual_Report_-_2025_3.pdf); [USACE draft report](https://www.swt.usace.army.mil/Portals/41/SFWCFS_DIFR_EIS_Main%20Report_1.pdf); [WRP library](https://sfport.com/wrp/library)
- A regional SFEI "SF Bay Shore Inventory: Mapping for Sea Level Rise" dataset exists. — [SFEI](https://sfei.org/node/6399)

### Inferences
- DataSF layers carry PDDL, so an assistant can redistribute them and cite them by dataset ID. The ART downloads have no license statement I could find, so their reuse terms are unconfirmed.
- Any answer about whether a parcel is in a flood zone has to name which map it used. The SFPUC map is stormwater only, the 108" zone is an SLR-plus-storm envelope, and ART covers the Bay side only. Merging them without saying so would mislead.

### Gaps
- **Our Coast Our Future** (USGS CoSMoS / Point Blue): not researched in this pass, so formats, license and dates are unverified.
- **FEMA flood maps (FIRM/NFHL) for SF**: not verified in this pass. I did not confirm SF's FIRM effective date or whether the 2015-era preliminary map has become effective.
- **ART Community Vulnerability data**: the layer, its indicators and its license were not verified.
- The Recommended Plan status for the Waterfront Coastal Flood Study as of November 2026 is not confirmed.
- No license statement was found for the ART .gdb downloads.

## Heat and other hazards (SFDPH heat vulnerability, Cal-Adapt, CalEnviroScreen, soft-story)

### Takeaway
CalEnviroScreen 5.0 (final July 1, 2026) and Cal-Adapt's Analytics Engine (CMIP6, Fifth Assessment) are current and machine-readable. SFDPH's Heat Vulnerability Index is older. DBI publishes a weekly-updated soft-story dataset on DataSF that ties seismic risk directly to multifamily housing.

### Cited Findings
- **SFDPH Heat Vulnerability Index**: covers all 574 census block groups with 21 variables (health, age, income, language and others). It was funded by the CDC. Socio-economic vulnerability explained the most variance (18.5%). The 2017 framework names Downtown/Civic Center and Chinatown as most vulnerable. **[possibly outdated: original release pre-2017]** — [Adaptation Clearinghouse: heat vulnerability assessment](https://www.adaptationclearinghouse.org/resources/climate-and-health-understanding-the-risk-an-assessment-of-san-francisco-eys-vulnerability-to-extreme-heat-events.html); [SF Climate and Health Adaptation Framework 2017](https://www.adaptationclearinghouse.org/resources/san-francisco-climate-and-health-adaptation-framework-2017.html); [GovTech coverage](https://www.govtech.com/em/disaster/San-Francisco-Health-Heat-Vulnerability-Index.html)
- The SFDPH Climate and Health Program covers extreme heat, flooding, drought, wildfire and air pollution, and links to an interactive heat vulnerability map. The CDC page may itself be dated. — [CDC: SF Climate and Health Program](https://www.cdc.gov/climateandhealth/state-programs/sf.htm)
- **CalEnviroScreen 5.0**: the draft came out 2026-01-28 (first update since 2021), comments closed 2026-04-01, and the final was released 2026-07-01 alongside a preliminary Disadvantaged Communities designation. A Spanish-language OEHHA page says CalEPA published the updated designation in September 2026 (single source). — [OEHHA press release](https://oehha.ca.gov/calenviroscreen/press-release/press-release-calenviroscreen/california-releases-calenviroscreen-50-identify-and-prioritize-pollution-burdened-communities); [Technical report (draft, Jan 2026)](https://oehha.ca.gov/sites/default/files/media/2026-01/calenviroscreen50techreportd12226.pdf); [Response to comments (June 2026)](https://oehha.ca.gov/sites/default/files/media/2026-06/calenviroscreen50responsetocommentsf2026.pdf); [OEHHA CES 5.0 page (es)](https://oehha.ca.gov/calenviroscreen/report/calenviroscreen-50-es); [data.gov: CES 5.0](https://catalog.data.gov/dataset/calenviroscreen-5-0-8e575)
- **Cal-Adapt Analytics Engine**: CMIP6 downscaled data at about 3 km and sub-daily resolution, for California's Fifth Climate Change Assessment. The data sits on the AWS Registry of Open Data with license "Varies, see dataset specific metadata". An intake-ESM catalog allows access without a login; JupyterHub needs a login. The `climakitae` Python toolkit is BSD-3-Clause. Cal-Adapt's Climate Explorer mainly reflects the Fourth Assessment. — [AWS Open Data registry](https://registry.opendata.aws/caladapt-coproduced-climate-data/); [Access methods](https://analytics.cal-adapt.org/data-tools/access-methods.html); [climakitae on PyPI](https://pypi.org/project/climakitae); [Cal-Adapt](https://cal-adapt.org/)
- **Soft-story seismic**: the DataSF "Soft-Story Properties" dataset is a weekly-updated status feed by compliance tier. The program covers wood-frame buildings with 5+ residential units and 2+ stories over a soft or weak story. A 2014 city analysis counted 4,802 buildings required to retrofit, and DBI reported 98% compliance in its 2018–19 annual report. **[compliance figures possibly outdated]** — [data.gov harvest record](https://catalog-old.data.gov/harvest/object/20766332-8cb3-4264-8661-40a33734ccba); [ESIP Soft Story](https://sfgov.org/esip/soft-story); [2014 analysis](https://sfgov.org/esip/sites/default/files/FileCenter/Documents/12790-SoftStoryAnalysis_Final_10_2014.pdf); [DBI Annual Report 2018–19](https://www.sf.gov/sites/default/files/2022-09/DBI%20Annual%20Report%202018-2019.pdf)

### Inferences
- CES 5.0 and the new DAC designation are the most current, statewide-consistent equity-and-exposure layers. They are likely to drive state funding eligibility for SF housing and retrofit programs.
- The soft-story dataset gives a parcel-level link between seismic risk and rent-controlled multifamily stock, and it is useful for questions about displacement during retrofits.

### Gaps
- I could not confirm whether SFDPH has updated the HVI after its original release, or the current URL and format of the interactive map. The sfclimatehealth.org site was not fetched.
- The license and refresh date of the soft-story DataSF dataset were not confirmed, and there is no 2025–26 compliance count.
- Cal-Adapt API terms of use were not found.
- Wildfire smoke and air-quality layers were not researched.

## Building decarbonization rules affecting housing; legal text and machine-readability

### Takeaway
SF requires all-electric new construction (in effect since June 1, 2021). An All-Electric Major Renovations Ordinance passed the Board on 2025-09-02 and applies to permits from about July 1, 2026. The Climate Action Plan targets phasing out gas in buildings by 2040. The legal text lives in Legistar PDFs and the SF Building and Existing Building Codes; I found no structured, machine-readable code text.

### Cited Findings
- **All-Electric New Construction**: covers new residential and commercial buildings, effective June 1, 2021 **[pre-2025]**. — [SFEnvironment press: CAP release](https://www.sfenvironment.org/press/mayor-london-breed-releases-new-climate-action-plan-make-san-francisco-net-zero-emissions) (search summary); [Earthjustice](https://earthjustice.org/?p=9443)
- **All-Electric Major Renovations Ordinance**: sponsored by Mandelman, it passed unanimously on final reading 2025-09-02 and went to Mayor Lurie. It requires major renovation projects to be all-electric, effective July 2026. Residential applicability is not explicit in the press release. — [SFEnvironment press release](https://www.sfenvironment.org/press/board-supervisors-passes-major-renovations-ordinance-setting-course-all-electric-future)
- The ordinance text is Board File No. 250702 (PDF). Committee amendments added phasing, exemptions (some food-service and factory-industrial uses) and a waiver process (search summary). — [File No. 250702 PDF](https://media.api.sf.gov/documents/File_No._250702_All-Electric.pdf); [Legistar proposal PDF, July 24, 2025](https://sfgov.legistar.com/View.ashx?M=F&ID=14553410&GUID=390C0853-8484-4862-83CC-684A81D34CA6); [SFEnvironment: committee passage](https://www.sfenvironment.org/press/all-electric-major-renovations-ordinance-unanimously-passes-land-use-transportation-committee)
- An industry source says the ordinance applies to permit applications filed on or after July 1, 2026, and was moved to Section 304.5 of the 2025 SF Existing Building Code as of January 2026. This is not confirmed by an official source. — [BOMA SF](https://bomasf.org/resources/building-codes-regulatory-compliance); related [Legistar File 250800](https://sfgov.legistar.com/LegislationDetail.aspx?From=RSS&ID=7497468&GUID=E2E82DCE-AC47-4D51-A07C-624951AEE230)
- A critical view argues the ordinance will raise housing costs. — [Reason, 2025-08-12](https://reason.com/2025/08/12/san-franciscos-all-electric-ordinance-will-make-housing-more-expensive/)
- **Climate Action Plan 2021**: net zero by 2040, with a goal to phase out natural gas in all buildings by 2040 (search summary). **[2021 plan; possibly outdated]** — [SFEnvironment press](https://www.sfenvironment.org/press/mayor-london-breed-releases-new-climate-action-plan-make-san-francisco-net-zero-emissions); [SFCTA CAP presentation, Jan 2022](https://www.sfcta.org/sites/default/files/2022-01/Item%2010%20Climate%20Action%20Plan%20PRESENTATION.pdf)
- A 2021 Budget and Legislative Analyst memo estimated the citywide cost of converting residential gas appliances at about $3.2B–$5.9B. The range comes from a partial snippet, so verify it before use. **[2021]** — [BLA Residential Decarbonization memo](https://sfbos.org/sites/default/files/BLA.ResidentialDecarbonization.042221.pdf)
- Existing commercial buildings decarbonization was discussed in 2021. — [Buchalter client alert, Nov 2021](https://www.buchalter.com/insights/keeping-an-eye-on-san-franciscos-plans-to-decarbonize-existing-commercial-buildings/) **[possibly outdated]**
- **SF Environment tools**: the electrification hub, renter checklist factsheets and a $14M federal grant for building electrification. — [sfenvironment.org/electrify](https://sfenvironment.org/electrify); [sf.gov: $14M federal grant](https://www.sf.gov/news/san-francisco-awarded-14-million-federal-grant-advance-building-electrification-projects)
- **BayREN**: Home+ offers rebates and a home energy advisor; the Multifamily program offers free technical assistance and $750/unit rebates for electrification and efficiency (search summary; rebate amounts may have changed). — [BayREN](https://tl.bayren.org/node/501)

### Inferences
- The legal sources for an assistant are Legistar ordinance PDFs and the SF Building/Existing Building Code. Neither is structured data, so citing by section number needs a PDF or HTML parse, and the text must be re-checked after each code cycle.
- With the rules for new construction and major renovations in place, the remaining policy gap is ordinary existing residential buildings that are not undergoing major renovation.

### Gaps
- I did not verify the **Existing Commercial Buildings Energy Performance Ordinance** (Environment Code Ch. 20): its current requirements, benchmarking dataset or any 2025–26 amendments.
- Any SF residential **Building Performance Standard** proposal as of 2026 was not found or verified.
- The **Title 24 (2025 Energy Code) and CALGreen** cycle, effective dates and machine-readable text were not researched in this pass.
- No official confirmation was found of the Major Renovations ordinance's ordinance number, signature date or codified section.
- I did not confirm whether the SF codes are on American Legal Publishing in machine-readable form, or under what license.

## Climate risk products (First Street, ClimateCheck, UrbanFootprint, Jupiter, Esri, state tools): who pays, SF agency use

### Takeaway
I verified only First Street's corporate status: MSCI announced its acquisition on 2026-06-24, for $120M in cash at close. I found no evidence that any SF agency licenses First Street, ClimateCheck, UrbanFootprint or Jupiter.

### Cited Findings
- MSCI announced it would acquire First Street on 2026-06-24 for $120M in cash at closing plus earn-outs, with closing expected in Q3 2026. First Street models flood, wildfire, wind and heat risk at property level; its customers are asset owners and managers, real estate investors, banks and corporates. — [ESG Today](https://www.esgtoday.com/msci-acquires-climate-risk-data-provider-first-street/); [Nasdaq](https://www.nasdaq.com/articles/msci-buys-first-street-expand-physical-climate-risk-data)
- First Street's Risk Factor data has been integrated into LightBox products. — [AEC Cafe](https://aeccafe.com/nbc/articles/1/1978734/LightBox-First-Street-Foundation-Expand-Partnership-Creating-Unique-Ability-Price-Evaluate-Climate-Risk)
- A search for an SF government contract with First Street returned nothing. — (negative result; no source)

### Inferences
- Commercial property-level scores are mostly sold to finance and real estate buyers. Their license terms likely block redistribution in an open assistant; this is unverified.

### Gaps
- Pricing, licensing and SF agency use of **ClimateCheck, UrbanFootprint and Jupiter Intelligence** were not researched or verified.
- I could not confirm whether First Street's Risk Factor remains free to consumers after the MSCI deal, or whether the deal has closed.
- SF city Esri tools (e.g. SF Planning or Port ArcGIS hubs) were not inventoried beyond the Port StoryMap and SFPUC FeatureServer cited above.
- California's Fifth Climate Assessment regional reports (Bay Area) were not reviewed.

## Housing Element 2022–2031 and environmental review: climate/SLR and housing sites; is there a combined tool?

### Takeaway
SF's 2022 Housing Element rezoning program excludes sites in SLR-sensitive areas, and its EIR was certified November 17, 2022. I found no public SF tool that overlays housing-element sites or pipeline on climate-risk layers. Doing that overlay is an open gap an assistant could fill with DataSF layers.

### Cited Findings
- Appendix B (Sites Inventory and Rezoning Program) says the rezoning program does not include sites in environmentally sensitive areas susceptible to SLR, or in zones that do not already allow residential use (search summary of the PDF). — [Housing Element Appendix B](https://sfplanning.org/sites/default/files/documents/citywide/housing-choice/housingchoice_element_appendixB_sites_inventory.pdf)
- Housing Element 2022 Update EIR: Case No. 2019-016230ENV, SCH No. 2021060358. The Draft EIR was published 2022-04-20 and was certified 2022-11-17. Significant and unavoidable impacts were found for cultural resources, transportation, noise, air quality, wind, shadow and wastewater (search summary). The Notice of Determination gives final approval as 2023-01-31. — [CEQAnet project](https://ceqanet.lci.ca.gov/Project/2021060358); [CEQAnet doc](https://ceqanet.lci.ca.gov/2021060358/2); [Planning CEQA quick reference guide](https://sfplanning.org/sites/default/files/documents/environmental/HousingElement2022_CEQA_quick_ref_guide.pdf)
- The Housing Element plans for 82,000 units by 2031. — [SF Planning Annual Report FY2021-22](https://issuu.com/sfplanningdept/docs/sfplanning_annual_report_fy2021-22)
- The 2004/2009 Housing Element EIR contained an "Inundation Due to Rising Sea Levels" section. **[outdated; historical]** — [2007.1275E DEIR](https://sfmea.sfplanning.org/2007.1275E_DEIR.pdf)
- Shoreline mega-projects such as Candlestick were reported in 2016 as regraded so housing parcels stay dry under 5.5 ft of SLR. **[2016; possibly outdated]** — [SF Chronicle 2016](https://projects.sfchronicle.com/2016/sea-level-rise/part3/)

### Inferences
- Because the rezoning excludes SLR-exposed sites, the main climate exposure among new housing likely sits in shoreline development agreements (Mission Rock, Pier 70, Candlestick/Hunters Point, Treasure Island) rather than rezoned sites. This is inferred and not verified.
- An overlay of Housing Element sites (or the DataSF housing pipeline) with the 108" zone, the SFPUC flood zone and CES 5.0 would be new, citable and reproducible from open data.

### Gaps
- I did not read the full text of the EIR's hazards, hydrology or SLR chapter.
- The status of SF's Safety Element / Environmental Justice Framework updates as of 2026, and whether they map housing against hazards, was not verified.
- I found no evidence of an internal city tool that overlays housing plans and climate risk. Absence from public search does not prove no internal tool exists.
- A machine-readable Housing Element sites inventory on DataSF was not confirmed in this pass.

## Equity/climate tools combining housing burden and climate exposure

### Takeaway
SF's Climate Equity Hub is a retrofit and rebate program, not a data tool, and its General Fund support was reported cut. The Urban Displacement Project's climate work studies displacement driven by climate investment; I found no SLR-displacement map from it. Statewide, CES 5.0 is the main equity-exposure layer.

### Cited Findings
- **SF Climate Equity Hub**: launched April 2024 with SF Environment and community organizations. It offers no-cost residential energy upgrades and up to $10,785 in heat pump water heater rebates for income-qualified residents. **[2024]** — [SFEnvironment press, 2024-10-31](https://www.sfenvironment.org/press/san-franciscos-new-climate-equity-hub-delivers)
- It received $370,878 from the General Fund in FY2024-25, and the next budget was reported to provide none. — [SF Public Press](https://www.sfpublicpress.org/mayors-recommended-budget-sparks-debate-over-s-f-climate-priorities/)
- **Urban Displacement Project / UC Berkeley**: research funded by the state's Climate Change Research program on whether climate investments raise land values and rents (investment-related displacement), with tools for state agencies. — [SGC findings](https://sgc.ca.gov/grant-programs/ccr/findings/investment_related_displacement/); [Berkeley Center for Community Innovation](https://communityinnovation.berkeley.edu/blog/how-prevent-gentrification-and-displacement-fight-against-climate-change)
- The Urban Displacement Bay Area map is a four-stage gentrification and displacement typology; coverage found used older data. **[possibly outdated]** — [Harvard Data-Smart](https://datasmart.hks.harvard.edu/solutions/urban-displacement-map)
- BARHII partners with BCDC on ART on anti-displacement in SLR adaptation (search summary). — [Berkeley CCI](https://communityinnovation.berkeley.edu/blog/how-prevent-gentrification-and-displacement-fight-against-climate-change)
- A statewide "California Climate and Health Equity Hub" (CBE) exists for community data. Its scope was not verified. — [CBE](https://www.cbecal.org/news/post/california-climate-and-health-equity-hub-community-data-and-action-for-regional-resilience/)

### Inferences
- No single public SF tool joins housing cost burden (ACS/CHAS), displacement typology and climate exposure at tract or parcel level. An assistant could build that join from CES 5.0, the DataSF flood/SLR layers and Urban Displacement typologies, subject to each source's license.

### Gaps
- The Climate Equity Hub's status in FY2025-26 and FY2026-27 is unconfirmed.
- Whether the Urban Displacement Project has released a climate-exposure overlay or updated typology data in 2025–26 is unconfirmed.
- Licenses for the Urban Displacement data and the ART Community Vulnerability data were not checked.
- Whether SF policy makers use any of these tools (Board of Supervisors, Planning Commission, MOHCD) is unverified. I found no direct evidence of use.
