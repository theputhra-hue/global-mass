"""Build a readable working manuscript from Markdown and saved aggregate figures.

Requires reportlab and pypdf; use the documented bundled Python runtime.
No result calculation or scientific source editing occurs here.
"""
from pathlib import Path
import hashlib
import html
import json
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
OUT = REPO / "output/pdf/gmee_vitaminc_manuscript.pdf"
FONT_DIR = Path("C:/Windows/Fonts")
for name, file in (("Paper", "times.ttf"), ("PaperBold", "timesbd.ttf"),
                   ("PaperItalic", "timesi.ttf"), ("PaperBoldItalic", "timesbi.ttf")):
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / file)))
pdfmetrics.registerFontFamily("Paper", normal="Paper", bold="PaperBold", italic="PaperItalic", boldItalic="PaperBoldItalic")

STYLES = {
    "body": ParagraphStyle("body", fontName="Paper", fontSize=10.8, leading=14.2, spaceAfter=7,
                           alignment=TA_JUSTIFY, splitLongWords=True, allowWidows=0, allowOrphans=0),
    "title": ParagraphStyle("title", fontName="PaperBold", fontSize=19, leading=22, alignment=TA_CENTER, spaceAfter=12),
    "h2": ParagraphStyle("h2", fontName="PaperBold", fontSize=12.5, leading=16, spaceBefore=12, spaceAfter=6, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="PaperBold", fontSize=11, leading=14, spaceBefore=8, spaceAfter=5, keepWithNext=True),
    "caption": ParagraphStyle("caption", fontName="Paper", fontSize=9.2, leading=11.6, spaceAfter=8),
    "cell": ParagraphStyle("cell", fontName="Paper", fontSize=9, leading=11.2, alignment=TA_LEFT),
    "meta": ParagraphStyle("meta", fontName="Paper", fontSize=9.8, leading=13, alignment=TA_LEFT, spaceAfter=7),
    "list": ParagraphStyle("list", fontName="Paper", fontSize=10.6, leading=14, leftIndent=12, firstLineIndent=-9, spaceAfter=4),
}
CITES = {
    "schuster-etal-2021-get": "Schuster et al., 2021",
    "ko-etal-2023-claimdiff": "Ko et al., 2023",
    "magomere-etal-2025-claims": "Magomere et al., 2025",
    "spangher-etal-2024-newsedits": "Spangher et al., 2024",
    "yang-etal-2017-identifying-semantic": "Yang et al., 2017",
    "lan-etal-2026-making": "Lan et al., 2026",
}


def inline(text):
    text = re.sub(r"\[@([^\]]+)\]", lambda m: "(" + CITES[m[1]] + ")", text)
    text = text.replace("—", " - ").replace("–", "-").replace("‑", "-")
    text = html.escape(text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                  lambda m: f'<link href="{m[2]}" color="#134a68">{m[1]}</link>' if m[2].startswith("http") else m[1], text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    # Long checksums and filenames wrap safely while remaining copyable.
    text = re.sub(r"`([^`]+)`", r'<font size="9">\1</font>', text)
    return text


def paragraph(text, style="body"):
    return Paragraph(inline(text), STYLES[style])


def table(lines):
    rows = [[cell.strip() for cell in line.strip().strip("|").split("|")] for line in lines]
    rows = [row for row in rows if not all(re.fullmatch(r":?-+:?", x) for x in row)]
    n = len(rows[0])
    width = A4[0] - 100
    widths = ([width * .38] + [width * .62 / (n-1)] * (n-1)) if n > 1 else [width]
    data = [[paragraph(("**" + cell + "**") if i == 0 else cell, "cell") for cell in row]
            for i, row in enumerate(rows)]
    result = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef3f3")),
        ("LINEABOVE", (0, 0), (-1, 0), .7, colors.HexColor("#516363")),
        ("LINEBELOW", (0, 0), (-1, 0), .6, colors.HexColor("#516363")),
        ("LINEBELOW", (0, -1), (-1, -1), .7, colors.HexColor("#516363")),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return result


def figures(story):
    for filename, caption in (
        ("vitaminc_discrimination.png", "Figure 1. Discrimination on the identical 30,828 clean test rows. Legends give AUROC and average precision. Supplementary models were added after the primary result; these curves do not add confirmatory claims."),
        ("vitaminc_primary_contrast.png", "Figure 2. The locked primary AUROC difference with 95% paired percentile intervals. The connected-group result is a predeclared dependence sensitivity. The dashed line marks the predeclared +0.02 study margin."),
    ):
        path = HERE / "figures" / filename
        if path.exists():
            image = Image(str(path))
            width = A4[0] - 100
            image.drawHeight *= width / image.drawWidth
            image.drawWidth = width
            story.append(KeepTogether([Spacer(1, 8), image, paragraph(caption, "caption")]))


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setFont("Paper", 8)
    canvas.setFillColor(colors.HexColor("#566263"))
    canvas.drawString(50, A4[1] - 29, "GMEE RESEARCH PAPER - SAI PRABHAS & PAVANPUTRA CHARRY")
    canvas.drawRightString(A4[0] - 50, 29, str(doc.page))
    canvas.drawString(50, 29, "GMEE Research Project - October 2026")
    canvas.restoreState()


def build():
    lines = (HERE / "manuscript.md").read_text(encoding="utf-8").splitlines()
    story, i = [], 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("## 6."):
            figures(story)
        if line.startswith("# "):
            story.append(paragraph(line[2:], "title"))
            i += 1
        elif line.startswith("## "):
            if line.startswith("## Appendix"):
                story.append(PageBreak())
            story.append(paragraph(line[3:], "h2"))
            i += 1
        elif line.startswith("### "):
            story.append(paragraph(line[4:], "h3"))
            i += 1
        elif line.startswith("|"):
            block = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i]); i += 1
            story.append(table(block)); story.append(Spacer(1, 7))
        elif line.startswith("- "):
            story.append(paragraph("- " + line[2:], "list")); i += 1
        else:
            block = [line]; i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].lstrip().startswith(("#", "|", "- ")):
                block.append(lines[i].strip()); i += 1
            style = "meta" if any("Authors" in s or "Affiliation" in s or "Project" in s or "Scope" in s for s in block) else "body"
            if style == "meta":
                story.append(Paragraph("<br/>".join(inline(part) for part in block), STYLES[style]))
            else:
                story.append(paragraph(" ".join(block), style))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=50, rightMargin=50,
                            topMargin=47, bottomMargin=47, title=lines[0].lstrip("# "),
                            author="R. M. N. Sai Prabhas and Pavanputra Charry", subject="Deterministic Change Descriptors for Factual Revision Flagging")
    doc.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    reader = PdfReader(str(OUT))
    text = "\n".join(p.extract_text() for p in reader.pages)
    if "[@" in text or any(value not in text for value in ("0.8116", "0.8205", "0.9189", "0.8569", "0.8317")):
        raise ValueError("Citation rendering or expected result text failed")
    manifest = {"pdf": str(OUT), "pages": len(reader.pages),
                "source_sha256": hashlib.sha256((HERE / "manuscript.md").read_bytes()).hexdigest(),
                "pdf_sha256": hashlib.sha256(OUT.read_bytes()).hexdigest(),
                "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "figures_sha256": {name: hashlib.sha256((HERE / "figures" / name).read_bytes()).hexdigest()
                    for name in ("vitaminc_discrimination.png", "vitaminc_primary_contrast.png")}}
    (OUT.parent / "manuscript_build.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    build()
