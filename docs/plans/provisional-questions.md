# PolicyHuis: Provisional Questions

Draft, October 14, 2026. **Pending confirmation from the research team.** The Amsterdam questions also need review by Martin, who owns the Amsterdam source proposal.

These questions are taken from the examples in the project overview (*Housing Policy AI: Project Overview and Open Questions*, October 5, 2026). They serve three purposes:

1. **Tool design (M1).** The data servers' tools are designed so these questions can be answered.
2. **Choosing the first rule-plus-data pair per city (M0).**
3. **The first version of the evaluation set (M5)**, which grows to 30–50 questions after user research.

Expected answers are not drafted here. They are written and checked by the research team's policy expert once sources are loaded.

## Question types

| Type | Answered from |
|---|---|
| Rule | Legal-text server only |
| Ground | Data server only |
| Rule + data | Both: a rule from the docs server, numbers from a data server |
| Climate | Mostly the data server, sometimes the docs server |
| Cross-city | Both cities' servers |
| Decline | None. The agent should decline, explain why, and point to the right body or say what data is missing. |

The "Likely sources" column names candidates from the project overview's dataset list. The source proposals in M0 confirm or replace them.

## San Francisco

| ID | Type | Question | Likely sources |
|---|---|---|---|
| SF-01 | Rule | Which units are covered by rent control under Chapter 37 of the Administrative Code? | Administrative Code, Chapter 37 |
| SF-02 | Rule | What share of units must be affordable in a new 30-unit building? | Planning Code (inclusionary housing) |
| SF-03 | Ground | How many eviction notices were filed in the Mission last year, and for what reasons? | Eviction Notices (DataSF) |
| SF-04 | Ground | How many affordable units are in the city's pipeline at each income level? | MOHCD Affordable Housing Pipeline (DataSF) |
| SF-05 | Ground | What is the typical rent band for a two-bedroom unit in the Rent Board inventory? | Rent Board Housing Inventory (DataSF) |
| SF-06 | Rule + data | Which grounds for eviction in the rent ordinance account for the most notices, and which are rising? | Administrative Code, Chapter 37; Eviction Notices |
| SF-07 | Rule + data | How is San Francisco doing against its state housing targets for low-income units? | 2022 Housing Element; Housing Element Annual Progress Reports (California HCD) |
| SF-08 | Climate | Which affordable projects in San Francisco fall inside the sea-level-rise zone? | MOHCD pipelines; 108-inch inundation vulnerability zone (DataSF) |

## Amsterdam

| ID | Type | Question | Likely sources |
|---|---|---|---|
| AMS-01 | Rule | Who is eligible for a social-rent home under the 2024 housing ordinance? | Huisvestingsverordening Amsterdam 2024 |
| AMS-02 | Rule | Do I need a permit to split an apartment into two units? | Huisvestingsverordening Amsterdam 2024 |
| AMS-03 | Rule | What did national rent law say before July 2024, and what changed? | Basis Wetten Bestand (version history) |
| AMS-04 | Ground | How many social-rent homes are planned in Nieuw-West, and when? | Nieuwbouwplannen |
| AMS-05 | Ground | What share of homes in each district is owned by housing corporations? | CBS StatLine |
| AMS-06 | Ground | How many short-term rental listings are in Centrum? | Inside Airbnb, Amsterdam |
| AMS-07 | Rule + data | Is Amsterdam on track for the share of social-rent homes its construction plan targets? | Woningbouwplan reports; Nieuwbouwplannen |
| AMS-08 | Climate | How many homes in this neighborhood have energy label E or worse, and how old are they? | EP-Online; BAG |
| AMS-09 | Climate | Which neighborhoods with planned housing face high heat stress or flood risk? | Nieuwbouwplannen; Klimaateffectatlas |
| AMS-10 | Climate | What do Dutch building rules require for energy performance when a building is renovated? | National building regulations (source to confirm) |

## Cross-city

| ID | Type | Question | Likely sources |
|---|---|---|---|
| X-01 | Cross-city | How do Amsterdam and San Francisco each decide who qualifies for affordable housing? | Huisvestingsverordening Amsterdam 2024; SF eligibility rules (source to confirm) |
| X-02 | Cross-city | Which city requires more affordable units in new construction, and how is that enforced? | SF Planning Code; Amsterdam source to confirm |

The project overview notes these are the hardest type: the two systems use different concepts and income definitions, and the sources are in different languages.

## Questions the agent should decline

| ID | Question | Expected behavior |
|---|---|---|
| D-01 | Did rent control reduce evictions? | Show the trend next to the rule; decline to conclude causation |
| D-02 | Can my landlord evict me? | Explain the rule; refer to the San Francisco Rent Board or the Huurcommissie; decline individual legal advice |
| D-03 | What is the typical rent for a specific apartment in Amsterdam? | Say unit-level rents for Amsterdam are not in the available data |
| D-04 | Exactly how much rent does a two-bedroom in the Mission cost? | Give the band (Rent Board inventory reports rent in $250 bands) and say it cannot be more precise |
| D-05 | How many people were evicted in the Mission last year? | Report notices filed, and say notices are filings, not completed evictions |

D-03 to D-05 are phrased here from the project overview's description of answers the tool should not give; it gives no example questions for them.

## Gaps for the research team

- **Count.** 25 questions so far (8 San Francisco, 10 Amsterdam, 2 cross-city, 5 decline), against a target of 30–50.
- **Climate in San Francisco.** Only one SF climate question (SF-08). Climate is a focus of the San Francisco work, so more are needed.
- **Users.** The questions come from the project overview, not from user research. Their wording and priority should be checked against what the first users actually need to decide.
- **First rule-plus-data pair.** SF-06 (Chapter 37 with Eviction Notices) and AMS-07 (Woningbouwplan with Nieuwbouwplannen) are candidates for each city's first pair, to be confirmed in M0.
