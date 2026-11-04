# Landscape of tools for San Francisco housing policy and housing data (as of November 2026)

Method note: about 28 web searches and fetches on 2026-11-03. Most findings come from search-result summaries. Pages fetched in full are marked [fetched]. Anything dated before 2025, or with no date, is marked **(possibly outdated)**. Climate-risk coverage: none of the tools found below advertise climate-risk layers in the sources checked, except where noted. This is a gap, not a confirmed absence.

## 1. AI assistants or chatbots over municipal codes and housing law covering SF

### Takeaway
No public AI assistant answers questions over the San Francisco codes (Planning Code, Administrative Code Ch. 37 Rent Ordinance) with citations. The official host (American Legal Publishing) and its competitors (Municode/CivicPlus, General Code) offer only keyword or Boolean search. The only confirmed AI work on SF's code is Stanford RegLab's STARA, an internal tool for the City Attorney's office aimed at cutting reporting requirements; the public can't use it. Enterprise legal AI (CoCounsel, Lexis+ AI) is paid and aimed at lawyers, and its depth of municipal-code coverage is unverified.

### Cited Findings
**American Legal Publishing (AmLegal), the official host of the SF codes**
- The SF Municipal Codes are hosted on AmLegal's Code Library, e.g., the Public Works and Business codes — [AmLegal SF Public Works](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_publicworks/0-0-0-48516); [AmLegal SF Business](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_business/0-0-0-321)
- Free access to view and search more than 2,000 municipal codes. Search is by keyword, can be narrowed by code part, and can run across all codes in a state — [AmLegal tutorials](https://amlegal.com/all-tutorials); [Univ. at Buffalo library guide](https://research.lib.buffalo.edu/american-legal-pub-code-library)
- No AmLegal AI search feature was found in searches run on 2026-11-03. The publisher's support staff cannot give legal interpretations — [Univ. at Buffalo guide](https://research.lib.buffalo.edu/american-legal-pub-code-library)
- Category: code publisher and host. Users: everyone. Price: free to read. Climate: no.

**Municode (CivicPlus)**
- CivicPlus acquired Municode in 2021, and its codification products are now part of the CivicPlus platform — [CivicPlus via search](https://civicplus.com/?p=21872)
- Search uses ElasticSearch 5.5 with Boolean +/- operators and stemming. This is not AI — [CivicPlus help: Advanced Search](https://www.civicplus.help/codification/docs/advanced-search-options)
- The closest AI product is CivicPlus's partnership with CodeComply.Ai for automated building **plan-review** compliance checks (reported around March 2026). It is not a code Q&A tool — [Pulse.bot](https://www.pulse.bot/saas/news/civicplus-brings-ai-to-building-plan-review-with-codecomplyai-0827e416-7f6c-4623-906c-2ac6bb5c12e0/)
- Municode does not host SF's codes; SF uses AmLegal (see above).

**General Code (eCode360)**
- Offers keyword, phrase and chapter-type search, a Multicode search across several codes at once, and an eCode360 API. No AI assistant was found. General Code does not provide advice or interpretation of codes — [General Code online code portal](https://generalcode.com/online-code/); [eCode360 help](https://ecode360.com/help/SA0111/about)
- Does not host SF's codes.

**Zoneomics code mirror**
- Zoneomics republishes SF code chapters on its own site, e.g., /code/san-francisco-CA/chapter_4 — [Zoneomics SF code](https://www.zoneomics.com/code/san-francisco-CA/chapter_4). I did not verify which SF code it mirrors or how current the mirror is.

**Stanford RegLab STARA (Statutory Research Assistant), used with the SF City Attorney** [fetched]
- An AI system that segments legal codes using headings, cross-references and definitions, classifies provisions with LLMs, and reports on the results. RegLab claims it makes frontier LLMs up to 3x more accurate on complex statutory tasks than a general-purpose AI system. Brief dated 2025-06-18 — [Stanford HAI policy brief](https://hai.stanford.edu/policy/cleaning-up-policy-sludge-an-ai-statutory-research-system)
- Used with the SF City Attorney's Office to identify every legislatively mandated reporting requirement. This led to a proposed ordinance deleting or consolidating more than a third of them. The page does not say the tool is public — [Stanford HAI](https://hai.stanford.edu/policy/cleaning-up-policy-sludge-an-ai-statutory-research-system)
- Reported counts conflict: Daily Journal says 174 obsolete reports; another source says 140 redundant requirements — [Daily Journal](https://dailyjournal.com/articles/385997); [SF Examiner](https://www.sfexaminer.com/news/the-city/sf-city-attorney-turns-to-ai-to-cut-down-on-policy-sludge/article_56f86a1c-84df-4610-b50d-e2a7accb7667.html)
- SF Municipal Code plus Board of Supervisors resolutions total about 16 million words — [Stanford HAI](https://hai.stanford.edu/policy/cleaning-up-policy-sludge-an-ai-statutory-research-system)
- The resulting 362-page code-streamlining ordinance (sponsor: Board President Rafael Mandelman) passed 7-4 on 2026-07-14. Supervisor Myrna Melgar said she used Anthropic's Claude to understand the changes — [Mission Local, 2026-07](https://missionlocal.org/2026/07/sf-city-code-streamlining-mandelman/) [fetched]
- No housing-specific STARA use is described — [Stanford HAI](https://hai.stanford.edu/policy/cleaning-up-policy-sludge-an-ai-statutory-research-system)
- Category: research and government-internal AI. Users: City Attorney staff. Price: not public / not sold.

**Enterprise legal AI**
- Thomson Reuters CoCounsel markets itself to city and county attorneys. It can draft first-pass ordinances and resolutions and compare existing ordinances across jurisdictions. The page states no municipal coverage count — [Thomson Reuters CoCounsel for city attorneys](https://legal.thomsonreuters.com/en/legal/city-attorneys)
- Lexis+ AI: a third-party comparison claims LexisNexis carries municipal codes from every state. This is unverified from a primary source. LexisNexis has a coverage-by-state support page — [LexisNexis support](https://support.lexisnexis.com/app/answers/answer_view/a_id/1102110/loc/en_US)
- One reviewer found modern ordinances missing from Lexis and had to locate them by web search instead (single anecdote) — [cssis.classcaster.net](https://cssis.classcaster.net/?p=4607)
- Codes on Lexis+/Westlaw Edge require a current subscription — [Gonzaga Law library guide](https://libguides.law.gonzaga.edu/municipal/publishers)
- Third-party AI connectors to legal code (e.g., Syfert's MCP "plug your AI into a law library") exist. Their SF coverage is unverified — [Syfert MCP](https://syfert.com/mcp/)

**SF Rent Ordinance (Admin. Code Ch. 37) chatbots**
- No AI chatbot over Chapter 37 was found. The only AI-related item found in Chapter 37 is Section 37.10C, effective 2024-10-14, which bans algorithmic rent-setting devices. Penalties go up to $1,000 per violation — [SF Rent Board info page](https://www.sf.gov/information/algorithmic-devices-set-rent-are-prohibited-san-francisco)
- Note: tenant legal-aid chatbots are out of scope (another researcher covers them).

### Inferences
- An AI assistant with citations over SF Planning Code and Ch. 37 that links to the AmLegal sections would fill an empty niche for residents and small developers. Paid legal AI serves lawyers, and STARA serves the City Attorney internally.
- STARA shows that citation-grounded LLM work over the SF code is feasible. It is also a possible partner or benchmark. Its segmentation approach (headings, cross-references, definitions) is relevant prior art.

### Gaps
- No primary source confirms or rules out an AmLegal AI search feature as of Nov 2026. Searches found nothing, which is not proof it doesn't exist.
- Harvey, Westlaw AI and Lexis+ AI depth of SF municipal-code coverage: not verified.
- I did not verify whether DBI or SF Planning run any public chatbot. A Mission Local item mentioned a planned city chatbot for RV parking permits, but I did not fetch it — [Mission Local](https://missionlocal.org/?p=789612)

## 2. Zoning, parcel and development tools with SF coverage

### Takeaway
SF Planning's free Property Information Map (PIM) and its Symbium-built business zoning check are the official parcel tools. Commercial zoning-data vendors (Zoneomics with public pricing, Gridics, Regrid, UrbanFootprint) sell nationwide parcel and zoning data that includes SF, mainly to developers and real-estate firms. None of the sources describe answers with citations to the code text.

### Cited Findings
- **SF Planning Property Information Map (PIM)** at sfplanninggis.org/pim: covers all SF properties with zoning, permits, complaints and appeals history. Free. Users: residents, developers, staff — [PIM help](https://sfplanninggis.org/pim/help.html); [data.gov listing](https://catalog.data.gov/dataset/san-francisco-property-information-map)
- **Symbium / "BUILD for Business" zoning check**: SF Planning points users to a Business Zoning Check built with Symbium to see whether a business is permitted at a location — [SF Planning permits](https://sfplanning.org/permits)
  - Launched with SF Planning in May 2018. Originally scoped to restaurant uses, it was expanded to all business types. Source is a vendor case study; **(possibly outdated)** — [Symbium SF case study PDF](https://symbium.com/docs/SFCasestudy.pdf)
  - Symbium Plancheck automates parcel-level legal analysis of development proposals against local zoning codes — [Planetizen](https://planetizen.com/node/113702)
  - Pricing: not public. Sold to governments; a 2021 ABAG survey says local staff did not need to configure it **(possibly outdated)** — [ABAG survey PDF](https://abag.ca.gov/sites/default/files/documents/2021-12/Symbium%20application%20survey.pdf)
- **Zoneomics**: free SF zoning map page plus paid data — [Zoneomics SF](https://www.zoneomics.com/zoning-maps/california/san-francisco)
  - Zoning Search plans: Essentials $61/mo, Advanced $186/mo, Enterprise custom — [Zoneomics pricing](https://www.zoneomics.com/pricing/zoning-search)
  - API Growth plan $549/mo; API data is for internal business and research use only — [Zoneomics API pricing](https://www.zoneomics.com/pricing/api). (Pricing date not verified.)
- **Gridics**: zoning data API and feasibility reports, with pricing by demo request only. A 2025 partnership gives Cotality users access to Gridics parcel zoning data. SF coverage not specifically confirmed — [Gridics](https://gridics.com/?p=35); [CB Insights](https://www.cbinsights.com/company/gridics)
- **Regrid**: nationwide parcels, a portion of which include a zoning code, plus a paid Standardized Zoning layer updated monthly for major metros — [Regrid blog](https://regrid.com/blog/dwp-helps-the-national-zoning-atlas-demystify-zoning)
- **UrbanFootprint**: Parcel Reference Data from county assessors (APN, land use, zoning indicators where provided). Primarily a planning and analysis platform — [UrbanFootprint blog](https://urbanfootprint.com/blog/urban-planning/unlock-the-powers-of-unified-parcel-data/). It also markets resilience and climate analytics, but I did not verify this in this pass.
- **SF open data**: city parcels dataset with current zoning-district columns, and an Affordable Housing Bonus Program zoning-district dataset — [Baselight mirror of SF parcels](https://baselight.app/u/usgov/dataset/city_of_san_francisco_parcels_active_and_retired); [AHBP zoning districts](https://data.amerigeoss.org/dataset/ahbp-zoning-districts)
- **SB 79 map**: SF Planning publishes a map of low-resource parcels temporarily exempt from SB 79 until January 2032. About 120,000 parcels in 270 transit-stop areas might be subject to SB 79 — [SF Planning SB 79 implementation](https://sfplanning.org/project/senate-bill-79-implementation-san-francisco)

### Inferences
- The parcel and zoning-data layer is crowded and commoditized. The project should link to PIM and DataSF parcels rather than compete on it. The differentiator is legal reasoning with citations about *which rules apply and why*, especially fast-changing state overlays (SB 79, Family Zoning Plan) that vendors encode with lag.

### Gaps
- Archistar, Envelope and Cityscape-type massing tools: no SF-specific evidence found.
- Whether Symbium's SF business zoning check is still live in 2026: not verified.
- Gridics SF coverage and pricing: not found.

## 3. Housing data dashboards and portals

### Takeaway
SF has rich official housing data: the DataSF Socrata portal, SF Planning's Housing Dashboard (launched Jan 2025), quarterly pipeline reports, the annual Housing Inventory, the Rent Board Housing Inventory dataset, and HCD's statewide APR dashboard. None offers official natural-language or AI querying. AI access to DataSF exists only through third-party connectors (MCP servers, Runbear, Relevance AI) and a 2023 "San Francisco GPT" prototype.

### Cited Findings
- **DataSF / SF OpenData** (data.sfgov.org, Socrata SODA API) is the city's official portal — [About SF OpenData](https://data.sfgov.org/about); [sf.gov/data](https://sf.gov/data)
- **SF Planning Housing Dashboard**: launched January 2025. Shows completed units since 2005 and active pipeline projects as a map or table, filterable by Analysis Neighborhood and Supervisor District. Data on DataSF. No AI feature described — [SF Planning Housing Dashboard](https://sfplanning.org/node/3312)
- **Pipeline Report**: 2026 Q2 lists 75,853 total pipeline units and 18,536 affordable units (24%); Q1 2026 listed 74,888. Planning warns of errors from mixed sources — [SF Planning pipeline report](https://sfplanning.org/project/pipeline-report); [Housing development pipeline](https://sfplanning.org/resource/housing-development-pipeline)
- **Housing Inventory**: annual report on housing production. The 2025 edition was published 2026-04-01 — [SF Planning Housing Inventory](https://sfplanning.org/project/housing-inventory)
- **Rent Board Housing Inventory**: DataSF dataset gdc7-dmcn, updated by Rent Board staff and shared every 24 hours. It covers units subject to the Rent Ordinance (about 250,000). Required by Ord. 265-20 (effective 2021-01-18). Data is self-reported and not verified — [data.gov listing](https://catalog.data.gov/dataset/rent-board-housing-inventory); [Rent Board Housing Inventory](https://www.sf.gov/rent-board-housing-inventory)
  - About 47% of 202,000 fee-paying units obtained a 2024 rent-increase license — [SF Chronicle](https://preview-prod.w.sfchronicle.com/realestate/article/sf-rent-increase-licenses-19911165.php)
  - The landlord-facing portal is the Housing Inventory and Fee Portal — [sf.gov](https://sf.gov/rent-board-housing-inventory-and-fee-portal)
- **MOHCD**: publishes annual reports (FY 2024-25 PDF). No interactive MOHCD dashboard was verified — [MOHCD FY2024-25 Annual Report](https://media.api.sf.gov/documents/MOHCD_FY_2024-2025_Annual_Report.pdf)
- **DataSF Housing Data Hub**: puts housing data in the context of policies and programs; a Jekyll site on open-data APIs **(possibly outdated; activity not checked)** — [GitHub DataSF/housing-data-hub](https://awesome.ecosyste.ms/projects/github.com%2FDataSF%2Fhousing-data-hub)
- **HCD APR Dashboard (state)**: built from housing element Annual Progress Reports, with Compliance Summary, APR Submission Status, RHNA and RHNA Progress views. Data is self-reported and not verified by HCD — [HCD APR dashboard](https://hcd.ca.gov/housing-open-data-tools/apr-dashboard). An "APR Dashboard 2.0" was presented at a Silicon Valley @ Home event (date not verified) — [SV@Home event](https://siliconvalleyathome.org/event/hcd-presents-housing-element-annual-progress-report-dashboard-2-0/)
- **ABAG**: Housing Element Implementation & APR Data Dashboard for Bay Area jurisdictions — [ABAG APR dashboard](https://www.abag.ca.gov/technical-assistance/housing-element-implementation-and-apr-data-dashboard). An older ABAG Housing Policy & Data Explorer has permits only for 2014-2016 and a policy directory **(outdated, 2018)** — [ABAG news](https://abag.ca.gov/news/new-online-housing-policy-and-data-explorer) [fetched]
- **AI or natural-language access**
  - "San Francisco GPT" prototype converted natural-language questions to SQL over DataSF **(2023, possibly outdated; current status unknown)** — [Axios SF](https://www.axios.com/local/san-francisco/2023/04/19/san-francisco-gpt-data-portal)
  - Third-party connectors, none run by the city: a DataSF MCP server — [Glama](https://glama.ai/mcp/servers/pr2xxaqtt1); Runbear — [Runbear](https://runbear.io/use-cases-software/san-francisco-open-data-datasf); Relevance AI — [Relevance AI](https://relevanceai.com/integrations/san-francisco-open-data-datasf)
  - **Transparent City** (formerly Transparent SF): an open-source nonprofit co-founded in 2025 by Adam Werbach and Rob Goldman. It applies AI across SF public data to flag two-sigma anomalies. Not housing-specific. Source is the founder's own site — [Transparent City](https://adamwerbach.com/portfolio/transparent-sf); [Introducing Transparent SF](https://adamwerbach.com/blog/introducing-transparent-sf)
  - **sfhousing.vercel.app**: unaffiliated per-project tracker for every 10+ unit new-construction permit. Uses DataSF datasets i98e-djp9, 87xy-gk8d and j67f-aayr. Timelines are estimated from empirical medians ("V0 model"); no AI. Builder and date not stated — [sfhousing about](https://sfhousing.vercel.app/about) [fetched]
- The SF AI Use Inventory (Admin. Code Ch. 22J) lists city departments' declared AI systems — [data.gov](https://catalog.data.gov/dataset/san-francisco-ai-use-inventory-chapter-22j)

### Inferences
- Data supply is not the bottleneck. Explaining what the numbers mean against the law (e.g., RHNA progress vs. Housing Element obligations, pipeline vs. entitlement rules) is unserved. Generic DataSF MCP and chat connectors give raw queries without policy context or legal citations. That combination is the project's likely differentiator.

### Gaps
- Controller's Office housing dashboards: not checked.
- Whether DataSF or SF Planning plan official AI query features: not found.
- SF's current HCD compliance status: not retrieved from the dashboard (it requires interactive filtering).

## 4. Legislative tracking covering SF

### Takeaway
The Board of Supervisors' Legistar is the primary record (not fetched here). Commercial AI legislative trackers (Plural, and by reputation Quorum and FiscalNote) focus on state and federal bills, with local coverage only in premium tiers, and SF depth is unverified. Soar's "Citizen Portal" publishes AI-style summaries of SF Board meetings. I found no SF-specific Councilmatic instance.

### Cited Findings
- **Plural**: AI bill summaries, AI summaries of differences between bill versions, topic tagging, and Global Bill Search. Covers 50 states, DC, PR, Congress and 40+ countries. One pricing tier mentions "local bills"; city list not published — [Plural homepage](https://pluralpolicy.com/); [Plural AI bill tracking](https://pluralpolicy.com/ai-powered-bill-tracking/); [Plural pricing](https://pluralpolicy.com/?p=2625)
- **Soar Citizen Portal** (cpo.soar.com) publishes article-style summaries of SF Board of Supervisors meetings. One 2026 example covers an amendment letting the Planning Director update SB 79 exemption tables pending HCD determinations. Whether the summaries are AI-generated is not confirmed in the snippet — [Soar article](https://cpo.soar.com/articles/7875758/San-Francisco-County/California/Supervisors-approve-amendment-allowing-planning-director-to-update-SB-79-exemption-tables-pending-HCD-determinations)
- SF passed an ordinance requiring departments to disclose AI use to the CIO and create a public inventory (Ronen) — [GovTech](https://govtech.com/artificial-intelligence/san-francisco-bill-would-require-city-catalog-ai-uses); ordinance text [o0288-24](https://www.sfbos.org/sites/default/files/o0288-24.pdf)
- **Civic tech**: Code for San Francisco's Data Science Working Group built "datasci-housing-pipeline", analyzing how zoning affects housing development **(possibly outdated)** — [GitHub sfbrigade/datasci-housing-pipeline](https://github.com/sfbrigade/datasci-housing-pipeline). Bloom Housing is an open-source affordable-housing listings platform that grew out of SF's DAHLIA portal (2015) — [Civic Tech Field Guide: Bloom Housing](https://directory.civictech.guide/listing/bloom-housing)
- **SPUR** held an event on 2025-10-07 titled "AI and tech: cities, housing permits, planning case studies" (content not fetched) — [SPUR event](https://www.spur.org/events/2025-10-07/ai-and-tech-cities-housing-permits-planning-case-studies-emulate-cities-and)

### Inferences
- Tracking pending SF housing legislation, together with the in-force code text, is a gap. Plural-style tools are state-focused, Legistar has no semantic layer, and Soar's summaries are not linked to code sections.

### Gaps
- SF Legistar (sfgov.legistar.com) features: not fetched.
- Quorum, FiscalNote and Councilmatic SF coverage: no sources found in this pass.
- SF Standard or Mission Local housing data tools: none found.
- Data + Democracy: not found; may not exist under that name.

## 5. Research and advocacy tools

### Takeaway
Research and advocacy tools are mostly static maps and policy analysis (Urban Displacement Project, Anti-Eviction Mapping Project, Terner Center, CA YIMBY). Several are older than 2025. None offers AI Q&A.

### Cited Findings
- **Anti-Eviction Mapping Project (AEMP)**: a data visualization and storytelling collective born in the Bay Area. Its time-lapse map uses SF Rent Board no-fault eviction data since 1997, alongside an oral-history map. Fiscally sponsored by Independent Arts & Media. Users: tenants, organizers, researchers. Overlaps tenant tools, which are out of scope — [AEMP about](https://antievictionmap.com/about)
- **Urban Displacement Project** (UC Berkeley/UCLA): interactive Bay Area gentrification and displacement typology map with demographic, rent and income layers **(2016 secondary source; possibly outdated)** — [Google Maps Mania 2016](https://googlemapsmania.blogspot.com/2016/05/mapping-displacement-in-bay-area.html)
- **Terner Center (UC Berkeley)**: Housing Development Dashboard (2016), including a development feasibility calculator for sample Bay Area cities **(possibly outdated)** — [Planetizen](https://planetizen.com/node/86670/housing-development-dashboard-promises-new-understanding-housing-policy); [Architect Magazine](https://www.architectmagazine.com/practice/will-your-project-happen-uc-berkeley-has-an-app-for-that/). Current output is mainly policy analysis (e.g., a 2026 California Legislative Preview). No 2025-26 dashboard was confirmed.
- **California YIMBY**: an August 2026 review argues that LA, SF and San Diego aggressively shrank SB 79 coverage. No standalone housing element tracker was found — [CA YIMBY blog](https://cayimby.org/blog/sb-79-one-month-in-taking-stock-of-california-yimbys-signature-bill/)
- **Context for SF policy questions**: SF's Family Zoning Plan must accommodate at least 36,200 more units under its Housing Element (82,000 total target). The plan faces two lawsuits — [Coblentz Law](https://www.coblentzlaw.com/?p=12251); [SF Planning FZP SB 79 compliance PDF](https://sfplanning.org/sites/default/files/documents/citywide/fzp-sb-79-compliance.pdf)

### Inferences
- Advocacy tools carry a viewpoint (AEMP is tenant-organizing; CA YIMBY is pro-supply). A neutral assistant with citations could cite them as secondary sources while grounding answers in the law and in primary datasets.

### Gaps
- Current Urban Displacement Project SF map status and any 2025-26 update: not verified on the project site.
- SPUR's data tools: not found beyond events and reports.
- Climate-risk coverage across all the tools above: not verified; deferred to the climate researcher.
