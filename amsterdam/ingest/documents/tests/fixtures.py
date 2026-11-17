"""Pages shaped like a Dutch housing ordinance and a report, as pypdf extracts them."""

from policyhuis_ingest.testing import pdf

ORDINANCE_PAGES = [
    [
        "Huisvestingsverordening Amsterdam 2024",
        "(June 5, 2026)",
        "Artikel 1.1 Begripsbepalingen",
        "In deze verordening wordt verstaan onder:",
        "a. woning: een woning als bedoeld in de wet;",
        "Artikel 1.2 Toepassingsgebied",
        "1. Deze verordening is van toepassing op de gemeente Amsterdam.",
        "2. Het college draagt zorg voor uitvoering.",
    ]
]

REPORT_PAGES = [
    [
        "Woningbouwplan Amsterdam",
        "(June 5, 2026)",
        "1. Inleiding",
        "Dit plan beschrijft de woningbouw in Amsterdam.",
        "2. Doelen",
        "Het doel is duizend woningen per jaar.",
    ]
]


def ordinance_pdf() -> bytes:
    return pdf(ORDINANCE_PAGES)


def report_pdf() -> bytes:
    return pdf(REPORT_PAGES)
