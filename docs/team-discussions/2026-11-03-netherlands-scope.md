# PolicyHuis: Netherlands Scope Proposal and Discussion Points

Draft, November 3, 2026. For discussion with the whole team. Final demo: November 30, 2026.

## Why this document

Two documents describe who PolicyHuis is for:

- the **project overview** (*Housing Policy AI: Project Overview and Open Questions*, October 5, 2026), including the team's answers to its open questions;
- the **market research** (*PolicyHuis Week 1 Market Map and Customer Segments*), which maps competitors and ranks ten customer segments.

The market research describes where the product could go over time: many municipalities, provinces, and public bodies as paying customers. The capstone has about four weeks until the demo. This document separates the two: the **scope of the demo**, which is much smaller, and the **evolution of the product** beyond it, which the demo should point toward. It also lists the decisions the team needs to make before data collection starts.

Everything here is a proposal for the team to discuss.

## Summary of the proposal

1. **In the Netherlands, 2–3 mid-size municipalities, not Amsterdam.** The research advises against large cities that build their own tools. Several municipalities let the demo compare peers, which the research identifies as a likely need (hypothesis H2).
2. **Policy staff as the users.** Following the market research, the demo is built for municipal staff writing and monitoring the new housing program. Whether it also serves residents is an open question.
3. **Questions and answers in English, sources in Dutch.** Every answer cites the Dutch source. Answering in Dutch is a stretch goal, with its cost described below.
4. **No model training.** The tool uses an existing open model and searches the source documents to answer. GPT-NL is a candidate model if we can get access.
5. **Free database plan, split by purpose.** Separate free database projects for legal text and for municipal data, each with its own storage limit.
6. **Climate included.** Climate risk and building energy data sit alongside the housing data, so the tool can answer where planned housing meets heat, flood or energy-performance risks.
7. **Measured, not claimed.** Answer accuracy (checked by the team), speed and energy per question are measured and compared with a commercial cloud model.

## Who the users are

The market research shows that the users with the clearest need are **Dutch municipal policy staff** writing and monitoring the new housing program (*volkshuisvestingsprogramma*), with provinces as the same kind of user one level up. The demo is built for them.

| | Policy staff (from the market research) |
|---|---|
| Who | Municipal policy staff writing the housing program, and the alderman for housing (*wethouder wonen*) who owns it |
| What the tool helps them do | Write and monitor the program, and compare it with peer municipalities and the regional housing deal (*woondeal*) |
| Topic | The housing program: how many homes, where and for whom |
| Place | Mid-size municipalities without in-house AI teams |

The project overview named a different first user: **international residents**, who want to understand tenant rights and housing policy at a high level. That raises the open question below.

## Proposed scope for the demo

**In scope**

- 2–3 mid-size Dutch municipalities, chosen by the criteria below.
- The housing program topic, for policy staff; residents' topics only if the team decides to serve both (see below).
- National law and each municipality's own regulations and policy documents, searchable, with every answer citing the document, article and version it relies on.
- A small set of municipal data (for example housing stock and planned construction) that the tool queries for numbers, so numbers come from data and not from the model.
- At least one question that compares the municipalities.
- 30–50 evaluation questions with answers checked by the team.
- A climate layer: building age, energy labels, and heat and flood risk for the chosen municipalities.
- Energy, speed and accuracy per question, compared with a commercial cloud model.

**Out of scope for the demo** (possible as the product evolves)

- Training or fine-tuning a model.
- More than 3 municipalities, national coverage, or provinces.
- Canada and the EU layer.
- Answering in Dutch (stretch goal; see [Language](#language)).
- Legal advice, and conclusions about whether a policy caused an outcome.
- Sales material, pilots and letters of intent (the business workstream's track).

## Open question: policy staff only, or residents too?

| | Policy staff only | Policy staff and residents |
|---|---|---|
| Example questions | "What must a municipality's housing program contain under the new law?" "What share of new homes did [municipality] commit to as social rent in its regional housing deal, and how does that compare with [peer]?" "What has the council decided about housing this year?" | Policy staff's questions, plus: "Who is eligible for a social-rent home in [municipality]?" "What does national law say about the maximum rent for a mid-rent home?" "How do [municipality] and [peer] allocate social housing differently?" |
| Extra sources | None | National rent law; each municipality's housing ordinance (*huisvestingsverordening*); the Huurcommissie's published guidance |
| What the tool declines | Political judgments ("is our target too low?") | Also individual legal advice ("can my landlord raise my rent?"), pointing to the Huurcommissie |
| Evaluation | One set of questions | Two sets, written and checked for two kinds of user |
| Fit with the demo timeline | Fits more easily | More sources, questions and checking in the same four weeks |
| How the product could evolve | Residents can be added later as more sources and questions | Both audiences from the start |

The tool's design is the same either way: residents mean more sources and questions, not a different system. The decision is about what fits in the demo.

A risk for the policy-staff topic: programs are due by **1 July 2027**, and the detailed content rules are expected on **1 January 2027** ([VNG](https://vng.nl/artikelen/wet-versterking-regie-volkshuisvesting), [IPLO](https://iplo.nl/regelgeving/instrumenten/programma/verplicht-programma/volkshuisvestingsprogramma/)). By November 30 few, if any, adopted programs will exist to compare, so the demo relies on the documents municipalities have today. The interviews in Weeks 3 and 4 should confirm which documents policy staff actually compare.

## Choosing the municipalities

Proposed criteria, for the team to apply:

1. **Mid-size, without an in-house AI team**, as the research recommends. The team sets the size range.
2. **In the same regional housing deal**, so the comparison is between real peers that answer to the same agreement.
3. **Council documents available through Open Council Information.** Each municipality opts in to publishing its council data, so coverage must be checked per municipality.
4. **Regulations published on [lokaleregelgeving.overheid.nl](https://lokaleregelgeving.overheid.nl/)** with version history.
5. **Recent housing documents published** (a housing vision, performance agreements, or a draft program).
6. **Reachable for interviews** through the team's network, so the demo can use questions real staff ask.

## Data sources to consider

Sources named in the market research and the project overview. Each needs its access method, reuse terms and actual format checked before it is chosen.

| Source | What it would provide | Needed for | To check |
|---|---|---|---|
| Open Council Information (*Open Raadsinformatie*), Open State Foundation with VNG | Council meeting documents from participating municipalities | Policy staff | Which municipalities participate (the research says 300+; a 2018 listing showed 108); reuse terms of the documents, which may differ from the project's open-source code license ([dataset page](https://data.openstate.eu/fr/dataset/open-raadsinformatie-api-open-council-data)); size, since only housing documents for 2–3 municipalities should be loaded |
| National law database (*Basis Wetten Bestand*, wetten.overheid.nl) | National laws with version history: the new housing law, rent law, the Housing Act (*Huisvestingswet*), the Environment and Planning Act (*Omgevingswet*) | Policy staff; residents | Open data (CC0) per the project overview |
| Local regulations (lokaleregelgeving.overheid.nl) | Each municipality's housing ordinance and related rules, with versions | Policy staff; residents | Reuse terms |
| Regional housing deals (*woondeals*) | Agreed housing targets per region and municipality | Policy staff | Where they are published and in what format (likely PDF) |
| Housing shortage figures (Volkshuisvesting Nederland) | National and regional shortage estimates | Policy staff | Format; whether figures are available per municipality |
| ABF Research data | Housing demand and stock forecasts, which provinces use today | Policy staff | Whether any of it is open; license |
| CBS StatLine | Housing stock by owner and landlord type, by municipality and neighborhood | Policy staff; residents | Open data |
| BAG (addresses and buildings) and EP-Online (energy labels) | Building age and energy labels, for the climate layer | Climate | Open data; national files filtered to the chosen municipalities |
| Klimaateffectatlas | Heat stress and flood risk maps | Climate | Format and terms |

Amsterdam-specific sources in the project overview (Amsterdam's data portal, the Woningbouwplan, Wonen in Amsterdam) drop out with Amsterdam. The Amsterdam questions in the provisional question list are replaced by questions for the chosen municipalities.

## Language

**Proposal: questions and answers in English, sources in Dutch.**

- Dutch documents are translated to English once, when they are loaded, and both versions are stored.
- Answers cite and quote the Dutch original; translations are labeled as machine translation.
- This keeps one answer language to evaluate, and English-speaking team members can check answers.

**What answering in Dutch would take**, if the team wants it:

| Area | Change |
|---|---|
| Model | The model must write good Dutch. This may or may not mean a different model: several open models handle Dutch, and GPT-NL is built for it. Which ones are good enough is tested, not assumed. |
| Search | Searching the Dutch text directly, in addition to the English translation. The database supports Dutch word stemming, so this is a configuration change rather than a new system. |
| Answers | The tool answers in the language of the question; its instructions and standard messages (such as declines) exist in both languages. |
| Evaluation | Every question is checked in both languages, which roughly doubles the checking work and needs a Dutch-speaking reviewer for legal text. |

**Question for the team:** is Dutch needed for the demo, or is it enough to show English answers with Dutch citations and name Dutch as the next step? The research's open question on this affects which documents are collected, so it should be settled before data collection starts.

## The model, including GPT-NL

The tool does **not** train a model. It uses an existing open model, which searches the loaded documents and data and answers from what it finds, with citations. This is how the tool stays accurate and current: updating a document means reloading it, not retraining.

Some terms in the market research point toward training, such as a housing-specific SLM, a training corpus, or building on GPT-NL rather than training from scratch. Training a model from scratch isn't feasible within the capstone, and isn't needed for this tool. For the demo, read "SLM" as "a small open model running on our own hardware" and "training corpus" as "the documents the tool searches".

**GPT-NL is a candidate model**, because it is built for Dutch and fits the sovereignty argument. What we know and what we need:

- GPT-NL (built by TNO, SURF and the Netherlands Forensic Institute) was in pilots with selected organizations in mid-2026 ([Computer Weekly](https://www.computerweekly.com/news/366642524/Netherlands-moves-GPT-NL-from-lab-to-live-first-pilots-under-way)). Its public training corpus is published under CC-BY ([arXiv](https://arxiv.org/abs/2604.00920)), but we found no public release of the model itself.
- To use it, we need: access to the model files to run on our own hardware, or at least an access arrangement; a license that allows this use; and a model size that runs on a 24 GB laptop.
- If it isn't available in time, the tool uses another open model that handles Dutch, and GPT-NL stays the target for later.

**Question for the team:** can anyone contact TNO or SURF about access to GPT-NL?

## Data storage on the free plan

The database runs on Neon's free plan. Checked on [neon.com/pricing](https://neon.com/pricing) on November 3, 2026:

| Resource | Free limit |
|---|---|
| Database storage | 1 GB per project |
| Projects | 100 per account, 20 GB total |
| File storage | 5 GB per project |
| Computing time | 100 hours per project per month |
| Data transfer out | 5 GB per project per month |

Because each project has its own 1 GB, the proposal is **one account, with a separate project per part of the system**:

| Project | Holds | Note |
|---|---|---|
| Legal text (Netherlands) | Laws, regulations and policy documents for the chosen municipalities, with translations and search indexes | The largest; Open Council Information documents are filtered to housing topics and the chosen municipalities before loading |
| Municipal data (Netherlands) | Housing stock, construction plans, climate data | National files are stored whole as archived files and filtered to the chosen municipalities when loaded |
| Application | Answer records, evaluation results, energy measurements | Small |

Each part of the tool reads only its own project, so a part that outgrows its 1 GB can move to its own database without changing the rest. Original source files are archived in each project's file storage, so every answer can be traced back to the exact file it came from.

The database is a managed cloud service, which sits uneasily with the sovereignty argument. For the demo it saves setup work; moving to a database on our own hardware later is an open question in the technical plan.

## Climate and energy

The market research doesn't mention climate. The proposal includes it anyway, for two reasons:

- **It makes the product stronger.** Where and how homes are built is one of the main ways housing policy affects emissions and climate risk: building in flood or heat-risk areas, reusing versus demolishing buildings, and retrofitting homes with poor energy performance. A tool that shows a housing plan next to the climate risks of the places it covers would stand apart: none of the tools in the market map is described as covering climate.
- **It is what this capstone is for.** The project is part of a climate fellowship, and the demo should show the climate side of housing policy.

What the demo includes:

- **A climate layer** for the chosen municipalities: building age and energy labels (BAG and EP-Online), and heat stress and flood risk (Klimaateffectatlas).
- **Climate questions**, for example: "Which planned housing sites in [municipality] are in areas with high flood risk or heat stress?" "How many homes in [municipality] have energy label E or worse, and how old are they?"
- **Energy per question**, measured on our hardware and compared with an estimate for a commercial cloud model, reported with its uncertainty whichever way it comes out.

**Question for the team:** can the interviews in Weeks 3 and 4 ask policy staff whether climate risk and energy performance come up in their housing program work, and which climate questions they would ask?

## Decisions needed

| # | Decision | Why it matters | Needed before |
|---|---|---|---|
| 1 | Whether the demo serves policy staff only, or residents too | Sets the sources, questions and evaluation | Data collection starts |
| 2 | Which 2–3 municipalities, using the criteria above | Sets the sources to check | Data collection starts |
| 3 | English answers with Dutch sources, or Dutch answers too | Sets the model choice, search setup and evaluation work | Model testing |
| 4 | Who contacts TNO or SURF about GPT-NL | Decides whether GPT-NL can be tested | Model testing |
| 5 | Who checks Dutch-to-English translations and grades the answers | Answer accuracy is the main measure | Evaluation |
| 6 | Adding climate questions to the interviews | Grounds the climate questions in what policy staff need | Interviews in Weeks 3 and 4 |
| 7 | Real questions from interviews for the demo and the evaluation set | Replaces our provisional questions with real ones | Evaluation |
| 8 | Who owns the source checks for the chosen municipalities | Each source needs its access, terms and format confirmed | Data collection starts |

## Sources

- Project overview: *Housing Policy AI: Project Overview and Open Questions*, October 5, 2026 (tab 1 of this document).
- Market research: *PolicyHuis Week 1 Market Map and Customer Segments*, Business Modeling/Market Research workstream.
- VNG, Wet versterking regie volkshuisvesting: <https://vng.nl/artikelen/wet-versterking-regie-volkshuisvesting>
- IPLO, Volkshuisvestingsprogramma: <https://iplo.nl/regelgeving/instrumenten/programma/verplicht-programma/volkshuisvestingsprogramma/>
- Open State Foundation, Open Raadsinformatie API: <https://data.openstate.eu/fr/dataset/open-raadsinformatie-api-open-council-data>
- Computer Weekly, Netherlands moves GPT-NL from lab to live (2026): <https://www.computerweekly.com/news/366642524/Netherlands-moves-GPT-NL-from-lab-to-live-first-pilots-under-way>
- GPT-NL Public Corpus (arXiv 2604.00920): <https://arxiv.org/abs/2604.00920>
- Neon pricing: <https://neon.com/pricing>
