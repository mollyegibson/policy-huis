from sf_docs_ingest.amendments import MarkedLines, current_text


def test_struck_runs_are_dropped_and_other_runs_kept() -> None:
    lines = MarkedLines.validate_python(
        [
            [{"text": "that ", "struck": False}, {"text": "are", "struck": True}, {"text": " is so", "struck": False}],
            [
                {"text": "Section ", "struck": False},
                {"text": "415.4(e)(2)", "struck": True},
                {"text": "415.4(g)(2)", "struck": False},
            ],
            [{"text": "a whole deleted line", "struck": True}],
            [
                {"text": "concern. ", "struck": False},
                {"text": "In 1980,", "struck": True},
                {"text": " tThe", "struck": False},
            ],
        ]
    )
    assert current_text(lines) == "that is so\nSection 415.4(g)(2)\nconcern. tThe"
