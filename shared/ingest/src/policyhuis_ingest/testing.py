"""Test doubles for code that fetches sources."""


class FakeFetcher:
    """Serves fixed responses by URL prefix, and fails on any URL it has no response for."""

    def __init__(self, responses: dict[str, bytes]) -> None:
        self._responses = responses
        self.requested: list[str] = []

    def get(self, url: str) -> bytes:
        self.requested.append(url)
        for prefix, body in self._responses.items():
            if url.startswith(prefix):
                return body
        raise AssertionError(f"unexpected request: {url}")


def pdf(pages: list[list[str]], mod_date: str | None = None) -> bytes:
    """A minimal PDF with one line of Helvetica text per string, one page per list, and `mod_date` as its info
    record's `/ModDate` when given, written as the PDF format writes dates (`D:20150503161351-07'00'`)."""
    objects: list[bytes] = [b"<< /Type /Catalog /Pages 2 0 R >>", b""]
    font = 3
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    page_ids: list[int] = []
    for lines in pages:
        escaped = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
        body = "BT /F1 10 Tf 14 TL 50 750 Td " + " ".join(f"({line}) Tj T*" for line in escaped) + " ET"
        stream = body.encode()
        objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
        content = len(objects)
        objects.append(
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents %d 0 R "
            b"/Resources << /Font << /F1 %d 0 R >> >> >>" % (content, font)
        )
        page_ids.append(len(objects))
    kids = b" ".join(b"%d 0 R" % i for i in page_ids)
    objects[1] = b"<< /Type /Pages /Kids [" + kids + b"] /Count %d >>" % len(page_ids)
    info = b""
    if mod_date is not None:
        objects.append(b"<< /ModDate (" + mod_date.encode() + b") >>")
        info = b" /Info %d 0 R" % len(objects)
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % number + obj + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R%s >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, info, xref)
    return bytes(out)
