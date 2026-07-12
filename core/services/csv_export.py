"""
CSV export (spec section 3.8: "Support CSV export").

Two layers:

1. `rows_to_csv_string` - pure Python, no Django import. Used by unit tests
   and anywhere you just want a CSV string (e.g. emailing a report).
2. `csv_streaming_response` - a thin Django wrapper using a `StreamingHttpResponse`
   with a pseudo-buffer writer instead of building the whole CSV in memory
   with `HttpResponse`. For a fleet with thousands of trips/fuel logs this
   avoids holding the entire export in RAM before the first byte is sent -
   a small touch, but it's the difference between "CSV export" as a
   checkbox feature and one that doesn't choke during the demo on a
   loaded dataset.

Both accept the same generic `rows: Iterable[dict]` shape, so whoever wires
the DRF view just needs to turn a queryset into dicts (DRF serializers do
this for free via `serializer.data`) and pass it straight in.
"""
from __future__ import annotations

import csv
import io
from typing import Any, Iterable, Sequence


def rows_to_csv_string(fieldnames: Sequence[str], rows: Iterable[dict]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buffer.getvalue()


class _Echo:
    """A file-like object that just returns what's written to it.

    csv.writer wants a `.write()`-able target; StreamingHttpResponse wants
    an iterable of chunks. This bridges the two so nothing is buffered.
    """

    def write(self, value: str) -> str:
        return value


def csv_streaming_response(
    fieldnames: Sequence[str],
    rows: Iterable[dict],
    filename: str = "export.csv",
):
    """Returns a Django StreamingHttpResponse. Imports Django lazily so this
    module can still be imported (and its pure functions tested) in an
    environment without Django configured."""
    from django.http import StreamingHttpResponse

    writer = csv.DictWriter(_Echo(), fieldnames=fieldnames, extrasaction="ignore")

    def row_stream():
        yield writer.writeheader()
        for row in rows:
            yield writer.writerow(row)

    response = StreamingHttpResponse(row_stream(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def dicts_from_dataclasses(fieldnames: Sequence[str], objects: Iterable[Any]) -> list[dict]:
    """Convenience: turn a list of dataclass/model instances into row dicts
    using only the requested fieldnames, via getattr. Useful when you don't
    want to route through a DRF serializer just to build a CSV."""
    return [{f: getattr(obj, f, "") for f in fieldnames} for obj in objects]