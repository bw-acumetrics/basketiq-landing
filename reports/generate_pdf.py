"""Generate styled PDF report from markdown."""
import markdown
from weasyprint import HTML

MD_FILE = "reports/soft-drinks-q1-2026.md"
PDF_FILE = "reports/BasketIQ-Beverages-Soft-Drinks-Q1-2026.pdf"

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

@page {
    size: A4;
    margin: 2.5cm 2cm;
    @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Manrope', sans-serif;
        font-size: 8pt;
        color: #859394;
    }
    @bottom-left {
        content: "BasketIQ — Confidential";
        font-family: 'Manrope', sans-serif;
        font-size: 8pt;
        color: #859394;
    }
}

body {
    font-family: 'Manrope', 'Helvetica Neue', Arial, sans-serif;
    color: #0f1c2d;
    line-height: 1.6;
    font-size: 10pt;
}

h1 {
    font-size: 28pt;
    font-weight: 800;
    color: #071425;
    letter-spacing: -0.02em;
    margin-top: 0;
    margin-bottom: 4pt;
    border-bottom: 3px solid #00c2cb;
    padding-bottom: 12pt;
}

h2 {
    font-size: 18pt;
    font-weight: 700;
    color: #071425;
    margin-top: 28pt;
    margin-bottom: 8pt;
    letter-spacing: -0.01em;
    page-break-after: avoid;
}

h3 {
    font-size: 13pt;
    font-weight: 700;
    color: #00696e;
    margin-top: 20pt;
    margin-bottom: 6pt;
    page-break-after: avoid;
}

h4 {
    font-size: 11pt;
    font-weight: 600;
    color: #3c494a;
    margin-top: 14pt;
    margin-bottom: 4pt;
}

p {
    margin-bottom: 8pt;
    color: #0f1c2d;
}

strong {
    color: #071425;
    font-weight: 700;
}

em {
    color: #535f74;
}

hr {
    border: none;
    border-top: 1px solid #bbc9ca;
    margin: 20pt 0;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0 16pt 0;
    font-size: 9pt;
    page-break-inside: avoid;
}

thead {
    background: #071425;
    color: white;
}

th {
    padding: 8pt 10pt;
    text-align: left;
    font-weight: 700;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

td {
    padding: 6pt 10pt;
    border-bottom: 1px solid #e6eeff;
}

tr:nth-child(even) {
    background: #f0f3ff;
}

/* Highlight cells with bold text */
td strong {
    color: #00696e;
}

/* Code blocks for methodology */
code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 8pt;
    background: #f0f3ff;
    padding: 1pt 4pt;
    border-radius: 2pt;
}

/* Lists */
ul, ol {
    margin: 6pt 0;
    padding-left: 20pt;
}

li {
    margin-bottom: 4pt;
}

/* Cover page styling via first h1 */
h1:first-of-type {
    font-size: 32pt;
    margin-top: 40pt;
}

/* Section breaks */
h2 {
    border-top: 2px solid #f0f3ff;
    padding-top: 16pt;
}
"""

with open(MD_FILE) as f:
    md_content = f.read()

html_body = markdown.markdown(md_content, extensions=["tables", "fenced_code"])

full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>"""

HTML(string=full_html).write_pdf(PDF_FILE)
print(f"PDF generated: {PDF_FILE}")
