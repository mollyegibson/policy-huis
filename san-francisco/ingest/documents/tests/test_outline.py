from sf_docs_ingest.passages.outline import split_section


def provisions(lines: list[str]) -> list[tuple[str, str | None]]:
    return [(p.provision, p.parent_provision) for p in split_section("37.9", "Sec. 37.9 Evictions", lines, 0)]


def test_markers_nest_as_letters_digits_capitals_and_roman_numerals() -> None:
    lines = [
        "Notwithstanding Section 37.3, this Section applies.",
        "(a)  A landlord shall not endeavor to recover possession unless:",
        "(1)  The tenant:",
        "(A)  Has failed to pay the rent",
        "under the agreement:",
        "(i) Except that a charge is not rent; and",
        "(ii) Except that, commencing August 10, 2001,",
        "(B)  Habitually pays the rent late; or",
        "(2)  The tenant has violated a lawful obligation;",
        "(b)  A landlord who resides in the same rental unit may evict.",
    ]
    assert provisions(lines) == [
        ("37.9", None),
        ("37.9(a)", "37.9"),
        ("37.9(a)(1)", "37.9(a)"),
        ("37.9(a)(1)(A)", "37.9(a)(1)"),
        ("37.9(a)(1)(A)(i)", "37.9(a)(1)(A)"),
        ("37.9(a)(1)(A)(ii)", "37.9(a)(1)(A)"),
        ("37.9(a)(1)(B)", "37.9(a)(1)"),
        ("37.9(a)(2)", "37.9(a)"),
        ("37.9(b)", "37.9"),
    ]


def test_i_after_h_is_a_letter_and_otherwise_a_roman_numeral() -> None:
    letters = [f"({c})  Item {c.upper()}." for c in "abcdefghi"]
    assert provisions(letters)[-1] == ("37.9(i)", "37.9")
    roman = ["(a)  Item.", "(1)  Item.", "(i)  Item.", "(ii)  Item."]
    assert provisions(roman)[-1] == ("37.9(a)(1)(ii)", "37.9(a)(1)")


def test_capital_roman_numerals_and_digits_below_roman_numerals_open_new_levels() -> None:
    lines = ["(a)  Item.", "(1)  Item.", "(A)  Item.", "(i)  Item."]
    lines += ["(I) Item.", "(II) Item.", "(ii)  Item.", "(1)  Item."]
    assert [p for p, _ in provisions(lines)][-4:] == [
        "37.9(a)(1)(A)(i)(I)",
        "37.9(a)(1)(A)(i)(II)",
        "37.9(a)(1)(A)(ii)",
        "37.9(a)(1)(A)(ii)(1)",
    ]


def test_a_line_opening_two_levels_is_split() -> None:
    lines = ["(a)  Item.", "(b) (1)  For notices served before 2018,", "(2)  For notices served after 2018,"]
    assert provisions(lines) == [
        ("37.9(a)", "37.9"),
        ("37.9(b)", "37.9"),
        ("37.9(b)(1)", "37.9(b)"),
        ("37.9(b)(2)", "37.9(b)"),
    ]


def test_a_wrapped_cross_reference_and_an_out_of_order_marker_stay_in_the_text() -> None:
    lines = [
        "(a)  As provided in Section 37.9(a)",
        "(2) of this Chapter, the landlord",
        "(1)  First.",
        "(2)  Second.",
        "(2)  Repeated by the source.",
    ]
    passages = split_section("37.9", "Sec. 37.9 Evictions", lines, 0)
    assert [p.provision for p in passages] == ["37.9(a)", "37.9(a)(1)", "37.9(a)(2)"]
    assert passages[0].text == "(a) As provided in Section 37.9(a) (2) of this Chapter, the landlord"
    assert passages[-1].text == "(2) Second. (2) Repeated by the source."


def test_context_holds_the_heading_and_the_lead_in_of_each_provision_above() -> None:
    lines = [
        "(a)  A landlord shall not recover possession unless:",
        "(1)  The tenant fails to pay;",
        "(2)  The landlord seeks possession in good faith;",
    ]
    passages = split_section("37.9", "Sec. 37.9 Evictions", lines, 5)
    last = passages[-1]
    assert last.provision == "37.9(a)(2)"
    assert last.context == "Sec. 37.9 Evictions (a) A landlord shall not recover possession unless:"
    assert last.text == "(2) The landlord seeks possession in good faith;"
    assert [p.ordinal for p in passages] == [5, 6, 7]
