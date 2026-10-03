"""Extract First Term learning competencies from DepEd Three-Term Budgets of Work.

    pip install pdfplumber
    python scripts/extract_bow_term1.py path/to/BOW.pdf [more.pdf ...] > term1.json

Source: DepEd LS Guide -> Budgets of Work (sites.google.com/deped.gov.ph/lsguide/budgets-of-work).
Reads the PDF tables cell by cell, so week numbers and competency text are never
mixed up, and keeps the exact competency wording (it never paraphrases).

Layouts handled
- "Week | Learning Competency" and "Linggo | Kasanayang Pampagkatuto" tables
  (Math, Science, Araling Panlipunan, Makabansa, EPP/TLE, ...). Top-level bullets
  are competencies; deeper bullets (by indentation) stay inside their competency.
- GMRC / Values Education: per-week blocks with a "Kasanayang Pampagkatuto"
  section and the value to be developed ("Lilinanging Pagpapahalaga").
- English / Language / Reading and Literacy: only the official "sample
  clustering" week table exists, so only those weeks are extracted (Grades 7-9:
  only Week 1 lists competencies; Weeks 2-5 are planning options).

Reported but not extracted (no week numbers in the BOW): Filipino, MAPEH ("*"),
and term-only competency grids. Status tells you which.
"""

import json
import re
import sys

import pdfplumber

TERM1 = re.compile(r"^\s*(First Term|Unang Termino)\b", re.I)
TERM_OTHER = re.compile(r"^\s*(Second Term|Third Term|Ikalawang Termino|Ikatlong Termino)\b", re.I)
WEEK_HEADER = re.compile(r"^\s*(Week|Linggo)\s*$", re.I)
COMP_HEADER = re.compile(r"(Learning Competenc|Kasanayang Pampagkatuto)", re.I)
VALUES_HEADER = re.compile(r"Pamantayang\s+Pangnilalaman", re.I)
STOP_ROW = re.compile(r"^(Suggested\s+(Performance|Activit)|Mungkahing\s+Gawain|Gawaing\s+Pagganap)", re.I)
WEEK_VALUE = re.compile(
    r"^\s*(?:Linggo\s*)?(\d{1,2})(?:\s*(?:to|-|–|hanggang)\s*(\d{1,2}))?\s*(?:\(.*\))?\s*$|^\s*(\*)\s*$", re.I)
BULLET = re.compile(r"^\s*(?:●|•|○|■|▪|\d{1,2}\.|[a-z]\.|\([a-z]\))\s*")
TOP_BULLET = re.compile(r"^\s*(?:●|•|\d{1,2}\.)\s*")
FOOTER = re.compile(
    r"^(Page \d+ of \d+|Pahina \d+ ng \d+|Last updated|Huling na-update|Budget of Work|`$|"
    r"(Grade|Baitang) [\d /Grade]+\s*\|)", re.I)
SAMPLE_TITLE = re.compile(r"SAMPLE CLUSTERING.*?\((FIRST|1ST)[^)]*TERM 1\)", re.I | re.S)


def clean(s):
    return re.sub(r"\s+", " ", (s or "").replace("\u00a0", " ")).strip()


def crop(page, bbox):
    x0, top, x1, bottom = bbox
    return page.crop((max(x0, 0), max(top, 0), min(x1, page.width), min(bottom, page.height)))


def cell_text(page, bbox):
    return "" if bbox is None else (crop(page, bbox).extract_text() or "")


def cell_lines(page, bbox):
    """[(x0, text)] for each visual line in a cell."""
    if bbox is None:
        return []
    return [(l["x0"], l["text"]) for l in crop(page, bbox).extract_text_lines() if l["text"].strip()]


def overlap(a, b):
    return max(0.0, min(a[1], b[1]) - max(a[0], b[0]))


def parse_block(lines, top=None):
    """(heading, [competencies]) from a competency cell, keeping exact wording.

    Lines before the first bullet form the topic heading. Bullets at the
    shallowest indentation start a competency; deeper bullets and wrapped
    lines are kept inside it (sub-items on their own line).
    """
    lines = [(x, t.strip()) for x, t in lines if t.strip() and not FOOTER.match(t.strip())]
    bullet_x = [x for x, t in lines if TOP_BULLET.match(t)] or [x for x, t in lines if BULLET.match(t)]
    if not bullet_x:
        # No bullets at all (e.g. G6 TLE ICT): first line is the heading, the rest one competency.
        if len(lines) >= 2:
            h, c = clean(lines[0][1]), [clean(" ".join(t for _, t in lines[1:]))]
            return h, c, None, [(h, c)]
        return (clean(lines[0][1]), [], None, []) if lines else ("", [], None, [])
    # A block continued on the next page keeps its first row's bullet depth, so
    # nested bullets there aren't mistaken for new competencies.
    top = min(bullet_x) if top is None else top
    heading, comps, headings = [], [], []
    heading_xs = []
    pending_heading = []   # a domain heading in the middle of a block ("Measurement and Geometry")
    for x, t in lines:
        is_top = BULLET.match(t) and abs(x - top) <= 4
        if is_top:
            if pending_heading:
                heading_now = clean(" ".join(pending_heading)); pending_heading = []
            else:
                heading_now = headings[-1] if headings else None
            comps.append(BULLET.sub("", t, count=1))
            headings.append(heading_now)
        elif comps and not BULLET.match(t) and x <= top + 2:
            # Unbulleted text at (or left of) the bullet column isn't a wrapped
            # line (those are indented past the bullet): it's a new heading.
            pending_heading.append(t)
        elif comps:
            comps[-1] += ("\n" if BULLET.match(t) else " ") + t
        else:
            heading.append(t)
            heading_xs.append(x)
    first = clean(" ".join(heading))
    # Text before the first bullet sits left of the bullets when it's a real
    # heading; wrapped text from the previous page is indented past them.
    parse_block.heading_is_real = bool(heading_xs) and max(heading_xs) <= top + 2
    comps = [re.sub(r"[ \t]+", " ", c).strip() for c in comps]
    segments = []
    for c, h in zip(comps, headings):
        h = first if h is None else h
        if c and segments and segments[-1][0] == h:
            segments[-1][1].append(c)
        elif c:
            segments.append((h, [c]))
    return first, comps, top, segments


def top_bullet_x(lines):
    xs = [x for x, t in lines if TOP_BULLET.match(t.strip())] or [x for x, t in lines if BULLET.match(t.strip())]
    return min(xs) if xs else None


def strip_running_header(text, header):
    if header:
        text = re.sub(r"[ \t]*" + re.escape(header) + r"[ \t]*", " ", text)
    return re.sub(r"[ \t]{2,}", " ", text).replace(" \n", "\n").strip()


def parse_week(text):
    m = WEEK_VALUE.match(clean(text)) if clean(text) else None
    if not m:
        return None
    if m.group(3):
        return {"week": None, "week_end": None}
    start = int(m.group(1))
    return {"week": start, "week_end": int(m.group(2)) if m.group(2) else start}


def extract(path):
    result = {"file": path.split("/")[-1], "status": "ok", "layout": None, "blocks": []}
    in_term1 = done = False
    week_x = comp_x = None
    mode = None            # "table" | "values"
    values_in_comps = False
    current = None
    sample_note = None

    header = None
    with pdfplumber.open(path) as pdf:
        for page_no, page in enumerate(pdf.pages, 1):
            if header is None:
                m = re.search(r"Budget of Work\s+((?:Grade|Baitang)\s[^\n]*\|[^\n]+)", page.extract_text() or "")
                header = clean(m.group(1)) if m else None
            if done:
                break
            page_text = page.extract_text() or ""
            if not in_term1 and SAMPLE_TITLE.search(page_text):
                # English-type BOWs: the only week table is the official sample for Term 1.
                in_term1, sample_note = True, clean(SAMPLE_TITLE.search(page_text).group(0))
            for table in page.find_tables():
                if done:
                    break
                for row in table.rows:
                    cells = row.cells
                    texts = [cell_text(page, c) for c in cells]
                    nonempty = [clean(t) for t in texts if clean(t)]
                    first = nonempty[0] if nonempty else ""
                    if TERM1.match(first):
                        in_term1 = True
                        continue
                    if not in_term1:
                        continue
                    if (TERM_OTHER.match(first) or STOP_ROW.match(first)) and mode:
                        done = True
                        break
                    if TERM_OTHER.match(first):
                        in_term1 = False  # standards summary for all terms; real table comes later
                        continue

                    if mode is None and sample_note and clean(texts[0]).lower() == "essential skills" \
                            and len(texts) > 1 and clean(texts[1]).lower().startswith("week 1"):
                        mode, comp_x = "jhs_english", (cells[1][0], cells[1][2])
                        result["layout"] = mode
                        continue
                    if mode == "jhs_english":
                        comp_cell = next((c for c in cells if c is not None and overlap((c[0], c[2]), comp_x) > 5), None)
                        lines = cell_lines(page, comp_cell)
                        subdomain = clean(texts[0])
                        if subdomain:
                            heading, comps, top, _ = parse_block(lines)
                            if comps:
                                current = {"week": 1, "week_end": 1, "page": page_no, "_top": top,
                                           "heading": subdomain, "competencies": comps}
                                result["blocks"].append(current)
                        elif current and lines:
                            heading, comps, _, _ = parse_block(lines, current.get("_top"))
                            if heading and current["competencies"]:
                                current["competencies"][-1] += "\n" + heading
                            current["competencies"].extend(comps)
                        continue

                    w = [i for i, t in enumerate(texts) if WEEK_HEADER.match(clean(t))]
                    k = [i for i, t in enumerate(texts) if COMP_HEADER.search(clean(t))]
                    v = [i for i, t in enumerate(texts) if VALUES_HEADER.search(clean(t))]
                    if w and (k or v) and mode is None:
                        week_x = (cells[w[0]][0], cells[w[0]][2])
                        if k:
                            mode, comp_x = "table", (cells[k[0]][0], cells[k[0]][2])
                        else:
                            mode, comp_x = "values", (cells[v[0]][0], cells[v[0]][2])
                            # This header row is also the first week block's first row.
                        result["layout"] = mode
                        if mode == "table":
                            continue
                    if mode is None:
                        continue

                    # Pick the cells under the Week and Competency columns.
                    week_cell = comp_cell = None
                    third = ""
                    bw = bk = 0.0
                    for c, t in zip(cells, texts):
                        if c is None:
                            continue
                        ow, ok = overlap((c[0], c[2]), week_x), overlap((c[0], c[2]), comp_x)
                        if ow > bw:
                            bw, week_cell = ow, c
                        if ok > bk:
                            bk, comp_cell = ok, c
                    if mode == "values":
                        others = [clean(t) for c, t in zip(cells, texts) if c not in (week_cell, comp_cell) and clean(t)]
                        third = others[-1] if others else ""

                    week = parse_week(cell_text(page, week_cell)) if week_cell is not None else None

                    if mode == "table":
                        lines = cell_lines(page, comp_cell)
                        if week:
                            heading, comps, top, segments = parse_block(lines)
                            for h, cs in (segments or [(heading, comps)]):
                                current = {**week, "page": page_no, "_top": top, "heading": h, "competencies": cs}
                                result["blocks"].append(current)
                            continue
                        heading, comps, _, segments = parse_block(lines, current.get("_top") if current else None)
                        if current and comps and heading and parse_block.heading_is_real:
                            segments = [(heading, comps)] if len(segments) <= 1 else segments
                            current = {"week": current["week"], "week_end": current["week_end"], "page": page_no,
                                       "_top": current["_top"], "heading": segments[0][0], "competencies": list(segments[0][1])}
                            result["blocks"].append(current)
                            for h, cs in segments[1:]:
                                current = {**{k: current[k] for k in ("week", "week_end", "page", "_top")},
                                           "heading": h, "competencies": cs}
                                result["blocks"].append(current)
                            continue
                        if current and len(segments) > 1:
                            # continuation row that also switches heading mid-way
                            wk = {"week": current["week"], "week_end": current["week_end"]}
                            for i, (h, cs) in enumerate(segments):
                                if i == 0 and h in ("", current["heading"]):
                                    current["competencies"].extend(cs)
                                    continue
                                current = {**wk, "page": page_no, "_top": current["_top"], "heading": h, "competencies": cs}
                                result["blocks"].append(current)
                            continue
                        # Row without a week number: continuation of the previous block.
                        if current and (comps or heading):
                            if comps:
                                if heading and current["competencies"]:
                                    current["competencies"][-1] += " " + heading
                                elif heading and not current["heading"]:
                                    current["heading"] = heading
                                current["competencies"].extend(comps)
                            elif current["competencies"]:
                                current["competencies"][-1] += " " + heading
                        continue

                    # mode == "values" (GMRC / Values Education)
                    raw_label = cell_text(page, comp_cell)
                    # keep "a. ..." sub-items on their own line, collapse other wrapping
                    label = re.sub(r"[ \t]*\n[ \t]*(?=(?:[a-z]\.|\([a-z]\))\s)", "\u2028", raw_label)
                    label = clean(label).replace("\u2028", "\n").replace(" \n", "\n")
                    if week:
                        current = {**week, "page": page_no, "heading": "", "competencies": []}
                        result["blocks"].append(current)
                        values_in_comps = False
                    if current is None:
                        continue
                    if re.search(r"Lilinanging\s+Pagpapahalaga", label):
                        current["heading"] = third
                        values_in_comps = False
                    elif COMP_HEADER.search(label):
                        values_in_comps = True
                    elif VALUES_HEADER.search(label) or re.search(r"Pamantayan\s+sa\s+Pagganap", label):
                        values_in_comps = False
                    elif values_in_comps and label:
                        if re.match(r"^\d{1,2}\.\s*", label):
                            current["competencies"].append(re.sub(r"^\d{1,2}\.\s*", "", label))
                        elif current["competencies"]:
                            sep = "\n" if re.match(r"^(?:[a-z]\.|\([a-z]\))\s", label) else " "
                            current["competencies"][-1] += sep + label

    blocks = result["blocks"]
    if mode is None:
        result["status"] = "no_week_table"
    elif not blocks or not any(b["competencies"] for b in blocks):
        result["status"] = "no_term1_competencies_found"
    elif all(b["week"] is None for b in blocks):
        result["status"] = "no_week_numbers"
    for b in blocks:
        b.pop("_top", None)
        # A competency that continues on the next page can pick up that page's
        # running header ("Grade 6 | GMRC", "Baitang 4 | Araling Panlipunan").
        b["competencies"] = [strip_running_header(c, header) for c in b["competencies"]]
        b["heading"] = strip_running_header(b["heading"], header)
    if sample_note:
        result["note"] = sample_note
    return result


if __name__ == "__main__":
    json.dump([extract(p) for p in sys.argv[1:]], sys.stdout, ensure_ascii=False, indent=1)
