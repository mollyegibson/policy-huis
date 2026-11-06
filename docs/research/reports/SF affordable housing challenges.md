# Money, not zoning, now stalls SF housing

As of November 2026, San Francisco's main affordable-housing problem is **finance, not entitlement**. Through 2025 the city had produced about **12% of its 82,069-unit 2023–2031 RHNA target, with roughly 37.5% of the cycle elapsed**. Meeting the affordable share would take about 6,756 affordable units a year, against recent output of roughly 1,000–1,700. The Budget & Legislative Analyst (BLA) found no source that could supply the **$17.9B in city subsidy** this would need ([BLA, June 2026](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). Rezoning is done: the Family Zoning Plan took effect January 2026 and SB 79 in July 2026. But the pipeline is full of approved projects that cannot start. Only **3,301 of 75,853 pipeline units (4%) are under construction** ([SF Planning, 2026 Q2 Pipeline](https://sfplanning.org/project/pipeline-report)). The city's own feasibility study put the maximum supportable inclusionary rate at 0%, and the Board cut on-site inclusionary to 5% effective August 22, 2026 ([SF Planning Inclusionary Program](https://sfplanning.org/project/inclusionary-affordable-housing-program)). Tenants face rents up about 24% year over year and 37% rent burden ([Mission Local, Nov 2026](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/); [BLA](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). Recent failures follow a pattern: proposals sank on vote thresholds or rival measures, and approved projects stalled on money, interest rates, infrastructure and PG&E hookups. For PolicyHuis this is good news. Nearly every question raised here can be answered from about 40 open, mostly public-domain datasets that join on block/lot, Planning case number and permit number, plus a short list of rule texts. The tool's real value is **reconciling the conflicting numbers officials, candidates and advocates cite**, and labelling which is which. One major unknown: the results of the November 3, 2026 funding measures (Props B, C and I) were not yet available when this research was done.

## The four user-provided sources frame cost, targets, reform and politics

The four sources span a decade of policy thinking. Each covers a different layer.

| Source | Date | What it contributes | Limits |
|---|---|---|---|
| [ONE San Francisco Capital Plan FY2026–35, Affordable Housing](https://onesanfrancisco.org/cap-plan-2026/affordable-housing) | FY2026–35 plan | Local funding history and agency roles: G.O. bonds of **$310M (2015), $600M (2019) and $300M (2024)**; $147M for supportive housing in the 2020 Health and Recovery bond; $112M in 2022 Certificates of Participation; the 2018 gross-receipts tax for homelessness. Notes that the Housing Element was updated in early 2023 and that BIPOC residents bear higher homelessness, rent burden and overcrowding, linked to urban renewal and redlining. | Gives no total investment figure and no project-level data. |
| [SF Planning, Housing Affordability Strategies](https://sfplanning.org/housing-affordability-strategy) | 2018–2020 (pre-2024) | The baseline targets that fed the 2022 Housing Element: **5,000 units a year with at least one-third affordable, 1,100 units preserved a year, and $517M a year** (2020 dollars). Documents the decline in low- and moderate-income households. | Predates the current RHNA cycle, the cost spike and the 2026 reforms. |
| [SPUR, "Realigning Housing Policy With Real-World Economics," Lori Droste](https://www.spur.org/news/2026-06-25/realigning-housing-policy-real-world-economics-san-francisco) | June 25, 2026 | The case for the inclusionary reform package. The Technical Advisory Committee unanimously recommended a 5% on-site cap (10% if no funding measure reached the ballot), exempting projects under 25 units, dropping the middle-income tier, and cutting impact fees 67%. Reports that **2025 production was half of 2020's** and that in-lieu fee revenue fell from over $20M a year to negative. | SPUR is a policy advocacy organization that supported the package. |
| [Mission Local, Joe Rivano Barros](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/) | Nov 2, 2026 (updated Nov 3) | Election-eve affordability plans from officials and candidates, plus market context: **rents up 24% year over year; median one-bedroom $3,879** (Apartment List). | Most figures are **candidate or official claims**, listed in the verification section below. |

Read together, they show a shift. The 2018–2020 strategy assumed that more zoning plus steady public money would close the gap. The 2026 sources treat **feasibility and permanent funding** as the binding constraints and treat zoning as largely settled.

## Twelve percent of RHNA with a third of the cycle gone

### Policy makers face a structural funding gap, not a cyclical dip

Production has collapsed. Annual output fell from **4,972 units in 2017 to 1,457 in 2024**, the lowest since at least 2006, with only "a slight uptick" in 2025 ([BLA](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). Just **405 units were completed in the first half of 2026** ([The Frisc, July 2026](https://thefrisc.com/sf-has-built-only-400-homes-this-year-tens-of-thousands-more-are-waiting/)). The BLA, citing the 2025 Housing Inventory, puts progress at 14% for very-low-income units (2,981 of 20,867), 14% for low (1,682 of 12,014), and 10% for moderate and above-moderate. The overall figure is **9,581 of 82,069 units, or 12%** ([BLA, Exhibit D](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). The state's own RHNA Progress Report counts only building permits and shows lower shares: **8% very low, 10% low, 7% moderate and 6% above moderate** ([HCD RHNA Progress Report, data.ca.gov](https://data.ca.gov/dataset/rhna-progress-report)). The two series measure different things, and a cited-answer tool should name which one it uses.

Cost is the root problem. A tax-credit affordable unit averaged **$954,127 in 2024**. The federal government paid 46%, the city 32% (about $300,000), the state 13%, and permanent loans 8% ([BLA, Exhibit F](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). City money relies on voter-approved bonds and one-time funds. The BLA calls bonds "not a secure funding source" because each needs a new vote and competes with other city debt. MOHCD spent $285.7M on multifamily loans in FY2024-25, of which about $234M came from six local sources (same source). Advocates warn of a cliff. Per MOHCD projections relayed by the Council of Community Housing Organizations, local gap capacity falls from about **$330M for 20 projects this year to about $130M for 7 projects in FY2027-28**, and bond funds could run dry by FY2028-29, with the next scheduled housing bond not until 2034 ([48 Hills, Sept 2026](https://48hills.org/2026/09/sf-is-about-to-run-out-of-affordable-housing-money-unless-props-i-and-c-pass/); advocacy outlet). Two November 2026 measures tried to create permanent funding streams:

- **Prop C** raises the Housing Trust Fund contribution toward $125M a year from FY2028-29, with freeze triggers. The Controller estimates added cost rising to about $60M a year by FY2034-35 ([GrowSF voter guide](https://growsf.org/voter-guide/san-francisco-voter-guide-november-2026-election/measures/prop-c/); advocacy).
- **Prop I** dedicates half of the transfer tax on sales over $10M, about $120M a year, to affordable and social housing ([Local News Matters, Sept 2026](https://localnewsmatters.org/2026/09/25/san-francisco-prop-i-affordable-housing/)).

Even if both passed, about $200M a year would fall far short of the BLA's estimated need, so money stays the binding constraint (researcher inference). The federal side improved: the 2025 tax law lowered the 4% LIHTC bond test from 50% to 25%, "functionally doubling" 4% credit availability ([BLA](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)).

Rezoning removed the legal constraint but not the economic one. The Board adopted the Family Zoning Plan 7–4 on December 2, 2025. It rezones about **96,000 parcels for roughly 36,000 units of capacity**, mainly on the west and north sides. Melgar's amendment shields buildings with three or more rent-controlled units from demolition; Chan's broader amendment failed 7–4 ([KQED](https://www.kqed.org/news/12065708/san-francisco-supervisors-pass-rezoning-plan-making-way-for-taller-denser-housing)). The city's chief economist reportedly projects only **about 14,600 units over 20 years** (search summary of [SF Standard](https://sfstandard.com/2025/12/02/family-zoning-supervisors-vote-daniel-lurie/) coverage). The plan took effect January 12, 2026. It faces lawsuits from YIMBY Law and allied groups, and a separate suit challenges its use as the city's SB 79 alternative plan ([SF Planning FZP](https://sfplanning.org/sf-family-zoning-plan); [KQED](https://www.kqed.org/news/12069226/neighborhood-small-business-groups-file-lawsuit-over-san-francisco-rezoning-plan)).

The state oversight record is mixed. HCD's October 2023 Policy and Practice Review found SF had "the longest timelines and some of the highest procedural hurdles in California" and imposed 18 Required Actions ([HCD](https://www.hcd.ca.gov/about-hcd/newsroom/state-releases-accountability-report-on-san-franciscos-housing-policies-and-practices)). By August 2024 HCD said SF was "up to date" on them ([HCD](https://www.hcd.ca.gov/about-hcd/newsroom/housing-accountability-units-efforts-lead-to-san-franciscos-progress-removing-barriers-to-housing-production)). No 2026 status update was found; Planning's tracker was last updated September 2025 ([sfplanning.org/ppr](https://sfplanning.org/ppr)).

### Inclusionary policy flipped from revenue source to feasibility drag

The Controller's 2026 triennial review, as described by the BLA, concluded that "nearly all new residential projects are infeasible" and that the "maximum recommended inclusionary requirement is zero percent" ([BLA](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). None of ten prototype projects was feasible even with land excluded ([SF Examiner, July 2026](https://www.sfexaminer.com/news/politics/supervisors-back-luries-plan-to-cut-affordable-housing-fees/article_79f74ee1-038b-402d-ac49-783873ab506e.html)). Board File 260538, effective August 22, 2026, made these changes:

- exempts projects under 25 units from inclusionary requirements;
- sets on-site inclusionary at **5%** (8% in the Mission);
- cuts Article 4 impact fees by 67%;
- allows deferral of up to 85% of fees;
- lets unbuilt pipeline projects request modified conditions of approval.

Sources: [SF Planning](https://sfplanning.org/project/inclusionary-affordable-housing-program); [Legistar text](https://sfgov.legistar.com/View.ashx?GUID=40004122-9FEB-4E0C-A67B-2126814C08E5&ID=15691706&M=F&amp=&amp=).

The evidence for fee cuts is weak. The 2023 temporary reductions saved only **0.44–1.83% of development cost**, and the BLA concluded that "fee discounts did not make projects feasible at scale." In-lieu fee revenue fell from $31.4M in FY2018-19 to **−$1.27M (net refunds) in FY2024-25** ([BLA, Exhibit I](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). The steelman for the cut is that 15–20% requirements on projects that never get built produce zero affordable units. The steelman against is that AI-driven rent growth may restore feasibility and leave the 5% rate too low. The BLA's recommendation of time-limited moratoria that can be reinstated is meant to handle both cases.

### Tenants face rising rents, banded data and opaque access

**37% of renter households were rent-burdened in 2024, and 18% were severely burdened** (paying over 50% of income) ([BLA](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf)). The BLA put the average one-bedroom rent at $3,164 in January 2026. Mission Local, citing Apartment List, reports a median of $3,879 and **24% year-over-year growth** ([Mission Local](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/)). Supervisor Fielder says evictions are at a 10-year high, mostly for nonpayment; that is her claim. Tenant Right to Counsel kept 93% of clients housed ([Bay Legal](https://baylegal.org/tenant-right-to-counsel-prevents-homelessness/)), but flat funding reportedly covers only about 2,500 cases ([SF Public Press](https://www.sfpublicpress.org/eviction-rates-in-sf-soar-as-legal-aid-faces-deep-funding-cuts); search summary).

Beyond evictions, tenants face several structural problems:

- **Lottery odds are unknowable.** Affordable units lease through the DAHLIA lottery or by referral, and no open data reports applications, rankings or waitlists ([sf.gov lottery process](https://www.sf.gov/information--learn-how-mohcd-runs-affordable-housing-lotteries)).
- **Demolition risk.** About 20,000 rent-controlled units remain exposed to demolition under upzoning, by Supervisor Chan's account (search summary).
- **Pass-through costs.** Seismic retrofit and capital-improvement costs can be passed through to rent-controlled tenants (see the sustainability section).
- **Electrification bills.** Bill effects depend on utility allowances that owners themselves find opaque ([CHPC](https://chpc.net/wp-content/uploads/2022/03/Decarbonization-through-Utility-Allowances-2022-Report.pdf)).

The allowable annual increase for rent-controlled units is 60% of local CPI-U ([DataSF hsxb-ci7b](https://data.sf.gov/api/views/hsxb-ci7b.json)). It was 1.6% for March 2026–February 2027 ([sf.gov](https://www.sf.gov/news--annual-rent-increase-3126-22827-announced)).

## Rival measures, vote thresholds and project vetoes sank past proposals

SF's failed proposals fall into three types, and the mix has shifted since 2023.

**Board vetoes of individual projects** were the 2021 pattern. The Board voted 8–3 to overturn CEQA approval of **469 Stevenson**, a 495-unit tower with 89 affordable units on a Nordstrom parking lot. The stated reasons were seismic and geotechnical risk and displacement ([SFist, Oct 2021](https://sfist.com/2021/10/27/supes-shoot-down-27-story-soma-residential-tower-over-earthquake-displacement-concerns)). Together with **450–474 O'Farrell**, more than 800 units (about 130 affordable) were lost, and HCD issued a warning ([SF Standard, Jan 2022](https://sfstandard.com/2022/01/10/san-francisco-scrambles-to-prep-for-lawsuits-after-rejecting-800-new-housing-units/)). 469 Stevenson was later re-approved, but it is still a vacant lot because high-rise financing does not pencil ([SF Standard, Apr 2024](https://sfstandard.com/2024/04/09/yimby-nimby-nordstrom-469-stevenson-settlement/)). The episode produced **AB 1633**, which lets developers sue cities that block infill housing by demanding further CEQA review, and fed into HCD's Policy and Practice Review. No outright denial of a housing project by the Board or Planning Commission in 2024–2026 was found. Instead, the Board unanimously rejected neighbor appeals against 100%-affordable projects, such as Marvel in the Mission in July 2025 ([Mission Local](https://missionlocal.org/2025/07/supervisors-reject-neighbors-attempt-to-challenge-permanent-supportive-housing-at-mission-and-16th/)).

**Split or competing ballot measures** sank streamlining in 2022. Prop D (the mayor's) and Prop E (the Board progressives') both offered streamlining, E with higher affordability requirements. With about 95% of votes counted, D had 48.8% and E 45.5%, so both failed to reach a majority ([Local News Matters, Nov 2022](https://localnewsmatters.org/2022/11/09/dueling-san-francisco-housing-propositions-remain-in-the-balance-both-shy-of-50-percent/)). The explanation that E was placed to sink D comes from partisan sources such as GrowSF and Senator Wiener; no neutral post-mortem was found.

**Regional bond thresholds and legal risk** killed the **$20B Bay Area bond (Regional Measure 4)**, withdrawn in August 2024. A taxpayer lawsuit pushed the stated annual cost from about $670M to $911M. The measure depended on statewide Prop 5 lowering the vote threshold to 55%, and polling hovered near 55% against a two-thirds requirement ([SF Standard](https://sfstandard.com/2024/08/14/bahfa-bond-yanked-at-last-minute/); [CalMatters](https://calmatters.org/housing/2024/08/bay-area-housing-bond-pulled/)). Sources differ on whether the legal problem or the expected loss was decisive.

The 2025–26 casualties were quieter:

- **BUILD Act.** Lurie and Mahmood's proposal to roll back the 2020 transfer-tax rates was shelved in June 2026 over budget concerns ([Local News Matters](https://localnewsmatters.org/2026/09/25/san-francisco-prop-i-affordable-housing/)).
- **Chan's amendment** to protect all rent-controlled units in the Family Zoning Plan failed 7–4.
- **The previous inclusionary rates** gave way to the 5% regime.
- **The first inclusionary "grand bargain"** collapsed before a restart, per a headline that was not fetched ([The VoiceSF](https://thevoicesf.org/melgar-lurie-push-restart-button-on-affordable-housing-grand-bargain-with-new-ballot-measure/)).

The trend is clear. **State law (AB 1633, the HCD review, the AB 130 CEQA exemption) now constrains discretionary vetoes, so what fails today are projects that cannot be financed and measures that fall short of vote thresholds.**

## Entitled-but-unbuilt units grew twentyfold while construction shrank

### The stall is visible in the official pipeline

Planning's 2026 Q2 pipeline counts **75,853 new units**. Of these, 18,536 are affordable (24%), but only 3,301 are under construction. Half the pipeline, 37,577 units, sits in multi-phase development agreements ([SF Planning](https://sfplanning.org/project/pipeline-report)). Over roughly five years to mid-2026, entitled units with no permit filed grew from **448 to 9,477**, while units under construction fell from 4,545 to about 3,300 ([The Frisc](https://thefrisc.com/sf-has-built-only-400-homes-this-year-tens-of-thousands-more-are-waiting/)). On the affordable side, MOHCD's pipeline dataset shows 78 projects totaling 14,098 units in "Design with Entitlements Approved", versus 63 projects (about 6,200 units) under construction (researcher query of [DataSF aaxw-2cb8](https://data.sf.gov/d/aaxw-2cb8), Nov 4, 2026).

The best-documented stalls are long-approved megaprojects:

- **Parkmerced** (Maximus): every phase carries a February 2011 entitlement date and no construction start.
- **Schlage Lock** (1,679 units, entitled 2014): still "before predevelopment."
- **Hunters Point Shipyard and Candlestick**: blocks entitled 2017–18 show estimated starts of 2028 and 2032 (all three from [DataSF aaxw-2cb8](https://data.sf.gov/d/aaxw-2cb8)). The Navy cleanup was pushed back up to 18 months after radioactive objects were found ([The Real Deal, Aug 2024](https://therealdeal.com/sanfrancisco/2024/08/02/radioactivity-moves-back-cleanup-deadline-at-hunters-point)).
- **Pier 70**: in August 2026 the Port took up a restart that would cut the affordable share from 30% to at least 20% and write off $50M in developer costs. This comes from a third-party meeting summary ([Locunity](https://www.locunity.com/commissions/port-commission/reports/fd5b379b-0dab-40ee-8502-78e9e566464b)).

Mission Rock is the counter-example. It delivered 537 rentals, 133 of them below-market-rate (BMR), during the pandemic (same source).

### Five documented causes, two stall types

The causes compound:

- **Infeasibility at current rents and rates.** Planning's Dan Sider said pipeline numbers "might become radically more real" if rates fell, but the city economist expects little relief within 18 months ([The Frisc](https://thefrisc.com/sf-has-built-only-400-homes-this-year-tens-of-thousands-more-are-waiting/)).
- **Scarce local gap funding**, which tax-credit applications need to be competitive.
- **Tax-credit cycle timing.** MOHCD front-loaded gap financing for Sunnydale Block 9 because waiting for infrastructure risked a 9–12-month delay and lost credits ([MOHCD Loan Evaluation, Aug 2024](https://www.sf.gov/sites/default/files/2024-08/Approved%20Sunnydale_Block_9_Loan_Evaluation_final_(LC_8-16-2024).pdf)).
- **Upfront megaproject infrastructure**: streets, power and sewers.
- **PG&E energization.** About 140 projects were delayed since 2018, adding $41M in costs to at least 9 affordable developments, and some finished affordable buildings sat empty ([KQED](https://kqed.org/news/11943157/how-pge-adds-months-long-delays-costs-to-new-housing); [MOHCD memo, Mar 2023](https://www.sf.gov/sites/default/files/2023-06/Approved%20PG%26E%20Additional%20GAP%20Commitment%20Memo%20-%20LC%203-3-23.pdf)).

Balboa Reservoir shows the cost pattern: MOHCD's 2023 evaluation warned that completion around December 2026 could slip given "cost escalation and high interest rates" ([MOHCD](https://www.sf.gov/sites/default/files/2023-06/Approved_3.%20Balboa%20Reservoir%20Building%20A%20Loan%20Eval%202023%20%20FINAL_LC%201-20-2023.pdf)). There are two distinct stall types: **pre-construction financing stalls** and **post-construction utility stalls**. They need different detection rules.

### Six joinable datasets support a stall detector

Project progress is tracked across these datasets:

| Dataset | ID | What it tracks |
|---|---|---|
| Planning's quarterly Development Pipeline | [6jgi-cpb4](https://data.sf.gov/d/6jgi-cpb4) | `current_status`, `current_status_date`, `approved_date_planning` |
| MOHCD Affordable Housing Pipeline | [aaxw-2cb8](https://data.sf.gov/d/aaxw-2cb8) | `entitlement_approval`, `construction_status`, `estimated_actual_construction_start_date` |
| DBI Building Permits | [i98e-djp9](https://data.sf.gov/d/i98e-djp9) | `first_construction_document_date`, `last_permit_activity_date` |
| PermitSF, the new system from February 2026 | [tyz3-vt28](https://data.sf.gov/d/tyz3-vt28) | Permits filed in the new system |
| Planning Records – Projects | [qvu5-m3a2](https://data.sf.gov/d/qvu5-m3a2) | Planning decisions and state-law flags |
| Housing Production | [xdht-4php](https://data.sf.gov/d/xdht-4php) | `first_completion_date` |

They join on block/lot, Planning case/PRJ number and building permit application number. These join keys were not tested end to end.

A defensible detector, proposed by the researchers and not a city standard, flags five conditions:

1. Planning-approved with no building permit filed after 2–3 years.
2. Permit issued but no first construction document.
3. Under construction with stale permit activity.
4. Construction complete with no completion record (the PG&E pattern).
5. MOHCD estimated start date in the past while the project is still pre-construction. For example, 600 McAllister's estimated start of February 2024 has passed.

There are three caveats:

- `6jgi-cpb4` holds only the current quarter, so detecting changes from quarter to quarter means archiving each snapshot.
- The `has_approved_entitlement` flag is null for many rows, including 91 approved projects with 35,177 units.
- MOHCD's pipeline was last refreshed May 21, 2026, which suggests a missed quarter, and its description still says data are "as of September 30, 2023" ([aaxw-2cb8 metadata](https://data.sf.gov/api/views/aaxw-2cb8.json)).

Per-project explanations of a slip live in **MOHCD Loan Committee evaluations** (PDFs), not in any dataset.

## TCAC's distance rules give PolicyHuis a ready-made proximity test

### The state already defines "near"

California's tax-credit scoring is the most authoritative proximity framework. Under CTCAC regulations adopted December 10, 2025 (Title 4 CCR §10325(c)(5)(A)), site amenities earn points within fixed distances:

- **Transit**: up to 7 points within 1/3 mile of a stop with service at least every 30 minutes at weekday peak, if density exceeds 25 units per acre; 3 points within 1/2 mile of any stop.
- **Full-scale grocery** (at least 25,000 sq ft): 5, 4 or 3 points within 1/2, 1 or 1.5 miles. A neighborhood market of at least 5,000 sq ft earns 4 points within 1/4 mile.
- **Parks or community centers**: 3 points within 1/2 mile.
- **Libraries**: 3 points within 1/2 mile.
- **Public schools**, for projects where at least 25% of units have three or more bedrooms: 3 points within 1/4 mile of an elementary, 1/2 mile of a middle or 1 mile of a high school, **and** only if the site is inside that school's attendance area.
- **Clinics, pharmacies and senior centers**: smaller scores.

The amenity total is capped at 15 points. Source: [CTCAC regs, third-party gocodebook mirror](https://gocodebook.com/library/us/ca/ca-ccr4-ctcac-regulations-adopted-2025-12-10/1.-transit-amenities); the cap is from an [Assembly analysis of AB 2270](https://billtexts.s3.amazonaws.com/ca/ca-analysishttps-leginfo-legislature-ca-gov-faces-billAnalysisClient-xhtml-bill-id-202520260AB2270-ca-analysis-399016.pdf). Separately, large-family projects in a High or Highest Resource tract on the **TCAC/HCD Opportunity Map** earn 8 points plus a tiebreaker bonus. Of SF's 242 tracts, the adopted 2026 map rates **43 Highest, 48 High, 71 Moderate and 74 Low**. The October 2026 draft for 2027 shifts this to 46/49/59/83 (researcher computation from [CTCAC files](https://www.treasurer.ca.gov/ctcac/opportunity.asp)). SF's Housing Element "Well-Resourced Neighborhoods" are defined by this map ([MOHCD NOFA Q&A](https://www.sf.gov/sites/default/files/2023-03/QandA%202023%20Acquisitions%20NOFA.pdf)). Low Resource status is also one of SB 79's temporary exemption criteria, so the yearly map revision affects both funding and zoning.

Three further frameworks layer on top:

- **SB 79**, effective July 1, 2026, covers more than 120,000 SF parcels. It allows 55–95 ft near transit, with the highest limits near BART and Caltrain. Parcels are temporarily exempt through 2032 if they face at least 1 ft of sea-level rise, are landmarks, already allow at least half of SB 79 density, or are in Low Resource areas ([SF Planning SB 79 factsheet](https://sfplanning.org/sites/default/files/documents/citywide/fzp-sb-79-compliance.pdf)).
- **AB 2011/AB 2243** opens commercial corridors with 70–150 ft rights-of-way ([BB&K](https://bbklaw.com/resources/la-093024-ab-2243-significant-expansion-of-sb-6-ab-2011)).
- **Admin Code Chapter 23A** prioritizes surplus public land for affordable housing and requires an annual Board hearing on the Surplus Property Report by April 15 ([amlegal](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-14343)).

### Method matters more than data in a dense, hilly city

The researchers draw two inferences. First, **straight-line TCAC scores saturate in most of SF**, because dense Muni service, small grocers and parks are near almost everything. What actually differentiates sites is opportunity category, a true 25,000 sq ft supermarket within 1/2 mile, school attendance-area alignment, and public ownership. Second, a credible tool should compute network walking distance over pedestrian graphs as well as straight-line distance, because hills, freeways and the Presidio make buffers overstate access. It should also derive frequency from GTFS headways for a defined peak window rather than counting stops, and version every policy layer by date. TCAC uses "as measured by a walkable path" for at least one rule, but whether amenity distances are measured straight-line or by walking route remains unconfirmed against the official text.

The data mostly exists:

- **Parcels**: [acdm-wktn](https://data.sf.gov/d/acdm-wktn).
- **Zoning and height**: [3i4a-hu95](https://data.sf.gov/d/3i4a-hu95), [h9wh-cg3m](https://data.sf.gov/d/h9wh-cg3m).
- **Land use**: [c5ge-t6pj](https://data.sf.gov/d/c5ge-t6pj).
- **Assessor roll**: [wv5m-vpq2](https://data.sf.gov/d/wv5m-vpq2).
- **Transit**: Muni stops [i28k-bkz6](https://data.sf.gov/d/i28k-bkz6), re-versioned each 3–6-month service sign-up, and regional GTFS from [511](https://511.org/open-data/transit).
- **Schools and attendance areas**: [7e7j-59qk](https://data.sf.gov/d/7e7j-59qk), [e6tr-sxwg](https://data.sf.gov/d/e6tr-sxwg).
- **Parks**: [gtr9-ntp6](https://data.sf.gov/d/gtr9-ntp6).
- **City-owned facilities**: [nc68-ngbr](https://data.sf.gov/d/nc68-ngbr).

Groceries are the weak spot. Registered Business Locations ([g8m3-pdis](https://data.sf.gov/d/g8m3-pdis)) dropped its NAICS description columns on July 6, 2026 and keeps only self-reported codes. No open dataset records store size, which is TCAC's threshold. The USDA Food Access Research Atlas indicators date from 2019 ([ERS](https://www.ers.usda.gov/data-products/food-access-research-atlas/update-and-revision-history)).

No "vacant parcel" dataset exists. Underuse must be derived from land use, the improvement-to-land value ratio and zoning capacity, excluding pipeline parcels. Priority Equity Geographies, Family Zoning Plan height layers and SB 79 station areas exist only as ArcGIS apps or PDFs, not as DataSF datasets. **No free tool joins Opportunity Map category, TCAC distances, current zoning and public ownership for a single SF parcel**, and that gap is one PolicyHuis can fill.

## Sustainability beyond flood: reuse, electrification deadlines, seismic pass-throughs and air quality

**Retrofit versus new construction.** Life-cycle analyses favor reuse. *The Greenest Building* found reuse saved 4–46% of impacts over 75 years compared with equally efficient new construction. A new building can take 10–80 years to offset its construction impacts ([Preservation Green Lab, 2012](https://www.achp.gov/sites/default/files/2024-01/The_Greenest_Building.pdf); search summary). In a NYSERDA study, a new building had **13 times the embodied carbon** of an adaptive-reuse building, mainly because of its new structure ([NYSERDA, 2024](https://www.nyserda.ny.gov/-/media/Project/Nyserda/Files/Programs/BOE/Analyzing-Embodied-Carbon-for-Retrofit-and-New-Construction_PCA_4-2024.pdf); search summary). SF requires an embodied-carbon worksheet but sets no numeric limit ([Environment Code Ch. 7](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_environment/0-0-0-644)).

Office-to-residential conversion is heavily incentivized:

- Prop C (2024) waives the transfer tax on the first sale after conversion.
- File 240927 waives inclusionary requirements and impact fees for up to 7 million sq ft of conversions.
- A downtown tax-increment financing district has been in effect since February 2026 ([SF Planning](https://sfplanning.org/project/downtown-adaptive-reuse-program)).

Output is still tiny: **about 300 units in the pipeline and no conversions completed in a decade** ([ABC7, Aug 2026](https://abc7news.com/post/san-francisco-office-housing-projects-are-gaining-traction/19668865/)). The inclusionary waiver means conversions yield no on-site affordable units by design, and their gas exemption until 2031 can lock in fossil-fuel systems. Acquisition-rehab through the Small Sites Program preserves existing rent-controlled stock, but its current per-unit cost is undocumented (the last figure is from 2018) and its reported scale varies by source.

**Electrification.** New construction has had to be all-electric since June 1, 2021. Under Ord. 174-25, major renovations permitted after July 1, 2026 that replace building-wide heating or hot water must also go all-electric. **100% affordable housing is exempt until July 1, 2027**, with a cost-based exception available until 2031 ([sf.gov](https://www.sf.gov/all-electric-buildings-in-san-francisco); [Ord. 174-25](https://www.sfbos.org/sites/default/files/o0174-25.pdf)). Existing large buildings face benchmarking under EBEPO ([96ck-qcfe](https://data.sf.gov/d/96ck-qcfe)), not retrofit mandates. For tenants, the bill impact depends on rate discounts (CARE, FERA, CleanPowerSF SuperGreen Saver) and utility-allowance schedules more than on the equipment itself. BayREN's multifamily rebates can reach $5,000+ per unit, but sources conflict on whether enrollment is open.

**Renewables.** SOMAH, the solar program for affordable multifamily housing, had about 139 MW completed or in the pipeline statewide toward a 300 MW goal. Tenants saved about $58 a month in 2025 ([CPUC, Oct 2026](https://www.cpuc.ca.gov/news-and-updates/all-news/bringing-the-benefits-of-solar-home---how-somah-expands-bill-credits)). SF-level counts can be filtered from [DG Stats](https://www.californiadgstats.ca.gov/charts/somah) but were not extracted. The 2022 Title 24 code requires solar plus batteries on new high-rise multifamily buildings, with community solar as an option. Whether the 2025 code cycle changes this was not checked.

**Transit and walkability.** Transportation is now SF's largest emissions sector: **48% of 2024 emissions, down only 28% since 1990, compared with 63% for buildings** (researcher computation from [DataSF btm4-e4ak](https://data.sf.gov/d/btm4-e4ak)). Since 2016, SF has screened projects using SB 743 VMT analysis: a site passes if its zone's VMT is at least 15% below the regional average ([SF Planning TIA memo](https://default.sfplanning.org/publications_reports/TIA_Guidelines_VMT_Memo.pdf)). This is why infill housing counts as a climate measure. The public VMT dataset, however, uses a 2012 baseline.

**Seismic.** As of October 7, 2026, **4,718 of 4,958 soft-story properties (95.2%) had completed retrofits and 228 were non-compliant** ([DataSF beah-shgi](https://data.sf.gov/d/beah-shgi)). So the remaining tenant exposure is mostly ongoing pass-throughs. Seismic work required by law can be passed through to tenants, capped at 10% of base rent a year ([sf.gov](https://www.sf.gov/information--capital-improvement-petitions); search summary), and is amortized under Rent Board Rules 7.10–7.17. Whether the January 2026 rule amendments changed seismic amortization is unconfirmed. Non-ductile concrete buildings have no current mandate.

**Heat and air quality.** In the 2006 heat wave, SF's emergency-department visits rose more than almost anywhere in California ([CDC](https://www.cdc.gov/climateandhealth/state-programs/sf.htm); search summary). Its Heat Vulnerability Index dates from around 2013 and is not on DataSF. Health Code Article 38 requires an Enhanced Ventilation Plan (MERV-13-equivalent filtration) for new housing in the **2025 Air Pollutant Exposure Zone** ([t65d-x6p8](https://data.sf.gov/d/t65d-x6p8); [sf.gov](https://sf.gov/plan-enhanced-ventilation-your-building)). The researchers infer a trade-off: the transit-rich arterial sites that minimize VMT are often inside the APEZ, so climate-optimal siting adds exposure and mechanical cost. PolicyHuis can surface this directly by overlaying the APEZ on the pipeline. CalEnviroScreen 5.0 (final July 1, 2026) adds tract-level pollution burden and feeds into the Opportunity Map ([OEHHA](https://oehha.ca.gov/calenviroscreen/press-release/press-release-calenviroscreen/california-releases-calenviroscreen-50-identify-and-prioritize-pollution-burdened-communities)).

## Forty open datasets cover most questions; lottery and loan data are missing

All DataSF metadata in this table was retrieved from `data.sf.gov/api/views/<id>.json` on November 4, 2026. "Last rows update" is the date the data last changed. "Not stated" means the publisher's license field is blank: do not assume public domain.

| Dataset | Publisher | ID / URL | What it answers | Update frequency (last rows update) | License |
|---|---|---|---|---|---|
| MOHCD Affordable Housing Pipeline | MOHCD | [aaxw-2cb8](https://data.sf.gov/d/aaxw-2cb8) | Affordable projects by stage, AMI band, population served, milestone dates | Quarterly (2026-05-21; as-of date unclear) | ODC PDDL |
| MOHCD Affordable Housing Portfolio | MOHCD | [pyxv-n29e](https://data.sf.gov/d/pyxv-n29e) | Existing affordable buildings, unit mix, senior/family/homeless units; no AMI, no block/lot | Quarterly (2026-05-21) | Not stated |
| Non-Unit Inclusionary Alternatives | MOHCD | [g6kh-9pnv](https://data.sf.gov/d/g6kh-9pnv) | How projects met §415 (fee, land, off-site); no dollar amounts | As needed (2026-05-21) | Not stated |
| SF Development Pipeline (2026 Q2) | Planning | [6jgi-cpb4](https://data.sf.gov/d/6jgi-cpb4) | All pipeline projects by status, BMR units by income, density bonus use | Quarterly (2026-08-28) | CC0 1.0 |
| Housing Production 2005–present | Planning | [xdht-4php](https://data.sf.gov/d/xdht-4php) | Completed net units and affordable units by income tier, neighborhood, year | Annually (2026-10-30) | Public domain |
| Planning Records – Projects | Planning | [qvu5-m3a2](https://data.sf.gov/d/qvu5-m3a2) | Decisions, unit counts, SB 35 / AB 2162 / density-bonus / HOME-SF flags, change of use | Daily–hourly (2026-11-04) | Public domain |
| Building Permits (and filed-since-2013 and deduplicated views) | DBI | [i98e-djp9](https://data.sf.gov/d/i98e-djp9); [p4e4-a5a7](https://data.sf.gov/d/p4e4-a5a7); [f2jc-ivnc](https://data.sf.gov/d/f2jc-ivnc) | Permit milestones, first construction document, stale activity, solar/heat-pump text | Daily (2026-11-04) | ODC PDDL |
| PermitSF Permitting Data | Permit Center | [tyz3-vt28](https://data.sf.gov/d/tyz3-vt28) | Permits in the new system since Feb 2026 (minor types as of Sept 2026) | Several times daily (2026-11-04) | ODC PDDL |
| Dwelling Unit Completion Counts | DBI | [j67f-aayr](https://data.sf.gov/d/j67f-aayr) | Preliminary units certified for occupancy since 2018 | Monthly (2026-11-03) | Not recorded |
| Rent Board Housing Inventory | Rent Board | [gdc7-dmcn](https://data.sf.gov/d/gdc7-dmcn) | Banded rents, occupancy, unit size by block and neighborhood (self-reported) | Daily (2026-11-04) | ODC PDDL |
| Annual Allowable Rent Increase | Rent Board | [hsxb-ci7b](https://data.sf.gov/d/hsxb-ci7b) | Yearly allowable increase for rent-controlled units | Annual (2026-05-01) | Not recorded |
| GO Bonds Program Spending and Status | Controller | [m793-kis4](https://data.sf.gov/d/m793-kis4) | Issued, spent and remaining by bond component (2015/2019/2024 housing) | Annual (2026-04-25) | Not recorded |
| GO Bond Projects | Controller | [d3dc-v5yr](https://data.sf.gov/d/d3dc-v5yr) | Project names by bond component; no IDs or block/lot | Annual (2026-04-24) | Not recorded |
| Housing Element APR tables (A, A2, C–K) | CA HCD | [data.ca.gov APR package](https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year) | Applications, entitlements, permits, completions by income; SB 35 use; joins on SF PRJ numbers | Annual (package modified 2026-10-30) | Not specified |
| RHNA Progress Report (6th cycle) | CA HCD | [data.ca.gov rhna-progress-report](https://data.ca.gov/dataset/rhna-progress-report) | Permitted units vs RHNA by income | Annual (2026-10-30) | Other (Public Domain) |
| Assessor Secured Property Tax Rolls | Assessor-Recorder | [wv5m-vpq2](https://data.sf.gov/d/wv5m-vpq2) | Year built, units, use, value ratio, exemptions (rent-control and underuse screening) | Annual (2026-06-26; data through roll year 2025) | ODC PDDL |
| Parcels – Active and Retired | DataSF | [acdm-wktn](https://data.sf.gov/d/acdm-wktn) | Parcel geometry for every join | Daily (2026-11-04) | ODC PDDL |
| Zoning Districts; Height and Bulk | Planning | [3i4a-hu95](https://data.sf.gov/d/3i4a-hu95); [h9wh-cg3m](https://data.sf.gov/d/h9wh-cg3m) | Current zoning and height limits | Quarterly (2026-11-04) | PDDL; Public domain |
| SF Land Use | Planning | [c5ge-t6pj](https://data.sf.gov/d/c5ge-t6pj) | Existing use, units and commercial sq ft per parcel (vacancy, conversion candidates) | Annually (2026-08-17) | CC0 |
| Housing Sustainability Districts | Planning | [7way-43xh](https://data.sf.gov/d/7way-43xh) | Streamlined-approval district boundaries | As needed (2026-03-03) | Public domain |
| City Facilities | City Administrator | [nc68-ngbr](https://data.sf.gov/d/nc68-ngbr) | City-owned and leased sites (excludes SFHA, OCII, City College) | Daily (2026-11-04) | ODC PDDL |
| Muni Stops; Muni Simple Routes | SFMTA | [i28k-bkz6](https://data.sf.gov/d/i28k-bkz6); [9exe-acju](https://data.sf.gov/d/9exe-acju) | Stop locations and routes for proximity | Each service sign-up, every 3–6 months (2026-04-11) | ODC PDDL |
| SFMTA GTFS | SFMTA | [dni7-qpv3](https://data.sf.gov/d/dni7-qpv3) | Schedules for headway and frequency tests | Quarterly | CC0 in catalog, but requires the SFMTA Transit Data License Agreement |
| 511 Regional GTFS (BART, Caltrain, others) | MTC | [511.org open data](https://511.org/open-data/transit) | Regional rail and bus frequency for SB 79 tiers | Ongoing; historic monthly feeds | Free with token; terms not reviewed |
| Schools (CDE-derived); SFUSD Attendance Areas | SFUSD | [7e7j-59qk](https://data.sf.gov/d/7e7j-59qk); [e6tr-sxwg](https://data.sf.gov/d/e6tr-sxwg) | School proximity and TCAC attendance-area test | As needed (2026-02-06; areas 2024-25) | PDDL; Not stated |
| Rec & Park Properties | Rec & Park | [gtr9-ntp6](https://data.sf.gov/d/gtr9-ntp6) | Park proximity | Weekly (2026-11-04) | ODC PDDL |
| Registered Business Locations | Treasurer-Tax Collector | [g8m3-pdis](https://data.sf.gov/d/g8m3-pdis) | Grocery candidates via self-reported NAICS 445110 / 445131 (no store size) | Daily (2026-11-04) | ODC PDDL |
| TCAC/HCD Opportunity Map (2026 adopted, 2027 draft) | CTCAC / HCD | [treasurer.ca.gov/ctcac/opportunity.asp](https://www.treasurer.ca.gov/ctcac/opportunity.asp) | Resource category per tract; Well-Resourced Neighborhoods; SB 79 Low Resource exemption | Annual (December) | Not recorded |
| USDA Food Access Research Atlas | USDA ERS | [ERS atlas](https://www.ers.usda.gov/data-products/food-access-research-atlas/update-and-revision-history) | Tract-level food access (2019 indicators) | Irregular (last indicators 2019) | Not recorded |
| CalEnviroScreen 5.0 | OEHHA | [OEHHA release](https://oehha.ca.gov/calenviroscreen/press-release/press-release-calenviroscreen/california-releases-calenviroscreen-50-identify-and-prioritize-pollution-burdened-communities) | Pollution burden and disadvantaged-community status by tract | Multi-year (final 2026-07-01) | Not verified |
| Air Pollutant Exposure Zone (2025) | Planning / DPH | [t65d-x6p8](https://data.sf.gov/d/t65d-x6p8) | Whether a site triggers Article 38 ventilation | 5-year cycle (2025-03-19) | Public domain |
| HAQR Priority Green Infrastructure Zones | Resilience & Capital Planning | [nn26-kuy2](https://data.sf.gov/d/nn26-kuy2) | Heat and air-quality priority areas | As needed (2024-06-20) | None listed |
| Seismic Hazard Zones | DataSF | [re79-p8j5](https://data.sf.gov/d/re79-p8j5) | Liquefaction and landslide zones | As needed (2023-10-17) | None listed |
| Soft-Story Properties | DBI | [beah-shgi](https://data.sf.gov/d/beah-shgi) | Retrofit compliance per parcel | Weekly (2026-10-07) | ODC PDDL |
| Existing Buildings Energy Performance | SF Environment | [96ck-qcfe](https://data.sf.gov/d/96ck-qcfe) | ENERGY STAR score, energy use intensity, gas use for large buildings | Monthly (2026-10-31) | ODC PDDL |
| Electrical Permits (legacy) | DBI | [ftty-kx6y](https://data.sf.gov/d/ftty-kx6y) | Solar PV and EV charger proxies by text search | Daily (2026-11-04) | ODC PDDL |
| Communitywide GHG Inventory | SF Environment | [btm4-e4ak](https://data.sf.gov/d/btm4-e4ak) | Emissions by sector, 1990–2024 | As needed (2026-10-21) | ODC PDDL |
| SOMAH project data | CPUC / DG Stats | [californiadgstats.ca.gov/charts/somah](https://www.californiadgstats.ca.gov/charts/somah) | Affordable multifamily solar projects, filterable to SF | Semiannual reports | Not recorded |
| SF-CHAMP VMT by zone | SFCTA | [catalog.data.gov](https://catalog.data.gov/dataset/vehicle-miles-traveled-estimates-from-sf-champ-2012) | VMT screening context (2012 and 2040) | Static (2012 baseline) | Not recorded |
| ACS 5-year B25070 | US Census | [Census API](https://api.census.gov/data/2024/acs/acs5/groups/B25070.json) | Share of renters paying 30% or 50%+ of income | Annual | Not recorded |
| MOHCD 2026 Income and Rent Limits | MOHCD | [sf.gov AMI guidance](https://www.sf.gov/2026-2027-area-median-income-guidance); [PDF](https://media.api.sf.gov/documents/2026_AMI-IncomeLimits-HMFA.pdf) | Eligibility and maximum rent by household size and AMI | Annual (effective 2026-06-01); PDF only | Not recorded |

**Missing from open data:**

- DAHLIA applications, rankings, waitlists and lottery odds.
- MOHCD loan commitments per project after 2016 ([ez9i-q28j](https://data.sf.gov/api/views/ez9i-q28j.json) stops in 2016).
- Our City Our Home (OCOH) spending as a downloadable dataset; it exists only as Controller data stories ([OCOH FY25](https://www.sf.gov/our-city-our-home-fund-annual-report-fy25)).
- Rent Board capital-improvement and seismic pass-through petitions.
- PG&E energization dates.
- Store size for groceries.
- A current Heat Vulnerability Index.
- Machine-readable Family Zoning Plan and SB 79 layers.

## Questions people ask, mapped to the data and rules that answer them

The two tables below list the questions that recur in the Mission Local survey, Board debates, analyst reports and the dataset research. Eviction questions are excluded. Rule texts are named by their citable instrument. Where a rule text was not retrieved in this research, the table says so.

### Policy makers

| Question | Datasets | Rule texts / documents | Caveat |
|---|---|---|---|
| How far behind on RHNA are we, by income tier? | RHNA Progress Report; APR Table A2; xdht-4php | Gov. Code §65400 (APR duty); 2022 Housing Element; [2025 Housing Inventory](https://sfplanning.org/sites/default/files/resources/2026-04/2025_Housing_Inventory.pdf) | Permits (HCD, 6–10%) vs. BLA "progress" (10–14%) differ; name the measure |
| How many approved units are stalled, and where? | 6jgi-cpb4; aaxw-2cb8; i98e-djp9; xdht-4php; qvu5-m3a2 | [Quarterly Pipeline Report](https://sfplanning.org/project/pipeline-report); MOHCD Loan Committee evaluations | Archive quarterly snapshots; null entitlement flags |
| Is the claim "10,100 affordable homes in 190 projects stalled" true? | aaxw-2cb8 (190 rows; MOHCD affordable units sum to 10,100) | — | The count matches the full MOHCD pipeline, **including ~63 projects already under construction**, so "stalled" overstates it |
| What does an affordable unit cost and who pays? | m793-kis4 (bond component spend only) | [BLA June 2026](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf) Exhibits F, O; CTCAC awards | No open per-project subsidy data after 2016 |
| Did cutting inclusionary rates and fees unlock projects? | g6kh-9pnv; qvu5-m3a2 (`inclusionary`); 6jgi-cpb4 status changes | Planning Code §415; Board File 260538; Controller 2026 Triennial Feasibility Report | Effect only measurable over coming quarters; §415 text blocked to scripted access on amlegal |
| How much of the 2019 and 2024 housing bonds has been spent? | m793-kis4; d3dc-v5yr | Bond ballot texts (Prop A 2019, Prop A 2024) | Component-level only |
| Which parcels earn TCAC amenity and opportunity points? | Opportunity Map; i28k-bkz6 + GTFS; 7e7j-59qk + e6tr-sxwg; gtr9-ntp6; g8m3-pdis; acdm-wktn | 4 CCR §10325(c)(5)(A) (CTCAC regs adopted 2025-12-10) | Confirm against the official regs; grocery size unknown |
| Which public parcels could host affordable housing? | nc68-ngbr; wv5m-vpq2 (`exemption_code`); c5ge-t6pj; gtr9-ntp6 (exclude) | Admin Code Ch. 23A; annual Surplus Property Report | Report not located; SFHA and OCII land is excluded from nc68-ngbr |
| Which parcels does SB 79 cover or temporarily exempt? | Opportunity Map (Low Resource); transit GTFS; zoning layers | Gov. Code §§65912.155–65912.162; [SF SB 79 factsheet](https://sfplanning.org/sites/default/files/documents/citywide/fzp-sb-79-compliance.pdf) | No DataSF SB 79 layer; FZP and SB 79 litigation pending |
| How often are state streamlining laws used? | qvu5-m3a2 flags; APR Table A2 `APPROVE_SB35` | SB 35/SB 423; AB 2011/AB 2243; AB 130 (PRC §21080.66) | No published SF counts; must compute |
| Where does affordable siting collide with air-quality exposure? | t65d-x6p8 + 6jgi-cpb4 + aaxw-2cb8; CalEnviroScreen 5.0 | Health Code Art. 38; Ord. 186-25 | Ord. 186-25 effective date unconfirmed |
| When must affordable renovations go all-electric? | i98e-djp9 (permit dates); 96ck-qcfe | Building Code §106A.1.17.1; Ord. 174-25 | Exemption ends 2027-07-01; cost exception to 2031 |
| Has SF completed HCD's required actions? | — | [HCD Policy & Practice Review](https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/plan-report/sf-housing-policy-and-practice-review.pdf); [sfplanning.org/ppr](https://sfplanning.org/ppr) | Tracker last updated Sept 2025 |
| Where does 2020 Prop I transfer-tax money go? | — (no dataset) | Prop I (2020) text; Nov 2026 Prop I text | General tax, no legal earmark unless the 2026 Prop I passed |

### Residents

| Question | Datasets | Rule texts / documents | Caveat |
|---|---|---|---|
| Do I qualify, and what is the maximum rent at 50% or 80% AMI for my household? | MOHCD 2026 Income and Rent Limits (PDF) | MOHCD income/rent limit rules; Inclusionary Monitoring and Procedures Manual ([7.25.24](https://sfplanning.org/sites/default/files/documents/legis/inclusionary-affordable-requirements/Inclusionary_Affordable_Housing_Monitoring_and_Procedures_Manual_7.25.24.pdf)) | Eligibility is set per listing |
| What affordable buildings exist near me, for seniors or families? | pyxv-n29e; aaxw-2cb8 | — | Portfolio lacks AMI levels; license not stated |
| How do lotteries and preferences work, and what are my odds? | — (no open data) | [MOHCD lottery rules](https://www.sf.gov/information--learn-how-mohcd-runs-affordable-housing-lotteries); DAHLIA listings | Odds cannot be answered from open data |
| How much can my rent go up this year? | hsxb-ci7b | Admin Code Ch. 37 ([Rent Board PDF, amended 2026-06-29](https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf)) | 60% of CPI-U; 1.6% for 2026-27 |
| Is my unit rent-controlled, under AB 1482 only, or neither? | wv5m-vpq2 (`year_property_built`, units, use); gdc7-dmcn | Admin Code Ch. 37; AB 1482 | Coverage depends on facts the data cannot confirm (e.g., ownership type) |
| Can my landlord pass through seismic or capital-improvement costs? | beah-shgi | Rent Ordinance §37.3(a)(3), §37.8B; Rent Board Rules 7.10–7.17; Jan 2026 rule amendments | Current seismic amortization rule unconfirmed |
| Could my building be demolished under the new zoning? | 3i4a-hu95; h9wh-cg3m; gdc7-dmcn; wv5m-vpq2 | Family Zoning Plan ordinance (Melgar 3+ rent-controlled-unit protection); SB 79 | FZP text not retrieved as structured data |
| What is the new project on my block, and when will it open? | 6jgi-cpb4; aaxw-2cb8; i98e-djp9 | — | Estimated dates often stale |
| What do 2-bedrooms typically rent for in my neighborhood? | gdc7-dmcn | — | Self-reported, banded, many blanks |
| What share of my neighbors are rent-burdened? | ACS B25070 | — | Tract-level query not yet tested |
| Will electrification raise my utility bill? | 96ck-qcfe (large buildings) | Ord. 174-25; CARE/FERA; CleanPowerSF SuperGreen Saver; SFHA utility allowances | No SF data on post-electrification bills |
| Is the air near my building polluted, or my building seismically at risk? | t65d-x6p8; CalEnviroScreen 5.0; re79-p8j5; beah-shgi | Health Code Art. 38 | APEZ applies to new development, not existing tenants |
| What did Props C and I on the Nov 2026 ballot do, and did they pass? | — | Measure texts; [SF election results](https://www.sf.gov/november-3-2026-consolidated-general-election) | Results pending; certification due Dec 3, 2026 |

## Claims that are unverified, conflicting, or from search summaries only

This section is the required separate list. Keep these out of answers unless they carry the label shown in the Status column.

| Claim | Source | Status |
|---|---|---|
| ~75,000 homes approved, only 3,300 under construction, 20,000+ stalled in permitting; goal of 80,000 homes in five years | D8 candidate Darshini Patel, [Mission Local](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/) | **Candidate claim.** The 75,000 and 3,300 figures roughly match Planning's 75,853 and 3,301, but those are *pipeline* units, not "approved." The 20,000 figure is unverified. |
| 10,100 affordable homes in 190 projects stalled by a $25.1B gap | D8 candidate Michael Nguyen, Mission Local | **Candidate claim.** The count matches aaxw-2cb8 totals (researcher query), which include projects under construction. The $25.1B figure is unverified. |
| More than 12,000 affordable homes "waiting for funding"; bond funds exhausted by FY2028-29 | CCHO via [48 Hills](https://48hills.org/2026/09/sf-is-about-to-run-out-of-affordable-housing-money-unless-props-i-and-c-pass/) | **Advocacy claim** citing a MOHCD projection that was not seen directly |
| Wiener's laws cut SF approval times by 80% | Sen. Wiener, Mission Local | **Official's claim**, unverified |
| CEQA appeals blocked or delayed 2,000+ units | Sup. Mahmood, Mission Local | **Official's claim**, unverified |
| Fees, taxes and delays make SF projects ~25% costlier than other major cities | Sup. Sherrill, Mission Local | **Official's claim**, unverified |
| Evictions at a 10-year high | Sup. Fielder, Mission Local | **Official's claim**; Rent Board counts not checked |
| Affordable Housing Credit Improvement Act "recently enacted," ~1.6M homes nationally | Rep. Mullin, Mission Local | **Official's claim**, unverified |
| Two-stairwell rule blocks family units on narrow lots | Candidate Gary McCoy, Mission Local | **Candidate claim** |
| E was placed to sink D (2022) | GrowSF; Wiener | **Partisan framing**; no neutral post-mortem |
| Family Zoning Plan projected to yield ~14,600 units over 20 years | City economist via SF Standard/KQED | **Search summary only** (repeated by candidates) |
| ~20,000 rent-controlled units still exposed to demolition | Sup. Chan via KTVU | **Search summary only** |
| Inclusionary cut "from 15% to 5%" | [GrowSF](https://growsf.org/voter-guide/san-francisco-voter-guide-november-2026-election/measures/prop-c/) | **Conflict:** the BLA shows prior rates of 12–18% depending on size and timing; the Examiner says rates were due to rise to 18–20% on Nov 1, 2026 |
| Ordinance number 136-26 and Aug 22, 2026 effective date | SF Planning page | **Search summary** for the ordinance number; the effective date is also on the Planning program page |
| Controller 2026 Triennial Feasibility Report findings | Controller PDF | **Search summary**; full report not read (findings corroborated by BLA and SF Examiner) |
| RHNA progress 12% overall (14/14/10/10%) vs. 6–10% by tier | BLA vs. HCD RHNA Progress Report | **Conflict** in measurement basis (BLA "progress" vs. HCD permits) |
| RHNA 82,069 vs. 82,062; deadline "by 2030" vs. 2031 | Planning/BLA vs. KQED, Mission Local | **Conflict** (minor; 82,069 and 2031 per official sources) |
| Pipeline 75,853 (new units) vs. 72,593 (net) vs. "more than 37,000" vs. 56,123 approved without permits | Planning PDF; DataSF query; The Frisc; undated HUD draft | **Conflict** in definitions; HUD draft is snippet-only and undated |
| Affordable pipeline 10,148 (MOHCD/OCII) vs. 17,960 (Planning, broader) vs. 18,536 (Planning Q2) | BLA; Planning | **Conflict** in definitions |
| Affordable units produced in 2025: ~1,218 vs. ~1,750 | BLA Exhibit C (read from chart) vs. MOHCD via The Frisc | **Conflict**; the BLA value was read off a chart |
| ~2,000 affordable homes under construction | MOHCD director, called "a general estimation" | **Official estimate** |
| Net units added in 2025: 2,669 (26% below 10-year average) | Unretrieved 2026 analysis | **Search summary only** |
| One-bedroom rent $3,164 (Jan 2026) vs. median $3,879 | BLA vs. Apartment List via Mission Local | **Different series and dates**, not reconciled |
| 20,000+ approved megaproject units stalled; Parkmerced causes | SF Chronicle, SFGate via Planetizen | **Search summary/secondary** (paywalled) |
| Hunters Point mortgage halts; failed Chinese financing | ABC7; CBS SF | **Dates not verified** |
| Pier 70 restart terms (30%→20% affordable, $50M write-off) | Locunity meeting summary | **Third-party summary**; check the Port agenda |
| Parcel-map appeal paused a 2026 affordable project; a stalled project converted to 425 affordable units | SF Chronicle | **Search summary only**; project names not retrieved |
| 3333 Mission appeal rejected (Feb 2026) | Unconfirmed URL | **Search summary only** |
| $202M GO bond allocation to MOHCD (Sept 2026) | SF Bay Area Times | **Secondary** |
| Right to counsel funds only ~2,500 cases | SF Public Press | **Search summary**; date unverified |
| TCAC amenity distances and 15-point cap | gocodebook mirror; Assembly analysis | **Third-party mirror**; confirm against official CTCAC regs, including the measurement method |
| "Major transit stop" definition (PRC §21064.3) | Not retrieved (leginfo HTTP 403) | **Unverified**; do not state without the statute text |
| Reuse saves 4–46%; new build has 13× the embodied carbon | Greenest Building; NYSERDA | **Search summary only** |
| CALGreen 45%-reuse embodied-carbon pathway | RMI toolkit | **Search summary**; applicability unverified |
| ~300 conversion units in pipeline vs. "8 projects / 825 units" | ABC7 vs. RentCafe via Axios | **Conflict** (city vs. metro); Axios page not loaded |
| Adaptive-reuse program ordinance 159-23 vs. 122-23 | SF Planning page | **Conflict** within one source |
| Small Sites scale: 47 bldgs/368 units vs. 35/290 vs. 69/843 | sf.gov; MEDA | **Conflict**; undated snippets |
| BayREN multifamily rebates available vs. enrollment paused | BayREN vs. Marin County | **Conflict** |
| Seismic pass-through cap of 10% of base rent; amortization period | sf.gov; Rent Board archive | **Search summary**; Jan 2026 amendments' effect unconfirmed |
| Soft-story 98% compliance / 4,802 buildings | Earlier ESIP page (now 404) | **Superseded** by current DataSF: 95.2% of 4,958 |
| Ord. 186-25 (Article 38) effective date | sfbos PDF snippet | **Unverified** |
| SF ED visits in 2006 heat wave rose more than almost anywhere | CDC page | **Search summary only** |
| DAHLIA licensed GPL-3.0; veteran-priority and COP lottery outcomes | Search summaries | **Unverified** |
| MOHCD pipeline as-of date (text says 2023-09-30; rows updated 2026-05-21) | aaxw-2cb8 metadata | **Internal conflict** |
| Assessor roll covers through 2024 (description) vs. roll year 2025 in data | wv5m-vpq2 | **Internal conflict**; data are newer |
| Nov 3, 2026 results for Props B, C, I | — | **Unknown** at research time |
| HCD final substantial-compliance determination on the FZP; status of FZP and SB 79 lawsuits | — | **Unknown** |

## Conclusion

Two findings change how PolicyHuis should be built. First, SF's affordable-housing debate is now mostly about **numbers that disagree for definitional reasons**: permits versus completions, new versus net units, MOHCD versus Planning pipelines, and the 2026 versus 2027 opportunity maps. Most candidate claims turn out to be real dataset totals with a misleading label. The 10,100-unit "stalled" figure is the clearest example: it reproduces exactly from aaxw-2cb8, but it counts projects that are already under construction. That means the tool's highest-value feature is not retrieval. It is **attaching the definition, the dataset version and the speaker type to every figure**, which neither the city's dashboards nor news coverage currently do.

Second, the questions that matter most in late 2026 sit at the edges of open data. Whether the funding measures passed, whether the 5% inclusionary rate unlocks projects, and when stalled megaprojects move are all *change-over-time* questions. They require archiving quarterly pipeline snapshots and versioning rule texts (Board File 260538, Ord. 174-25's 2027 sunset, SB 79 exemptions ending in 2032, the yearly opportunity map). Several of the hardest resident questions, including lottery odds, pass-through totals and post-electrification bills, have no open data at all, and the honest answer for those is a cited "not published" plus the agency to ask. A tool that keeps snapshots, cites versions and openly marks these gaps would give a supervisor and a tenant the same checkable picture, which nothing in SF does today.
