import { NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ExportSection = {
  title: string;
  content: string;
};

type ExportRequest = {
  title?: string;
  sections?: ExportSection[];
  metrics?: {
    pages?: number;
    questions?: number;
    fogIndex?: number;
    reviewBurden?: string;
  };
};

const MAX_SECTIONS = 80;
const MAX_SECTION_CHARS = 35_000;

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function addFooter(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(`Procedural Fog Packet - Page ${index + 1}`, 54, 742, {
        align: "center",
        width: 504,
      });
  }
}

async function renderPdf(args: {
  title: string;
  sections: ExportSection[];
  metrics: NonNullable<ExportRequest["metrics"]>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 54, bottom: 54, left: 54, right: 54 },
      bufferPages: true,
      autoFirstPage: false,
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#111111")
      .text("The Procedural Fog Machine", { align: "center" });
    doc.moveDown(1.5);
    doc.fontSize(18).text(args.title, { align: "center" });
    doc.moveDown(2);
    doc.font("Helvetica").fontSize(12).text("Admissions Made: 0", { align: "center" });
    doc
      .text(`Procedural Fog Index: ${args.metrics.fogIndex ?? 0}/100`, { align: "center" })
      .text(`Estimated Review Burden: ${args.metrics.reviewBurden ?? "0.0 hours"}`, {
        align: "center",
      });
    doc.moveDown(2);
    doc
      .font("Helvetica-Oblique")
      .fontSize(10)
      .fillColor("#555555")
      .text("Comedy-powered drafting support. Not legal advice.", { align: "center" });

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111").text("Table of Contents");
    doc.moveDown();
    args.sections.forEach((section, index) => {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#222222")
        .text(`${index + 1}. ${section.title}`, { lineGap: 3 });
    });

    args.sections.forEach((section, index) => {
      doc.addPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#111111")
        .text(`${index + 1}. ${section.title}`, { lineGap: 4 });
      doc.moveDown();

      splitParagraphs(section.content).forEach((paragraph) => {
        doc
          .font("Helvetica")
          .fontSize(10.5)
          .fillColor("#222222")
          .text(paragraph, {
            align: "left",
            lineGap: 4,
          });
        doc.moveDown(0.8);
      });
    });

    addFooter(doc);
    doc.end();
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequest;
    const title = cleanText(body.title, "Procedural Response Packet").slice(0, 200);
    const sections = Array.isArray(body.sections)
      ? body.sections
          .slice(0, MAX_SECTIONS)
          .map((section) => ({
            title: cleanText(section.title, "Untitled Procedural Section").slice(0, 300),
            content: cleanText(section.content).slice(0, MAX_SECTION_CHARS),
          }))
          .filter((section) => section.title && section.content)
      : [];

    if (!title) {
      return NextResponse.json({ ok: false, error: "title is required." }, { status: 400 });
    }

    if (sections.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one generated section is required." },
        { status: 400 },
      );
    }

    const pdf = await renderPdf({
      title,
      sections,
      metrics: body.metrics ?? {},
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="procedural-fog-packet.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF export failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "PDF cannon jammed. Try the browser PDF exporter for this packet.",
      },
      { status: 500 },
    );
  }
}
