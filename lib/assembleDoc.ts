import type { GeneratedSection } from "./types";

const DISCLAIMER = "Comedy-powered drafting support. Not legal advice.";

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraphsFromText(input: string): string {
  return input
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("\n");
}

function slugify(input: string, index: number): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `section-${index + 1}`;
}

export function assembleHtmlDocument(args: {
  title: string;
  sections: GeneratedSection[];
  metrics: {
    pages: number;
    questions: number;
    fogIndex: number;
    reviewBurden: string;
  };
}): string {
  const title = escapeHtml(args.title);
  const sectionsWithIds = args.sections.map((section, index) => ({
    ...section,
    id: slugify(section.title, index),
  }));

  const tableOfContents = sectionsWithIds
    .map(
      (section, index) =>
        `<li><a href="#${section.id}">${index + 1}. ${escapeHtml(section.title)}</a></li>`,
    )
    .join("\n");

  const sectionMarkup = sectionsWithIds
    .map(
      (section, index) => `<section id="${section.id}" class="doc-section">
  <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
  ${paragraphsFromText(section.content)}
</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      color: #171717;
      background: #f7f3ea;
      font-family: Georgia, "Times New Roman", serif;
    }

    body {
      margin: 0;
      background: #f7f3ea;
    }

    .document {
      box-sizing: border-box;
      max-width: 8.5in;
      min-height: 11in;
      margin: 24px auto;
      padding: 0.75in;
      background: #fffdf7;
      border: 1px solid #d8cdb8;
      box-shadow: 0 24px 80px rgb(0 0 0 / 0.14);
    }

    .eyebrow,
    .status-line,
    .metrics {
      font-family: Arial, sans-serif;
      font-size: 12px;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .eyebrow {
      color: #6f2c18;
      font-weight: 700;
    }

    h1 {
      margin: 10px 0 14px;
      font-size: 34px;
      line-height: 1.08;
    }

    h2 {
      margin: 28px 0 10px;
      font-size: 21px;
      line-height: 1.25;
    }

    p,
    li {
      font-size: 13.5pt;
      line-height: 1.55;
    }

    a {
      color: inherit;
    }

    .disclaimer,
    .status-line,
    .metrics,
    .appendix {
      border: 1px solid #d8cdb8;
      background: #faf5e8;
      padding: 12px 14px;
    }

    .disclaimer {
      font-family: Arial, sans-serif;
      font-size: 13px;
      font-weight: 700;
    }

    .status-line {
      margin-top: 12px;
      font-weight: 700;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 18px 0;
      text-transform: none;
    }

    .metrics strong {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
    }

    .toc {
      margin: 24px 0;
      padding-top: 4px;
      border-top: 2px solid #171717;
    }

    .toc ol {
      padding-left: 24px;
    }

    .doc-section {
      break-inside: avoid-page;
    }

    .appendix {
      margin-top: 34px;
    }

    @media print {
      body {
        background: #fff;
      }

      .document {
        max-width: none;
        min-height: auto;
        margin: 0;
        padding: 0;
        border: 0;
        box-shadow: none;
      }

      a {
        text-decoration: none;
      }
    }
  </style>
</head>
<body>
  <main class="document">
    <div class="eyebrow">The Procedural Fog Machine</div>
    <h1>${title}</h1>
    <div class="disclaimer">${escapeHtml(DISCLAIMER)}</div>
    <div class="status-line">Admissions made: 0</div>
    <div class="metrics" aria-label="Fog machine metrics">
      <div><strong>Estimated pages</strong>${escapeHtml(String(args.metrics.pages))}</div>
      <div><strong>Clarifying questions</strong>${escapeHtml(String(args.metrics.questions))}</div>
      <div><strong>Fog index</strong>${escapeHtml(String(args.metrics.fogIndex))}</div>
      <div><strong>Review burden</strong>${escapeHtml(args.metrics.reviewBurden)}</div>
    </div>
    <nav class="toc" aria-label="Table of contents">
      <h2>Table of Contents</h2>
      <ol>
${tableOfContents}
      </ol>
    </nav>
${sectionMarkup}
    <section class="appendix" aria-label="Closing administrative appendix">
      <h2>Appendix: Closing Administrative Reservations</h2>
      <p>This response is provided in a spirit of cooperative procedural tidiness, without admission, waiver, concession, ratification, endorsement, interpretive surrender, or enthusiasm for unnecessary confusion.</p>
      <p>To the extent any deadline, obligation, document, portal, form, sub-form, attachment, supplemental attachment, or mysterious checkbox exists, the sender respectfully requests clear written identification of it so that all parties may admire the administrative machinery in its fully labeled condition.</p>
    </section>
  </main>
</body>
</html>`;
}
