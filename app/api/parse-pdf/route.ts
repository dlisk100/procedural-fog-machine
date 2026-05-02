import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import type { ParsedPdfResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 60_000;

function jsonResponse(body: ParsedPdfResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: "No PDF file uploaded." }, 400);
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return jsonResponse({ ok: false, error: "Please upload a PDF file." }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        { ok: false, error: "PDF is too large. Max size is 10 MB." },
        400,
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const result = await extractText(pdf, { mergePages: true });
    const cleanedText = result.text
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const truncated = cleanedText.length > MAX_EXTRACTED_CHARS;
    const text = truncated ? cleanedText.slice(0, MAX_EXTRACTED_CHARS) : cleanedText;
    const warning =
      text.length < 300
        ? "This PDF appears to be scanned or image-only. Paste text manually or use a selectable-text PDF."
        : truncated
          ? "Extracted text was truncated for generation reliability."
          : undefined;

    return jsonResponse({
      ok: true,
      filename: file.name,
      totalPages: result.totalPages,
      charCount: cleanedText.length,
      truncated,
      text,
      warning,
    });
  } catch (error) {
    console.error("PDF parsing failed:", error);
    return jsonResponse(
      {
        ok: false,
        error:
          "Could not parse this PDF. Try a selectable-text PDF or paste the relevant text manually.",
      },
      500,
    );
  }
}
