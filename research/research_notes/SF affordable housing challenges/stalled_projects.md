# Stalled and Delayed San Francisco Housing Projects: Causes, Aggregate Figures and Tracking Data

Research date: 2026-11-04. Notes on method:
- Figures labeled **"[DataSF query, 2026-11-04]"** were computed by this researcher from the live DataSF SODA API (`https://data.sf.gov/resource/<id>.json`) and metadata endpoint (`https://data.sf.gov/api/views/<id>.json`). They are reproducible but are not published by the city.
- Several San Francisco Chronicle and SFGate articles returned paywall or load errors. Claims from them come only from search-result summaries or secondary write-ups and are flagged **[secondary/unverified]**.

## 1. How many SF units are entitled but not built, and how has that changed?

### Takeaway
As of the 2026 Q2 SF Planning pipeline report (projects as of April 2026), the city's pipeline holds 75,853 new units, but only 3,301 (4%) are under construction. About half (37,577) are in major multi-phase development agreements. Entitled projects whose permits have not yet been filed rose from 448 units to 9,477 units over roughly five years to mid-2026 (The Frisc, citing Planning). Completions have collapsed: 405 units in the first half of 2026.

### Cited Findings
- **2026 Q2 Housing Development Pipeline (projects as of April 2026):** 75,853 total new pipeline units; 18,536 affordable (24%). By stage: under construction 3,301 (4%); site building permit issued 1,219 (2%); building permit approved 2,422 (3%); building permit filed, entitled projects only, 7,856 (9%); applications under review 13,036 (19%); major multi-phased projects 37,577 (50%). The page gives no single "entitled" total. — [SF Planning, Pipeline Report page](https://sfplanning.org/project/pipeline-report); report PDF: [Housing_Production_Development_Pipeline-2026Q2.pdf](https://sfplanning.org/sites/default/files/documents/reports/Housing_Production_Development_Pipeline-2026Q2.pdf)
- **Implied entitled-but-not-under-construction (2026 Q2):** the Planning-approved stages (BP filed for entitled projects 7,856 + BP approved 2,422 + BP issued 1,219) total 11,497 units, plus an unknown entitled share of the 37,577 multi-phase units. This is a researcher calculation from the figures above; the remaining planning-approved, no-permit-filed bucket is not broken out on the page. — [SF Planning](https://sfplanning.org/project/pipeline-report)
- **DataSF snapshot (Development Pipeline 2026 Q2, dataset `6jgi-cpb4`), net pipeline units by `current_status`:** PL Approved 409 projects / 44,760 net units (11,830 affordable); PL Filed 443 / 13,569; BP Filed 367 / 7,115; BP Approved 92 / 2,414; BP Issued 114 / 1,502; Construction 486 / 3,233. Total about 72,593 net units. This differs from the report's 75,853 because the report counts *new* units and the dataset sums *net* units. **[DataSF query, 2026-11-04]** — [DataSF 6jgi-cpb4](https://data.sf.gov/d/6jgi-cpb4)
  - Caveat: the dataset's `has_approved_entitlement` flag is null for many rows, including 91 "PL Approved" projects with 35,177 units (likely the multi-phase DAs). Do not rely on that flag alone. **[DataSF query, 2026-11-04]**
- **Change over about five years (to July 2026):** entitled "permits not yet filed" units grew from 448 (about 1% of the pipeline) to 9,477 (about 25%). Under construction fell from 4,545 to about 3,300. Completions in the first half of 2026 were 405. The Frisc gives the total pipeline as "more than 37,000," which conflicts with Planning's 75,853. The likely explanation, unconfirmed, is that the dashboard excludes the multi-phase projects. — [The Frisc, 2026-07-08 (upd. 07-22)](https://thefrisc.com/sf-has-built-only-400-homes-this-year-tens-of-thousands-more-are-waiting/)
- **About 56,123 approved units in the pipeline without construction permits, 24% of them deed-restricted affordable.** This comes from an undated city draft of a HUD PRO Housing grant application (likely 2023 or 2024). — [SF Planning, Draft HUD Pro Housing application](https://sfplanning.org/sites/default/files/documents/citywide/housing-choice/Draft_HUD_Pro_Housing_Grant_FOR_PUBLIC.pdf) **[snippet only; date not verified]**
- **More than 20,000 approved units at megaprojects not started or making little progress, some approved more than a decade ago (August 2025).** Named projects: Parkmerced, Hunters Point Shipyard/Candlestick, India Basin, Schlage Lock. — [SF Chronicle, Aug 2025](https://www.sfchronicle.com/sf/article/housing-megaprojects-stalled-20812460.php) via [Planetizen summary](https://www.planetizen.com/news/2025/08/135779-20000-san-francisco-homes-stalled-construction-pipeline) **[secondary/unverified: both pages blocked fetch; from search summaries]**
- **Net units added in 2025: 2,669, which is 26% below the ten-year average.** — reported in search summaries of a 2026 analysis; underlying source not retrieved **[unverified]**. The primary source would be the SF Planning Housing Inventory or [DataSF xdht-4php](https://data.sf.gov/d/xdht-4php).
- **RHNA 2023–2031 target is 82,069 units. As of 2025 the city was about 12% of the way there** (candidate statement). — [Mission Local, 2026-11-02](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/)
- **Affordable segment (June/July 2026):** MOHCD director Daniel Adams told supervisors in June 2026 that about 2,000 affordable homes were under construction. MOHCD's spokesperson called that "a general estimation." 1,139 affordable units had first construction documents and projected 2026 completion. About 1,750 affordable homes were produced in 2025. — [The Frisc, 2026-07-08](https://thefrisc.com/sf-has-built-only-400-homes-this-year-tens-of-thousands-more-are-waiting/)
- **MOHCD Affordable Housing Pipeline (`aaxw-2cb8`, last rows update 2026-05-21), by `construction_status`:**
  - Pre-construction "(3) Design with Entitlements Approved": 78 projects / 14,098 total units
  - "(0) Multiphase before Predevelopment": 14 / 3,804
  - "(2) Predevelopment Feasibility": 10 / 1,311
  - "(1) Preliminary": 3 / 289
  - Construction, "(4) Site Work Permit Issued": 35 / 3,071
  - Construction, "(5) First Construction Document Issued": 28 / 3,133
  - Rehab rows not shown

  **[DataSF query, 2026-11-04]** — [DataSF aaxw-2cb8](https://data.sf.gov/d/aaxw-2cb8)
- **More than 12,000 affordable homes are "in the pipeline waiting for funding"** (Council of Community Housing Organizations, citing MOHCD, September 2026). — [48 Hills, 2026-09-17](https://48hills.org/2026/09/sf-is-about-to-run-out-of-affordable-housing-money-unless-props-i-and-c-pass/). A D8 candidate cited 10,100 affordable homes across 190 pipeline projects and a $25.1B gap — [Mission Local, 2026-11-02](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/).

### Inferences
- The binding constraint has moved from approvals to financing and construction start. Entitled units grow while under-construction units shrink.
- Different sources' "pipeline" totals (37k, 56k, 72.6k net, 75.9k new) are not comparable. Any report should cite the 2026 Q2 Planning report and state which stage definition it uses.

### Gaps
- No Controller or Budget and Legislative Analyst report giving a time series of entitled-but-unbuilt units was retrieved.
- The 2025 Housing Inventory report (net units by year) was not retrieved directly.
- The pre-2026 quarterly pipeline totals (for example 2020 Q2, 2023 Q2) were not retrieved, so the "five years ago" comparison relies on The Frisc.

## 2. Specific stalled or delayed projects with documented causes

### Takeaway
The best-documented stalls are long-approved multi-phase development agreements: Parkmerced (2011), Hunters Point Shipyard/Candlestick, India Basin, Schlage Lock, and Pier 70. These are held up by infrastructure costs, financing and contamination. The 100%-affordable projects are mainly delayed by gap funding and tax-credit timing, with PG&E hookups as a documented post-construction delay. Mission Rock is a counter-example that delivered.

### Cited Findings
**Long-entitled projects still pre-construction in the MOHCD pipeline [DataSF query, 2026-11-04, [aaxw-2cb8](https://data.sf.gov/d/aaxw-2cb8)]:**
- **Parkmerced:** Phases 1A/1B (957 units), 1C/1D (545), 2 (711) and subsequent phases (3,522) all carry `entitlement_approval` = 2011-02-10 and `construction_status` = "(3) Design with Entitlements Approved", with no construction start date.
- **Schlage Lock:** 1,679 units, entitlement 2014-09-02, "(0) Multiphase Project before Predevelopment".
- **Hunters Point Shipyard Phase II / Candlestick blocks:** CP-9a South, CPS-Block 8a, Block 11A (entitled 2017–2018) have estimated starts of 2028-06-01. CPN Block 10A and CPN-Block 2a have estimated starts of 2032-06-01.
- **Other examples entitled 2015–2017 and still in "(3) Design" stage:** 475 Minna (266 units, 2015-12-10), 524 Howard (334, 2016-11-03), 5 Thomas Mellon Circle (585, 2016-11-17), 888 Tennessee (110, 2017-10-19), 2670 Geary (95, 2017-11-30).
- Several 2022-entitled projects have estimated starts that have already passed. Examples: 600 McAllister (196 units, est. start 2024-02-09) and 5250 3rd St (100, est. start 2024-06-14). Either the starts were not updated or the projects slipped. Not confirmed.

**Parkmerced**
- Maximus Real Estate Partners received approval in 2011 for 5,600 homes. — [SF Chronicle, Aug 2025](https://www.sfchronicle.com/sf/article/housing-megaprojects-stalled-20812460.php) **[secondary/unverified]**
- SFGate analysis: developers blame city delays and supply-chain issues, "but there's much more to the stalled redevelopment." — [SFGate](https://www.sfgate.com/local/article/san-francisco-parkmerced-rebuild-still-stuck-17802012.php) **[blocked; from search summary]**

**Hunters Point Shipyard / Candlestick (Lennar / FivePoint)**
- Named among stalled megaprojects; the site's contamination includes material from Navy ships irradiated in weapons tests. — [Planetizen, Aug 2025](https://www.planetizen.com/news/2025/08/135779-20000-san-francisco-homes-stalled-construction-pipeline) **[secondary]**
- Discovery of radioactive objects and expanded scope adds up to 18 months to the Navy cleanup schedule (August 2024). — [The Real Deal, 2024-08-02](https://therealdeal.com/sanfrancisco/2024/08/02/radioactivity-moves-back-cleanup-deadline-at-hunters-point)
- Fallout from falsified Tetra Tech soil samples: homeowner lawsuit against Lennar and Tetra Tech, and banks reportedly halted mortgages. — [ABC7](https://abc7news.com/post/banks-stop-offering-mortgages-for-homes-at-former-naval-shipyard-in-sf/4957576/) **[date not verified]**
- Chinese financing for the Shipyard and Candlestick fell through. — [CBS SF](https://www.cbsnews.com/sanfrancisco/news/chinese-financing-for-major-sf-housing-developments-falls-through) **[date not verified]**
- The megaprojects (Shipyard, Parkmerced, India Basin, Schlage Lock) require upfront infrastructure: streets, power lines and sewers. — [SF Chronicle, Aug 2025](https://www.sfchronicle.com/sf/article/housing-megaprojects-stalled-20812460.php) **[secondary/unverified]**

**Pier 70**
- On 2026-08-12 the Port Commission took up restarting "stalled housing" at Pier 70. The proposal would cut the affordable share from 30% to no less than 20%, write off $50M in developer costs, and add 600+ units. — [Locunity summary of Port Commission, 2026-08-12](https://www.locunity.com/commissions/port-commission/reports/fd5b379b-0dab-40ee-8502-78e9e566464b) **[third-party meeting summary; check against Port agenda]**

**Mission Rock (counter-example)**
- Delivered 537 rental units, 133 of them BMR, during the pandemic. It won a 2026 ULI Americas award, and Phase 2 design is starting. — [Locunity, 2026-08-12](https://www.locunity.com/commissions/port-commission/reports/fd5b379b-0dab-40ee-8502-78e9e566464b)

**Balboa Reservoir (about 1,100 units; BRIDGE/Avalon)**
- MOHCD's 2023 loan evaluation projected Building A completion around December 2026. It warned the schedule could slip if market conditions did not improve. A city project manager cited "cost escalation and high interest rates." — [MOHCD Loan Evaluation, LC 2023-01-20](https://www.sf.gov/sites/default/files/2023-06/Approved_3.%20Balboa%20Reservoir%20Building%20A%20Loan%20Eval%202023%20%20FINAL_LC%201-20-2023.pdf); [Ingleside Light](https://www.inglesidelight.com/balboa-reservoir-project-construction-start-date/)
- Site demolition and groundbreaking activity, with photos dated July 2025. — [Ingleside Light](https://www.inglesidelight.com/balboa-reservoir-construction-update/) **[2026 status not found]**

**HOPE SF Sunnydale**
- Block 9: MOHCD sought gap financing early so the project could enter the 2024 Round 2 CDLAC cycle. Waiting for Phase 3 infrastructure would have delayed its start by 9–12 months, raised costs and could have jeopardized tax credits. It won tax credits on 2024-12-11. — [MOHCD Sunnydale Block 9 Loan Eval, LC 2024-08-16](https://www.sf.gov/sites/default/files/2024-08/Approved%20Sunnydale_Block_9_Loan_Evaluation_final_(LC_8-16-2024).pdf); [LC 2025-01-24](https://media.api.sf.gov/documents/Approved_Sunnydale_Block_9_Loan_Evaluation_-_LC_1-24-25.pdf)
- Block 7: won tax credits in the 2024 Round 2 CDLAC cycle (2024-12-11). — [MOHCD Block 7 Loan Eval, LC 2025-02-21](https://media.api.sf.gov/documents/Approved_Sunnydale_Block_7_Loan_Evaluation_-_LC_2-21-25.pdf); [CTCAC CA-24-719](https://www.treasurer.ca.gov/sites/default/files/ctcac/CA-24-719.pdf)
- Phase 1A3 infrastructure was delayed by weather and unforeseen site conditions and needed additional gap funding. Its completion was what allowed Blocks 3A/3B (170 units) to proceed. — [MOHCD Sunnydale Infrastructure 1A3 memo](https://media.api.sf.gov/documents/Approved_Sunnydale_Infrastructure_Phase_1A3__Additional_Gap_Loan_Request_Loan__iZbEjCs.pdf)

**HOPE SF Potrero Block B**
- Not awarded tax-exempt bonds or tax credits. It was refinanced through the state California Housing Accelerator, AHSC and IIG. — [MOHCD Potrero Block B Gap Loan Eval, LC 2022-05-06](https://sfmohcd.org/sites/default/files/Documents/MOH/Loan%20Committee/Approved%20Potrero%20HOPE%20SF%20Block%20B%20Final%20Gap%20Loan%20Eval%20-%20Loan%20Committee%205-6-2022.pdf)

**1979 Mission St ("Monster in the Mission")**
- Maximus proposed 331 market-rate units in 2013. Years of community opposition followed and the plan died. Crescent Heights bought the site, and the city acquired it in November 2022 for 100% affordable housing; MOHCD issued an RFQ. — [Mission Local 2019](https://missionlocal.org/2019/02/how-to-not-build-in-san-francisco-maximus-and-the-so-called-monster-in-the-mission/); [The Real Deal 2022](https://therealdeal.com/sanfrancisco/2022/02/14/monster-in-the-mission-a-step-closer-to-becoming-affordable-housing); [SFist 2021](https://sfist.com/2021/11/02/much-maligned-monster-in-the-mission-could-be-reanimated-as-100-affordable-housing) **[2026 construction status not found]**

**PG&E hookup delays (completed buildings sitting empty)**
- The city counted about 140 projects delayed by PG&E since 2018, and the mayor cited 75 currently delayed. MOHCD said the delays added $41M in costs to at least 9 affordable developments. Mission Housing reported finished 100%-affordable units sitting empty. — [KQED](https://kqed.org/news/11943157/how-pge-adds-months-long-delays-costs-to-new-housing); [SF Examiner](https://www.sfexaminer.com/news/politics/officials-say-pge-delays-are-costing-san-francisco-millions/article_443b89fc-d813-11ee-b203-a3070d4ad98c.html); [CBS SF](https://www.cbsnews.com/amp/sanfrancisco/news/pg-e-accused-of-stalling-new-construction-projects-by-not-connecting-power); [MOHCD PG&E additional gap memo, LC 2023-03-03](https://www.sf.gov/sites/default/files/2023-06/Approved%20PG%26E%20Additional%20GAP%20Commitment%20Memo%20-%20LC%203-3-23.pdf) (2023–2024 reporting)

**Procedural appeal delay (2026)**
- Residents' appeal of a parcel map approval paused an affordable project for almost three months in early 2026, described as a "loophole" despite state streamlining. — [SF Chronicle](https://www.sfchronicle.com/sf/article/affordable-housing-project-san-francisco-21334202.php) **[blocked; project name not retrieved]**

**Conversion of a stalled market-rate project**
- A developer converted a stalled project into 425 affordable apartments. — [SF Chronicle](https://www.sfchronicle.com/realestate/article/sf-housing-affordable-apartments-20816373.php) **[blocked; address and date not retrieved]**

### Inferences
- The MOHCD pipeline's `entitlement_approval` and `estimated_actual_construction_start_date` fields directly expose the stall pattern. Dozens of projects entitled between 2011 and 2021 remain in "(3) Design".
- Two distinct stall types appear in the sources: pre-construction financing stalls and post-construction utility stalls (PG&E). They need different detection rules.

### Gaps
- No usable 2025–2026 sources were found on **Treasure Island, 5M, India Basin (specific causes), Potrero/Hunters View (2025–26 status)**. These are not documented here beyond the mentions above.
- Specific CDLAC/TCAC rejections of SF projects in 2025–2026 cycles were not retrieved.
- Contractor-failure cases were not found.

## 3. Common documented causes of stalls

### Takeaway
City-commissioned feasibility work (April 2026) found **no** common prototype financially feasible at then-current inclusionary rates, even excluding land costs. Interest rates, construction costs, fees and inclusionary requirements, gap-funding scarcity, megaproject infrastructure costs and PG&E hookups are the recurring documented causes.

### Cited Findings
- **Feasibility:** the Controller's Office and the Affordable Housing Technical Advisory Committee's triennial review (April 2026) found that none of ten prototypes (five condo, five rental) were feasible under current inclusionary rates, even excluding land. — [SF Examiner, 2026-07-15](https://www.sfexaminer.com/news/politics/supervisors-back-luries-plan-to-cut-affordable-housing-fees/article_79f74ee1-038b-402d-ac49-783873ab506e.html)
- **Interest rates:** Planning chief of staff Dan Sider said that if rates "bottomed out, those pipeline numbers might become radically more real." Chief economist Ted Egan does not expect rates to fall much in the next 18 months (as of July 2026). — [The Frisc, 2026-07-08](https://thefrisc.com/sf-has-built-only-400-homes-this-year-tens-of-thousands-more-are-waiting/)
- **Fees, taxes and delays:** Sup. Stephen Sherrill says they can make an SF project 25% more expensive than in other major cities. — [Mission Local, 2026-11-02](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/)
- **Construction cost:** Proposed 100%-affordable projects ran about $1.02M–$1.17M per unit in 2022 applications (Stanyan, Irving). — [The Real Deal, 2022-09-28](https://therealdeal.com/sanfrancisco/2022/09/28/affordable-housing-in-sf-can-cost-up-to-1-2m-per-unit). A Chronicle piece of 2025-12-17, reposted by the Terner Center, reported about $1M per unit and developer claims of $350K. — [Terner Center repost](https://ternercenter.berkeley.edu/news/the-san-francisco-chronicle-it-costs-1m-to-build-an-s-f-affordable-housing-unit-how-developers-say-they-can-do-it-for-350k/)
- **Local gap funding:** MOHCD capacity is about $330M for 20 projects this fiscal year, falling to about $130M for 7 projects in FY2027–28. Bond funds could run out by FY2028–29 without new revenue; the next scheduled housing bond is in 2034. Tax-credit applications need a local commitment to be competitive. — [48 Hills, 2026-09-17](https://48hills.org/2026/09/sf-is-about-to-run-out-of-affordable-housing-money-unless-props-i-and-c-pass/) (citing a MOHCD projection via CCHO)
- **Tax-credit timing:** the Sunnydale Block 9 delay risk was tied to the CDLAC cycle. — [MOHCD LC 2024-08-16](https://www.sf.gov/sites/default/files/2024-08/Approved%20Sunnydale_Block_9_Loan_Evaluation_final_(LC_8-16-2024).pdf)
- **Infrastructure for megaprojects:** upfront costs for streets, power lines and sewers. — [SF Chronicle, Aug 2025](https://www.sfchronicle.com/sf/article/housing-megaprojects-stalled-20812460.php) **[secondary]**; also cited by D10 candidate J.R. Eppler — [Mission Local, 2026-11-02](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/)
- **PG&E hookups:** waits reported of up to 18–24 months. — [Planetizen 2023](https://planetizen.com/news/2023/04/122806-california-developments-wait-months-power); [KQED](https://kqed.org/news/11943157/how-pge-adds-months-long-delays-costs-to-new-housing)
- **Approval process:** in 2023 state regulators deemed SF's process the most onerous in California. — [The Frisc, 2026-07-08](https://thefrisc.com/sf-has-built-only-400-homes-this-year-tens-of-thousands-more-are-waiting/)
- **Building code:** the two-stairwell requirement blocks family units on narrow lots (Gary McCoy, candidate). — [Mission Local, 2026-11-02](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/)

### Inferences
- The causes compound. Cost and rates make projects infeasible. Fee and inclusionary cuts address only part of that gap. For 100%-affordable projects, local gap money and tax-credit competition are the gating items, not entitlement.

### Gaps
- No primary Terner Center 2025–2026 SF cost study was retrieved.
- No source quantifying entitlement *expirations* in SF was found.
- No count of CEQA lawsuits against SF housing in 2024–2026 was found.

## 4. Policy responses

### Takeaway
SF's main 2026 response is Board File 260538, signed by Mayor Lurie and effective 2026-08-22. It cuts on-site inclusionary to 5% for 25+ unit projects, exempts 10–24 unit projects, cuts Article 4 impact fees by 67%, allows fee deferral, and lets unbuilt "Pipeline Projects" modify their conditions. Other responses are the Family Zoning Plan (2025), PermitSF (digital permits from February 2026), and November 2026 ballot funding measures (Props C and I).

### Cited Findings
- **Board File 260538, effective 2026-08-22:**
  - Inclusionary threshold raised to 25 units.
  - 5% on-site (8% in the Mission per the Fielder amendment); 10% off-site (15% in select areas); or a fee.
  - Article 4 fees cut 67%, excluding the affordable housing fee.
  - Up to 85% of fees deferrable until temporary certificate of occupancy.
  - "Pipeline Projects" without a First Construction Document may request modified conditions of approval.

  Sources: [SF Planning, Inclusionary Program](https://sfplanning.org/project/inclusionary-affordable-housing-program); [Legistar ordinance text, amended 2026-07-14](https://sfgov.legistar.com/View.ashx?GUID=40004122-9FEB-4E0C-A67B-2126814C08E5&ID=15691706&M=F&amp=&amp=); [Legislative digest](https://sfgov.legistar.com/View.ashx?GUID=407C581C-4886-4B06-9D80-B836D6B97910&ID=15672986&M=F&amp=&amp=); [Reuben, Junius & Rose](https://www.reubenlaw.com/category/development/); [Mondaq](https://www.mondaq.com/unitedstates/real-estate/1820810/san-franciscos-new-inclusionary-housing-rate-and-impact-fee-reductions)
- **Vote:** first vote 9–2 (Chen and Walton opposed), reported 2026-07-15. The 2023 temporary reductions (from Breed and Peskin) were set to expire 2026-11-01, after which rates would have risen to 18% and 20%. — [SF Examiner, 2026-07-15](https://www.sfexaminer.com/news/politics/supervisors-back-luries-plan-to-cut-affordable-housing-fees/article_79f74ee1-038b-402d-ac49-783873ab506e.html)
  - The Budget and Legislative Analyst projected lower fee and inclusionary revenue from the cuts, but said revenue could rise if they unstick stalled projects.
  - A separate BLA study found the 2023 incentives did not reverse the construction decline (cited by Sup. Chen).
- **2023 predecessor:** the Breed/Peskin Housing Stimulus and Fee Reform package. — [SF.gov](https://www.sf.gov/news--mayor-breed-president-peskins-housing-stimulus-and-fee-reform-plan-approved-board-supervisors)
- **Other measures:** Family Zoning Plan (passed 2025), PermitSF, office-to-housing conversion, and Prop C (Housing Trust Fund expansion) on the November 2026 ballot. Prop I (Housing Guarantee Act, social housing) and Prop B (public bank) were also on the ballot. — [Mission Local, 2026-11-02](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/); [SPUR voter guide, Prop C](https://www.spur.org/voter-guide/2026-11/sf-prop-c-housing-trust-fund)
- **Bond allocation:** a $202M GO bond allocation to MOHCD was approved in September 2026, including $107.54M from Series 2026D. — [SF Bay Area Times](https://www.sfbayareatimes.com/articles/san-francisco-go-bond-proceeds-mohcd-housing-2026) **[secondary]**
- **State:** Sen. Wiener's bill to require utility hookups within 8 weeks of permits (2023). — [The Real Deal, 2023-03-13](https://therealdeal.com/san-francisco/2023/03/13/bill-seeks-to-motivate-pge-on-timely-electricity-hookups). Wiener says his laws cut average SF approval times by 80%. — [Mission Local, 2026-11-02](https://missionlocal.org/2026/11/san-francisco-housing-affordability-plans/)

### Gaps
- November 2026 election results for Props B, C and I were not retrieved; the election was on 2026-11-03.
- No SF ordinance granting blanket entitlement *extensions* was found. The pipeline-project condition-modification process is the closest.
- The final ordinance number for File 260538 was not confirmed.

## 5. Data for tracking projects and detecting stalls

### Takeaway
Six DataSF tables, joinable on block/lot (`blklot`), Planning case number and building permit number, support a stall detector. One illustrative rule, a researcher suggestion and not a city standard: the project is Planning-entitled (`approved_date_planning` or MOHCD `entitlement_approval` is set), the age of `current_status_date` exceeds N years, and either there is no building permit with `first_construction_document_date`, or the permit's `last_permit_activity_date` is stale. For affordable projects, flag rows where `estimated_actual_construction_start_date` is in the past while `project_status` is still Pre-Construction.

### Cited Findings
All metadata below is from the `https://data.sf.gov/api/views/<id>.json` endpoint, retrieved 2026-11-04.

| Dataset | ID / URL | Publisher | Update frequency (stated) | Last rows update | License | Stall-relevant fields |
|---|---|---|---|---|---|---|
| San Francisco Development Pipeline (2026 Q2 snapshot) | [6jgi-cpb4](https://data.sf.gov/d/6jgi-cpb4) (map view k55i-dnjd) | Planning | Quarterly | 2026-08-28 | CC0 1.0 | `approved_date_planning`, `has_approved_entitlement` (often null), `current_status` (PL Filed / PL Approved / BP Filed / BP Approved / BP Issued / Construction), `current_status_date`, `case_no`, `bpa_no`, `net_pipeline_units`, `pipeline_affordable_units`, `da` (development agreement), `state_density`, `blklot`, `sponsor` |
| MOHCD Affordable Housing Pipeline | [aaxw-2cb8](https://data.sf.gov/d/aaxw-2cb8) (map d4zr-mbcm) | Mayor/MOHCD | Quarterly | 2026-05-21 (about 5.5 months old, which suggests a missed quarter) | ODC PDDL | `project_status`, `construction_status` (0–5 stage codes), `entitlement_approval`, `issuance_of_building_permit`, `issuance_of_first_construction_document`, `issuance_of_notice_to_proceed`, `estimated_actual_construction_start_date`, `estimated_construction_completion`, `planning_case_number`, `block`, `lot`, `lead_agency`, `project_lead_sponsor`, unit/AMI mix |
| Building Permits | [i98e-djp9](https://data.sf.gov/d/i98e-djp9) | DBI | Daily (data changes hourly) | 2026-11-04 | ODC PDDL | `filed_date`, `approved_date`, `issued_date`, `first_construction_document_date`, `completed_date`, `status`, `status_date`, `last_permit_activity_date`, `site_permit`, `proposed_units`, `block`, `lot`, `permit_number` |
| Building Permits filed on/after 2013-01-01 | [p4e4-a5a7](https://data.sf.gov/d/p4e4-a5a7) | DBI | Daily | 2026-11-04 | ODC PDDL | Same as above, minus `approved_date` |
| PermitSF Permitting Data (new OpenGov system, from February 2026) | [tyz3-vt28](https://data.sf.gov/d/tyz3-vt28) | Permit Center | 4x daily (metadata says hourly) | 2026-11-04 | ODC PDDL | `submitted_date`, `permit_issued_date`, `submit_to_issue_cal/_biz`, `expiration_date`, `status_detail`, `last_doc_date`, `parcel_number`, `ocii_review` |
| Planning Department Records – Projects (Accela) | [qvu5-m3a2](https://data.sf.gov/d/qvu5-m3a2) | Planning | Hourly | 2026-11-04 | Public Domain U.S. Government | `record_id`, `record_status`, `open_date`, `close_date`, `project_decision`, `project_decision_date`, `environmental_document_type/date`, `building_permits`, `number_of_units_net`, `number_of_affordable_units`, `block`, `lot` |
| Housing Production 2005–present | [xdht-4php](https://data.sf.gov/d/xdht-4php) | Planning | Annually | 2026-10-30 | Public Domain U.S. Government | `authorization_date`, `issued_date`, `first_completion_date`, `latest_completion_date`, `net_units_completed`, `bpa`, `ppts_project_id`, `blocklot` (the completion endpoint) |
| MOHCD Affordable Housing Portfolio | [pyxv-n29e](https://data.sf.gov/d/pyxv-n29e) (map k8na-jk8h) | Mayor/MOHCD | Quarterly | 2026-05-21 | **None stated** | `project_status`, `estimated_actual_construction`, `total_project_units`, `income_restricted_resid_units`, `mohcd_development_id` |

Additional cited points:
- DataSF datasets are on `data.sf.gov`. The Development Pipeline description states it combines DBI's Permit Tracking System with Planning's Project & Permit Tracking System, processed quarterly. — [6jgi-cpb4 metadata](https://data.sf.gov/api/views/6jgi-cpb4.json)
- PermitSF began rolling out digital permits in February 2026, and the PermitSF dataset covers only permits filed through it. Pre-2026 permits stay in the DBI datasets, so a full permit history needs both. — [tyz3-vt28 metadata](https://data.sf.gov/api/views/tyz3-vt28.json)
- Other related datasets:
  - Planning Department Project Application Review metrics: [d4jk-jw33](https://data.sf.gov/d/d4jk-jw33)
  - MOHCD Non-Unit Inclusionary Alternatives: [g6kh-9pnv](https://data.sf.gov/d/g6kh-9pnv)
  - Building Permits with Permit Contacts: [9itm-3rmi](https://data.sf.gov/d/9itm-3rmi) (for contractor and sponsor changes)
  - All from a DataSF catalog search, 2026-11-04.
- Report-level sources:
  - Quarterly pipeline PDFs: [SF Planning Pipeline Report](https://sfplanning.org/project/pipeline-report)
  - MOHCD quarterly affordable housing reports, e.g. [AH Report 2025 Q3–4](https://media.api.sf.gov/documents/AH_Report-2025_Q34.pdf)
  - MOHCD Loan Committee evaluations, which document schedule slips and causes per project (see the Sunnydale and Balboa links above)

### Inferences
- **Join keys:**
  - Pipeline `case_no` ↔ Planning Records `record_id`, and ↔ MOHCD `planning_case_number`
  - Pipeline `bpa_no` ↔ DBI `permit_number`, and ↔ Housing Production `bpa`
  - `blklot` / `block`+`lot` across all tables
  - Housing Production `ppts_project_id` ↔ Planning project IDs

  Not tested end-to-end.
- **Stall signals:**
  1. PL Approved with no BP filed after 2–3 years.
  2. BP issued with no `first_construction_document_date`.
  3. Construction with stale `last_permit_activity_date`.
  4. Construction complete with no `first_completion_date` in Housing Production (the PG&E-type stall).
  5. MOHCD `estimated_actual_construction_start_date` in the past while still Pre-Construction.
  6. Quarter-over-quarter regression or no change in `current_status`. This requires archiving each quarterly snapshot, because `6jgi-cpb4` holds only the current snapshot. Historical quarters exist as PDFs or prior files on the Planning site.

### Gaps
- No check was made for whether older quarterly pipeline snapshots exist as separate DataSF assets.
- The Housing Inventory report's URL and latest edition were not retrieved.
- No public dataset of PG&E energization dates was found.
- The license for MOHCD Portfolio `pyxv-n29e` is blank in the metadata.
