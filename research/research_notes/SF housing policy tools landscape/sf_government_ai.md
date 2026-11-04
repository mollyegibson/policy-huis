# San Francisco City Government Use of AI (with Housing Policy Focus), as of November 2026

Research date: 2026-11-03. Items before mid-2025 are marked "possibly outdated". "Announced" means a stated plan; "confirmed" means a deployment documented in a primary source or the city's AI inventory.

## 1. SF generative AI guidelines, AI inventory and ordinances: what is allowed and prohibited

### Takeaway
SF governs staff use of generative AI through the City Administrator / Department of Technology (DT) "San Francisco Generative AI Guidelines (2025)", dated July 7–8, 2025, and through Admin Code Chapter 22J, the AI Transparency / inventory ordinance passed December 10, 2024. The guidelines approve enterprise tools (Copilot Chat for all staff; ChatGPT Enterprise, Snowflake Cortex and Adobe for some staff), assign each tool a maximum data-classification level, require approval before staff use consumer tools, and prohibit "relying on AI to review legal or regulatory issues." That last rule matters for any code-lookup product. A formal citywide AI Policy and AI Strategy were promised "before the end of 2026". I could not confirm that either has been published.

### Cited Findings
**Guidelines (current version)**
- The guidelines cover "All City and County personnel, including employees, contractors, consultants, volunteers, and vendors working on behalf of the City" and are dated July 7, 2025 — [SF GenAI Guidelines 2025 PDF](https://media.api.sf.gov/documents/July2025-GenAI-Guidelines.pdf)
- The sf.gov page is dated July 8, 2025. Its print version reads "Last updated: September 30, 2026", which suggests a later revision, but the page lists no specific changes. I have not confirmed what changed — [sf.gov guidelines page](https://www.sf.gov/san-francisco-generative-ai-guidelines); [July 2025 report page](https://www.sf.gov/reports--july-2025--san-francisco-generative-ai-guidelines)
- Top 5 rules:
  1. Staff are responsible for any content they use or share.
  2. Copilot Chat is approved for all staff. Do not put sensitive or City data into public or consumer tools.
  3. Verify all output.
  4. Disclose AI use in public-facing or sensitive work, record the tool in the 22J inventory, and notify affected people.
  5. No deepfakes.

  — [sf.gov Responsible Use of AI](https://www.sf.gov/responsible-use-of-ai-in-city-government)
- **Low-risk uses** need no disclosure. They are internal tasks done with City-procured enterprise tools, such as drafting internal emails or memos, summarizing meetings or reports, writing or debugging code, and drafting outlines — [July 2025 guidelines page](https://www.sf.gov/reports--july-2025--san-francisco-generative-ai-guidelines)
- **Medium- to high-risk uses** include public-facing or translated content, "summarizing policy-related data", and supporting decisions on services, enforcement or eligibility. The guidelines say "AI ... should never make final decisions that affect individuals or public outcomes". These uses require deep subject-matter review and must be documented through the 22J process — [same](https://www.sf.gov/reports--july-2025--san-francisco-generative-ai-guidelines)
- **Prohibited uses:**
  - relying on AI to create official City documents or make decisions without expert human review
  - images, audio or video that could be mistaken for real people, and deepfakes or impersonations
  - "Fabricating fictional survey respondents or public input"
  - "Relying on AI to review legal or regulatory issues"

  — [sf.gov guidelines page](https://www.sf.gov/san-francisco-generative-ai-guidelines)
- **Data rules by tool:**

  | Tool | Highest data level allowed |
  |---|---|
  | Copilot Chat and Snowflake | Level 4 and below |
  | ChatGPT Enterprise | Level 3 and below |
  | Tools with a Business Associate Agreement (currently Copilot Chat and Snowflake) | PHI, with department approval |
  | Public or consumer tools | No sensitive or protected data, including personal information |

  — [sf.gov guidelines page](https://www.sf.gov/san-francisco-generative-ai-guidelines)
- Using public or consumer GenAI tools for City business is "strongly discouraged" and needs prior departmental approval — [July 2025 guidelines page](https://www.sf.gov/reports--july-2025--san-francisco-generative-ai-guidelines)
- The guidelines include a disclosure notice template: "This content was generated with the assistance of [Tool Name, Version] and reviewed by City staff". They also require AI output to be cited like an external source — [Guidelines PDF](https://media.api.sf.gov/documents/July2025-GenAI-Guidelines.pdf)
- The guidelines PDF cites the City's Data Classification Standard (2021) and Data Management Policy (2021), and gives ai@sfgov.org as the contact — [Guidelines PDF](https://media.api.sf.gov/documents/July2025-GenAI-Guidelines.pdf)
- The first citywide guidelines came out in late 2023 (possibly outdated, since superseded) — [sf.gov Dec 2023 guidelines](https://www.sf.gov/reports--december-2023--san-francisco-generative-ai-guidelines); [Epstein Becker Green summary](https://www.ebglaw.com/workforce-bulletin/san-francisco-releases-generative-ai-guidelines-for-city-workers)
- The city's AI page names Copilot Chat as approved. It mentions Copilot 365, ChatGPT, Gemini and Claude only in "greener use" tips, not as approved tools. SF belongs to the GovAI Coalition — [sf.gov Responsible Use of AI](https://www.sf.gov/responsible-use-of-ai-in-city-government)

**Chapter 22J (AI inventory ordinance)**
- The Board passed Ordinance 288-24 (File No. 241022) on December 10, 2024, adding Chapter 22J. It requires a public inventory of AI the City uses — [Ordinance 288-24](https://www.sfbos.org/sites/default/files/o0288-24.pdf); [Legistar text](https://sfgov.legistar.com/View.ashx?GUID=61286217-B920-4C2E-963C-7693278BDB66&ID=13565270&M=F&amp=&amp=)
- Each department must submit its AI inventory annually. The dataset is published on DataSF as "San Francisco AI Use Inventory (Chapter 22J)" — [data.sf.gov dataset](https://data.sf.gov/City-Management-and-Ethics/San-Francisco-AI-Use-Inventory-Chapter-22J-/9tj4-z32q/data); [data.gov mirror](https://catalog.data.gov/dataset/san-francisco-ai-use-inventory-chapter-22j)
- **Inventory contents, from the dataset API pulled 2026-11-03** — [API](https://data.sf.gov/resource/9tj4-z32q.json):
  - 52 entries from 11 department codes: DPH 16, SFPUC 16, POL 8, DEM 4, HSA 2, and one each for ADM, CII (OCII staff), ADM-DDS, ASR, ADM-311 and HSH.
  - Data-as-of dates run from July 2, 2025 to July 27, 2026. The latest load was August 6, 2026.
  - There are no entries from Planning, DBI, MOHCD, the Rent Board, the Board of Supervisors / BLA, the Controller, the Department of the Environment or DT.
- **Housing-adjacent inventory entries:**
  - OCII lists "Microsoft Copilot" (Copilot Chat and Copilot for Office 365) for note-taking in Teams meetings and business workflows.
  - HSH lists Polimorphic, an AI phone and text assistant about the Large Vehicle (RV) ordinance.
  - ADM lists OpenAI ChatGPT used by select staff "on a trial basis".
  - ADM-311 lists the SF311 app (Connected Bits), which uses machine learning to suggest service categories; about 60% of users pick a suggested category.

  — [API](https://data.sf.gov/resource/9tj4-z32q.json)
- Reporting is incomplete. The Voice of SF (March 10, 2026, updated June 9, 2026) found only 8 of 50+ departments had reported, and none from Public Works, Planning or Building Inspection. It reported that the CIO "has no authority to compel reporting". It also said tools used "solely for internal administration" (such as Copilot) appear exempt from disclosure — [The Voice of SF](https://thevoicesf.org/san-franciscos-secret-ai/)

**Forthcoming policy (announced, not confirmed)**
- COIT's FY2026–27 ICT Plan Update (April 2026) says that before the end of 2026 the City will:
  - publish a citywide AI Strategy
  - "align on an AI Policy that identifies actionable safeguards and clear requirements for departments"
  - launch "a beta citywide AI Workspace, a secure, centralized workspace with pre-approved models"
  - run an Emerging Technologies Experimentation Framework with GovOps

  It also names the NIST AI Risk Management Framework as a 2027 benchmark and plans "guidance for working with AI agents" — [COIT ICT Plan Update, April 2026](https://media.api.sf.gov/documents/COIT_2026_ICT_Plan_Update_April_2026.pdf)

### Inferences
- The ban on "relying on AI to review legal or regulatory issues" and the medium/high-risk label for "summarizing policy-related data" mean an AI tool for Planning Code, Rent Ordinance or housing-data analysis would be treated as medium- to high-risk. It would need expert human review, a 22J inventory entry and disclosure. A tool framed as research support with citations, not legal determination, would fit the rules better.
- Per-tool data levels mean a new vendor tool would need its own classification approval. Until then, staff could not enter non-public City data into it.

### Gaps
- I could not find the text of the guidelines version marked "Last updated: September 30, 2026" or its change log.
- I could not confirm whether the citywide AI Strategy, AI Policy or AI Workspace promised for end of 2026 has been published or launched.
- One search result described an October 15 AI-oversight bill (AI impact assessments, procurement standards) attributed to "Supervisor Ronan". I could not open the source (HTTP 403), and Hillary Ronen left the Board in January 2025, so the year and sponsor are unverified. Treat it as unconfirmed — [citizenportal.ai (unverified)](https://citizenportal.ai/articles/6596027/California/San-Francisco-County/Supervisors-introduce-zoo-audit-windowpermit-changes-Proposition-6-resolution-and-AI-oversight-bill)

## 2. Enterprise AI rollouts to staff (Copilot, ChatGPT Enterprise, Gemini), 2024–2026

### Takeaway
**Confirmed:** Microsoft 365 Copilot Chat was rolled out to about 30,000 city employees in July 2025 under Mayor Lurie. It runs on GPT-4o in Microsoft's Government Community Cloud, at no added license cost. It followed a six-month ChatGPT pilot (roughly September 2024 to February 2025) with 2,000+ staff. Some staff also hold ChatGPT Enterprise licenses (DT funded 250), but they need departmental approval. I found no Gemini or Claude enterprise deployment. Reported adoption is uneven.

### Cited Findings
- **Copilot rollout (July 14, 2025):** Copilot Chat went to nearly 30,000 employees as "the first phase" of a citywide launch, under the existing Microsoft license at no extra cost. It runs on GPT-4o in "a secure Microsoft Government Community Cloud platform". It has a business associate agreement covering PHI and PII and passed the city's cybersecurity assessments — [sf.gov Mayor Lurie press release](https://www.sf.gov/news-mayor-lurie-brings-ai-technology-to-san-francisco-government-cementing-city-as-global-ai-leader)
- **Pilot and training:** In the pilot, 2,000+ employees reported gains of up to 5 hours a week. Top uses were email help, project planning, and research and summarization. 3,000+ employees were trained between September 2024 and February 2025. DT ran a five-week Copilot training campaign with Microsoft and partnered with InnovateUS — [sf.gov press release](https://www.sf.gov/news-mayor-lurie-brings-ai-technology-to-san-francisco-government-cementing-city-as-global-ai-leader)
- **News coverage of the rollout:** [CNBC](https://www.cnbc.com/2025/07/14/san-francisco-ai.html); [GovTech](https://www.govtech.com/artificial-intelligence/san-francisco-gives-thousands-of-city-staffers-ai-access); [Smart Cities Dive](https://www.smartcitiesdive.com/news/microsoft-copilot-just-got-its-biggest-u-s-city-client-yet-san-francisco/757205/)
- **ChatGPT pilot details:** The pilot ended in February 2025 and offered unlimited ChatGPT licenses. OpenAI hosted 8 trainings with 3,000+ attendees. The GenAI User Group on Teams has 3,300+ members. In a survey of 554 participants, 70% reported saving up to 5 hours a week. "DT has found sufficient funding for 250 ChatGPT Enterprise licenses ... DT will also procure 300 licenses for Microsoft Copilot" (full M365 Copilot, a 5-month trial). Source date: June 2025, possibly outdated — [Civil Grand Jury, "Techs in the City" (June 2025)](https://media.api.sf.gov/documents/2025_CGJ_Report_AI_Techs_in_the_City.pdf)
- **ChatGPT access in 2026:** The Chronicle reports that some employees still have ChatGPT access with special departmental approval. Between July 2025 and April 2026, usage of AI access hovered around half of employees. More than 40 departments have had access. White-collar departments (lawyers, political staffers, administrators) had the highest use, police and fire the lowest. The Department of Police Accountability had the highest Copilot use rate among major departments. These are search snippets; the full article was paywalled — [SF Chronicle, "San Francisco government adoption of AI is all over the place" (2026)](https://www.sfchronicle.com/sf/article/ai-city-worker-san-francisco-22326139.php)
- **OpenAI and Lurie (June 2026):** At a June 18 City Hall meeting, Lurie pitched OpenAI on a larger civic role, and OpenAI indicated "no immediate plans" to adopt it. Snippet only (paywalled) — [SF Chronicle exclusive](https://www.sfchronicle.com/sf/article/openai-daniel-lurie-initiative-22364516.php)
- **Civil Grand Jury (June 2025):** The jury urged leaders to give staff AI tools and criticized the focus on guardrails. Recommendation R1.3 asked DT for a license demand and funding plan by December 31, 2025 — [sf.gov press release](https://www.sf.gov/news-mayor-lurie-brings-ai-technology-to-san-francisco-government-cementing-city-as-global-ai-leader); [City consolidated responses](https://media.api.sf.gov/documents/AI_Consolidated_Responses.pdf)
- **Snowflake Cortex and Adobe** are named as procured enterprise GenAI tools — [sf.gov guidelines](https://www.sf.gov/san-francisco-generative-ai-guidelines)

### Inferences
- Copilot Chat is the default tool for SF staff, so any new tool competes with a free, approved incumbent already cleared for Level 4 data.
- Self-reported adoption is uneven. Usage is highest in lawyer-heavy and administrative offices, which overlap with legislative and policy staff.

### Gaps
- I found no evidence of Google Gemini or Anthropic Claude enterprise licenses for SF staff, beyond the anecdotal individual use by a supervisor noted in section 4.
- I could not confirm an exact 2026 Copilot active-user share or whether the "first phase" was followed by a full M365 Copilot expansion.

## 3. Housing and planning AI tools: permitting, sf.gov and 311 chatbots, Planning, Rent Board, MOHCD

### Takeaway
I found **no confirmed AI tool** at Planning, DBI, the Rent Board or MOHCD for plan review, code questions or tenant questions. None of these departments appears in the 22J inventory. PermitSF, Mayor Lurie's permit overhaul built on an OpenGov contract, launched February 13, 2026, but none of the sources I found documents AI plan review. The city's public chatbots so far are narrow:
- a Polimorphic RV-ordinance text bot (October 2025, error-prone per Mission Local)
- AI category suggestions in the 311 app
- an Amazon Connect AI switchboard at HSA

### Cited Findings
- **PermitSF launch:** PermitSF launched February 13, 2026 with five mostly over-the-counter permit types. It fell behind a goal of 15 types by March 16 — [SF Standard (May 13, 2026)](https://sfstandard.com/2026/05/13/daniel-lurie-opengov-permitting-permitsf-san-francisco/); [SF Standard takeaways](https://sfstandard.com/2026/05/13/san-francisco-daniel-lurie-permitsf-opengov-takeaways/)
- **OpenGov contract:**
  - The $5.9M no-bid contract was criticized. A city audit found it broke no rules but didn't follow best practices — [Mission Local (June 2026)](https://missionlocal.org/2026/06/mayor-luries-permitting-contract-report/)
  - The Civil Service Commission approved it 4-1 with conditions — [SF Standard (June 18, 2026)](https://sfstandard.com/2026/06/18/lurie-opengov-permitting-software-deal/)
  - City data contradicted claims of "exceeding" goals — [SF Standard (Sept 14, 2026)](https://sfstandard.com/2026/09/14/daniel-lurie-opengov-san-francisco-liz-watty/)
  - A union objects to a proposed $6.5M, six-year expansion — [SF Chronicle](https://www.sfchronicle.com/sf/article/opengov-permitsf-permit-san-francisco-22257828.php)
  - Kickoff press release — [OpenGov / PR Newswire](https://www.prnewswire.com/news-releases/city-and-county-of-san-francisco-and-opengov-kick-off-project-to-overhaul-permitting-302584650.html)
- **Department merger:** Lurie moved to merge DBI, Planning and PermitSF into one department — [Mission Local (Jan 2026)](https://missionlocal.org/2026/01/s-f-moves-to-combine-building-inspection-planning-and-permitting-into-one-department/)
- **AI in permitting:** The July 2025 press release cited Copilot as helping permitting services under PermitSF. It also said AI was being tested to speed 311 response times and to connect people experiencing homelessness with services. These are stated plans with no named tools — [sf.gov press release](https://www.sf.gov/news-mayor-lurie-brings-ai-technology-to-san-francisco-government-cementing-city-as-global-ai-leader)
- **Civil Grand Jury on permitting (June 2025, possibly outdated):** The jury said COIT's claim that AI played a role at the Permit Center is "overstated". The Permit Center's tool is an SMS queuing system (QLess), "not an example of an innovative application of emerging technology". The jury pointed to Honolulu's CivCheck generative AI permit pilot, which cut plan review time by 70%, as a model — [CGJ report](https://media.api.sf.gov/documents/2025_CGJ_Report_AI_Techs_in_the_City.pdf)
- **COIT data priorities (April 2026):** COIT names "Permitting and Inspections: Application volume, processing time, bottlenecks" and "311 and Service Requests" as initial Unified Data Platform data domains. It plans "centralized analytics and data science capabilities with responsible AI guardrails" in 2027 — [COIT ICT Plan Update](https://media.api.sf.gov/documents/COIT_2026_ICT_Plan_Update_April_2026.pdf)
- **RV chatbot:**
  - The Mayor's Office of Innovation launched a Polimorphic chatbot for RV dwellers about the Large Vehicle ordinance. Mission Local found wrong eligibility answers, inconsistent responses and wrong dates. Polimorphic said the city is responsible for reviewing responses — [Mission Local (Oct 17, 2025)](https://missionlocal.org/2025/10/s-f-launched-an-ai-chatbot-for-rv-dwellers-its-got-errors/); [Mission Local (Sept 2025)](https://missionlocal.org/2025/09/san-franciscos-latest-answer-for-rv-dwellers-an-ai-chatbot/)
  - It is inventoried under HSH — [22J API](https://data.sf.gov/resource/9tj4-z32q.json)
- **311:**
  - The SF311 app uses machine learning to suggest service categories — [22J API](https://data.sf.gov/resource/9tj4-z32q.json)
  - An older Chronicle piece said 311 had no chatbot and had explored chatbots in 2017 and 2020 (possibly outdated) — [SF Chronicle](https://www.sfchronicle.com/sf/article/city-hall-openai-chatbot-20769227.php)
  - A 311 AI agent won a 2023 hackathon as a demo only, not deployed — [Mission Local (Nov 2023)](https://missionlocal.org/2023/11/winner-ai-for-good-hackathon-311-chatbot/)
- **HSA switchboard:** HSA inventories an Amazon Connect "AI-powered switchboard and caller assistance" — [22J API](https://data.sf.gov/resource/9tj4-z32q.json)
- **OCII** (the redevelopment successor agency, which develops affordable housing) inventories Microsoft Copilot for meeting notes and workflows — [22J API](https://data.sf.gov/resource/9tj4-z32q.json)
- **Other AI permit-review vendors:** Several private vendors market AI pre-check of DBI plans (InspectMind, Groundbook, Alliance Permitting). These are vendor pages, not city programs — [InspectMind](https://www.inspectmind.ai/plan-check-in/san-francisco-ca-permit-review); [Alliance Permitting](https://alliancepermitting.com/guides/california/san-francisco-building-permit)

### Inferences
- Housing-relevant AI in SF government is nearly absent in public records. Planning, DBI, MOHCD and the Rent Board do not appear in the 22J inventory. That could mean no use, or it could reflect the compliance gap the Voice of SF reported. Staff in those departments presumably have Copilot Chat like all city employees, but I found no documented housing-specific use.
- The RV chatbot errors and Polimorphic's reply that the city must check answers are a live precedent for skepticism about public-facing AI that answers eligibility or rules questions.

### Gaps
- I found no statement on whether OpenGov's PermitSF platform uses AI features in SF.
- I found nothing on the Rent Board, MOHCD (including the DAHLIA housing portal), the Controller's Office or the Department of the Environment using AI.
- I found no sf.gov-wide generative AI chatbot. A secondary site claimed an "AI-powered City Services Portal 2026", but I could not verify it from a primary source — [sfbayareatimes (unverified)](https://www.sfbayareatimes.com/articles/san-francisco-ai-powered-city-services-portal-2026)

## 4. Board of Supervisors offices and the Budget and Legislative Analyst: policy research tools

### Takeaway
The most concrete case of AI in SF legislative work is the City Attorney's use of Stanford RegLab's STARA statutory-research LLM tool. It identified 528 reporting requirements across the Municipal Code and 16,000 Board resolutions, and led to the omnibus code-cleanup ordinance passed 7-4 on July 14, 2026. At least one supervisor (Melgar) said she used Anthropic's Claude to understand that ordinance. I found no documented AI use by the Budget and Legislative Analyst (BLA) or institutional AI tools for supervisors' housing legislation.

### Cited Findings
- **STARA project:**
  - Stanford RegLab built STARA (Statutory Research Assistant). The SF City Attorney's Office partnered with RegLab starting in 2024.
  - STARA scanned about 16 million words of Municipal Code and about 16,000 Board resolutions, chunking each with its definitions and cross-references, and produced a searchable, cited database. Attorneys verified every output by hand.
  - It found 528 reporting requirements. The ordinance proposed removing 140, consolidating 34 and keeping 314.
  - City Attorney David Chiu introduced the ordinance in June 2025. The Planning Commission heard it.

  — [Reboot Democracy (May 19, 2026)](https://rebootdemocracy.ai/blog/sf-ai-regulatory-decluttering); see also [Daily Journal](https://dailyjournal.com/articles/385997-san-francisco-uses-ai-to-streamline-municipal-codes)
- **Board vote and Claude use:** On July 14, 2026 the Board passed the 362-page ordinance 7-4, sponsored by President Mandelman (Melgar, Chan, Fielder and Walton voted no). Clerk Angela Calvillo called the single-vote approach a "deviation". Supervisor Myrna Melgar said she used Anthropic's Claude to understand the ordinance's changes — [Mission Local (July 2026)](https://missionlocal.org/2026/07/sf-city-code-streamlining-mandelman/)
- **BLA:** The BLA is the Board's independent source of fiscal and policy analyses and audits. I found no public record of it using AI — [sf.gov Board of Supervisors](https://www.sf.gov/departments--board-supervisors)
- **Board and InnovateUS:** The Civil Grand Jury said the Board delayed for nearly six months a zero-dollar InnovateUS AI training MOU (June 2025) — [CGJ report](https://media.api.sf.gov/documents/2025_CGJ_Report_AI_Techs_in_the_City.pdf)

### Inferences
- The STARA precedent shows that SF's legal and legislative staff accept AI for code-wide statutory search, as long as every result is cited and verified by hand. The same workflow would carry over to Planning Code or Rent Ordinance research. It also shows political sensitivity when AI-assisted bulk changes reach a vote.
- Individual supervisors may use consumer AI tools informally. Melgar's Claude use was not described as a City-provisioned tool. Board offices are not in the 22J inventory.

### Gaps
- I found nothing on BLA, legislative aide or Controller use of AI, or on non-AI policy research tools for housing legislation, beyond Legistar itself.
- STARA's underlying model and whether it is used beyond the reporting-requirements project are unknown.

## 5. California state context relevant to SF

### Takeaway
State AI rules (EO N-12-23, CDT GenAI procurement guidelines, EO N-5-26, the Poppy platform) bind **state** agencies, not SF city procurement, but they set norms. In 2026 the state also gave local governments a free AI plan-check tool (Archistar) for permits. I found nothing specific on HCD's own AI use.

### Cited Findings
- **EO N-12-23 (September 2023)** set how the state evaluates and uses GenAI. EO N-5-26 (March 30, 2026) builds on it and directs:
  - DGS and CDT to recommend AI vendor certifications for state contracts (illegal content, bias, civil rights)
  - CDT to issue watermarking guidance
  - agencies to give employees vetted GenAI tools
  - a "life event" GenAI services pilot

  Most deadlines are 120 days out. It addresses state agencies and state contracting, not local government — [DLA Piper (April 2026)](https://www.dlapiper.com/en-us/insights/publications/2026/04/california-governor-issues-executive-order-on-ai-procurement-standards); [Ropes & Gray](https://www.ropesgray.com/en/insights/alerts/2026/04/newsom-signs-executive-order-establishing-ai-vendor-certification-and-procurement-framework)
- **State GenAI procurement guidelines** (GovOps, CDT, DGS, ODI, CalHR; 2024) require state entities to complete a GenAI Risk Assessment (SIMM 5305-F) and vendors to disclose GenAI components — [GovTech](https://www.govtech.com/artificial-intelligence/california-releases-generative-ai-state-procurement-guidelines)
- **Poppy:** CDT's "vendor-agnostic" GenAI platform for state departments, with multiple models compared side by side. CDT says data "remains within California's trusted environment." Access began July 1, 2026, with a 30-day free trial for up to 20 users. The alert addresses "All California State Departments" and does not mention local governments — [CDT Tech Alert TA 26-04 (June 3, 2026)](https://www.cdt.ca.gov/resources/tech-alerts/ta-26-04-poppy-californias-digital-assistant/)
- **Archistar plan check:** The Governor's office provided an Archistar AI e-check tool free to LA City and County for fire rebuilding. It checks designs against zoning and building codes with computer vision and rule sets and is now "available to any local government seeking to streamline its permitting process" — [StateScoop](https://statescoop.com/?p=70712); [LA County Archistar presentation (Jan 2026)](https://file.lacounty.gov/SDSInter/dpw/recovery/1201690_RebuildingTogether_ArchistarDRAFTPPT12226.pdf)
- **COIT and the state:** COIT's April 2026 plan says SF's Experimentation Framework is "in partnership with GovOps". It also describes a 2026 "Try Before You Buy" Experimentation Procurement Framework for limited-scope AI pilots before long-term contracts — [COIT ICT Plan Update](https://media.api.sf.gov/documents/COIT_2026_ICT_Plan_Update_April_2026.pdf)

### Inferences
- Selling an AI tool to SF is governed by SF's own procurement rules (Administrative Code, DT/COIT review, 22J inventory, data classification approval), not by state rules. The planned "Try Before You Buy" framework, if launched, would be the most likely entry point for a pilot.
- The state's free Archistar offer to all local governments is an alternative, state-backed AI plan-check option that SF could adopt.

### Gaps
- I found no HCD-specific AI policy or deployment.
- I could not confirm whether SF's Experimentation Procurement Framework has launched, or its terms.
- I did not check state laws affecting local government AI (for example, 2025–26 bills on automated decision systems).

## 6. Statements on locally hosted or open-source AI, and data sovereignty

### Takeaway
I found no public SF statement preferring locally hosted or open-source AI. SF's stated approach is cloud-first:
- vetted enterprise SaaS (Microsoft GCC, OpenAI Enterprise, Snowflake)
- a planned centralized "AI Workspace" with "pre-approved models"
- "Cloud 2030", making cloud the default for city systems

Data-protection concerns are handled through data classification levels, BAAs and bans on entering City data into consumer tools.

### Cited Findings
- **Copilot hosting:** Copilot Chat runs on "a secure Microsoft Government Community Cloud platform with enterprise-grade data protections" — [sf.gov press release](https://www.sf.gov/news-mayor-lurie-brings-ai-technology-to-san-francisco-government-cementing-city-as-global-ai-leader)
- **Cloud 2030:** Cloud 2030 "seeks to make cloud infrastructure the default foundation for city technology", including "AI workloads". Only 32% of server infrastructure had migrated as of the plan. The planned AI Workspace will offer "pre-approved models" — [COIT ICT Plan Update (April 2026)](https://media.api.sf.gov/documents/COIT_2026_ICT_Plan_Update_April_2026.pdf)
- **Consumer tools:** Staff must not enter sensitive or protected data, including personal information, into public or consumer tools, because those tools may store or reuse inputs — [sf.gov guidelines](https://www.sf.gov/san-francisco-generative-ai-guidelines)
- **Data center moratorium:** In September 2026 Supervisor Walton introduced a 45-day interim zoning moratorium on new data centers. This is land use, not city AI procurement — [Walton press release (Sept 14, 2026)](https://media.api.sf.gov/documents/2026_09_14___PRESS_RELEASE__SUPERVISOR_WALTON_INTRODUCES_INTERIM_MORATORIUM_ON_1l0OcoR.pdf); [KRON4](https://www.kron4.com/news/technology-ai/tech-centric-san-francisco-to-restrict-building-ai-data-centers/)
- **State parallel:** CDT describes Poppy as keeping data "within California's trusted environment" — [CDT TA 26-04](https://www.cdt.ca.gov/resources/tech-alerts/ta-26-04-poppy-californias-digital-assistant/)

### Inferences
- An open-source or locally hosted tool would not get a policy preference. Its case would need to rest on SF's own criteria: data classification approval, privacy, cost, and fit with the planned AI Workspace and Unified Data Platform.

### Gaps
- I found no SF official, COIT or supervisor statement on open-source models, on-premises LLM hosting or AI data sovereignty. Neither the July 2025 guidelines nor the April 2026 COIT plan addresses it.
