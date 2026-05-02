"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type {
  CannonOutline,
  Domain,
  GeneratedSection,
  OutlineSection,
  ParsedPdfResponse,
  Stance,
} from "@/lib/types";

const SAMPLE_INPUT =
  "You are in violation of your lease due to an unauthorized pet. Remove the pet within 48 hours or face penalties.";
const JAMMED_SECTION_CONTENT =
  "This shell jammed briefly, but the procedural fog remains intact. Please regard this section as a courteous placeholder preserving the packet's ceremonial continuity without adding facts, admissions, threats, citations, or unnecessary confidence.";
const SECTION_RETRY_DELAYS_MS = [1500, 4000, 8000];
const BASE_SECTION_CONCURRENCY = 6;
const INFLATE_CONCURRENCY = 4;
const MAX_PDF_EXPORT_PAYLOAD_BYTES = 3_900_000;

const GENERATION_STATUS_MESSAGES = [
  "Writing slop.",
  "Creating a bureaucratic morass.",
  "Generating legalese.",
  "Pressurizing passive voice.",
  "Indexing needless caveats.",
  "Preparing non-admission vapor.",
  "Routing clauses through committee.",
  "Packing the appendix chamber.",
  "Stacking clarifying inquiries.",
  "Reheating municipal tone.",
  "Drafting procedural fog.",
  "Increasing whereas density.",
  "Calibrating politeness artillery.",
  "Manufacturing administrative overburden.",
  "Loading courtesy clauses.",
  "Compounding definitional ambiguity.",
  "Casting formal mist.",
  "Reinforcing admissions at zero.",
  "Assembling a compliance labyrinth.",
  "Deploying paperwork weather.",
  "Auditing the caveat reservoir.",
  "Reclassifying simple nouns.",
  "Spooling ceremonial review burden.",
  "Converting panic into packet.",
  "Escalating through formatting standards.",
  "Distilling pure procedural surface area.",
];

const DOMAIN_OPTIONS: Array<{ value: Domain; label: string }> = [
  { value: "housing", label: "Housing" },
  { value: "workplace", label: "Workplace" },
  { value: "school", label: "School / University" },
  { value: "insurance", label: "Insurance" },
  { value: "vendor", label: "Vendor / Contractor" },
  { value: "customer_support", label: "Customer Support" },
  { value: "platform", label: "Platform / Account Ban" },
  { value: "other", label: "Other" },
];

const STANCE_OPTIONS: Array<{ value: Stance; label: string }> = [
  { value: "clarify", label: "Ask for clarification" },
  { value: "deny_without_admitting", label: "Deny without admitting" },
  { value: "negotiate", label: "Negotiate" },
  { value: "comply_preserve_rights", label: "Comply while preserving rights" },
  { value: "request_evidence", label: "Request evidence" },
  { value: "maximum_bureaucracy", label: "Maximum bureaucracy" },
];

type MetricState = {
  pages: number;
  admissions: number;
  fogIndex: number;
  questions: number;
  reviewBurden: string;
};

type GeneratedPreviewSection = {
  title: string;
  content: string;
};

type PdfStatus = "idle" | "extracting" | "extracted" | "error";

type PdfMeta = {
  totalPages: number;
  charCount: number;
  truncated: boolean;
};

type ProgressState = {
  label: string;
  current: number;
  total: number;
};

type OutlineApiResponse =
  | {
      ok: true;
      outline: CannonOutline;
      fallback: boolean;
      warning?: string;
    }
  | {
      ok: false;
      error: string;
    };

type SectionApiResponse =
  | {
      ok: true;
      section: GeneratedSection;
      shell: number;
      total: number;
      placeholder: boolean;
      warning?: string;
    }
  | {
      ok: false;
      error: string;
    };

type SectionStreamEvent =
  | {
      type: "chunk";
      content: string;
    }
  | {
      type: "done";
      title: string;
      content: string;
      placeholder?: boolean;
      warning?: string;
    };

type InflateApiResponse =
  | {
      ok: true;
      addendum: GeneratedSection;
      placeholder: boolean;
      warning?: string;
    }
  | {
      ok: false;
      error: string;
    };

type CannonRequestPayload = {
  threatText: string;
  domain: Domain;
  stance: Stance;
  slopDensity: number;
  governingDocumentText: string;
  governingDocumentName: string;
};

const INITIAL_METRICS: MetricState = {
  pages: 0,
  admissions: 0,
  fogIndex: 0,
  questions: 0,
  reviewBurden: "0.0 hours",
};

function getDensityLabel(value: number): string {
  if (value === 11) {
    return "This one goes to eleven";
  }

  if (value <= 2) {
    return "Human-ish";
  }

  if (value <= 4) {
    return "Annoyingly formal";
  }

  if (value <= 6) {
    return "HR department";
  }

  if (value <= 8) {
    return "Municipal zoning board";
  }

  return "Appendix Singularity";
}

function formatDensityValue(value: number): string {
  if (value === 11) {
    return "11/10, This one goes to eleven";
  }

  return `${value}/10, ${getDensityLabel(value)}`;
}

function getLiveStatus(args: {
  isGenerating: boolean;
  completionMessage: string;
  error: string;
}): string {
  if (args.error) {
    return "Fog machine jammed.";
  }

  if (args.isGenerating) {
    return "Fog machine active. Please stand clear of the appendices.";
  }

  if (args.completionMessage) {
    return "Cannon discharged. Bureaucracy deployed.";
  }

  return "Awaiting procedural provocation.";
}

function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldRetrySectionError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("load failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("request failed (502)") ||
    normalized.includes("request failed (503)") ||
    normalized.includes("request failed (504)") ||
    normalized.includes("returned a non-json response")
  );
}

function metricTone(fogIndex: number, isGenerating: boolean): string {
  if (isGenerating) {
    return "Fog density rising.";
  }

  if (fogIndex > 0) {
    return "Admissions remain at zero.";
  }

  return "Procedural munitions armed.";
}

function calculateClientMetrics(
  generatedSections: GeneratedPreviewSection[],
  progress: number,
): MetricState {
  const content = generatedSections.map((section) => section.content).join("\n\n");
  const pages = Math.ceil(content.length / 2600);
  const questions = content.match(/\?/g)?.length ?? 0;
  const fogIndex = Math.min(99, Math.round(65 + progress * 34));
  const reviewBurden = `${(pages * 0.12).toFixed(1)} hours`;

  return {
    pages,
    admissions: 0,
    fogIndex,
    questions,
    reviewBurden,
  };
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        const item = items[index];

        if (item) {
          await worker(item, index);
        }
      }
    }),
  );
}

async function fetchSectionResult(args: {
  requestPayload: CannonRequestPayload;
  section: OutlineSection;
  shell: number;
  total: number;
  onRetry?: (message: string) => void;
}): Promise<SectionApiResponse> {
  let warning = "The section request failed unexpectedly.";

  for (let attempt = 0; attempt <= SECTION_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const sectionResponse = await fetch("/api/cannon/section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: args.requestPayload,
          section: args.section,
          sectionNumber: args.shell,
          totalSections: args.total,
        }),
        cache: "no-store",
      });

      return await readJsonResponse<SectionApiResponse>(
        sectionResponse,
        `Shell ${args.shell} request`,
      );
    } catch (error) {
      warning =
        error instanceof Error ? error.message : "The section request failed unexpectedly.";

      const retryDelay = SECTION_RETRY_DELAYS_MS[attempt];
      if (retryDelay && shouldRetrySectionError(warning)) {
        args.onRetry?.(
          `Shell ${args.shell} connection hiccup: ${warning}. Re-pressurizing in ${Math.round(
            retryDelay / 1000,
          )}s...`,
        );
        await sleep(retryDelay);
        continue;
      }

      break;
    }
  }

  return {
    ok: true,
    section: {
      title: args.section.title,
      content: JAMMED_SECTION_CONTENT,
    },
    shell: args.shell,
    total: args.total,
    placeholder: true,
    warning,
  };
}

async function fetchStreamingSectionResult(args: {
  requestPayload: CannonRequestPayload;
  section: OutlineSection;
  shell: number;
  total: number;
  onChunk: (content: string) => void;
  onRetry?: (message: string) => void;
}): Promise<SectionApiResponse> {
  try {
    const response = await fetch("/api/cannon/section-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request: args.requestPayload,
        section: args.section,
        sectionNumber: args.shell,
        totalSections: args.total,
      }),
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      throw new Error(`Streaming shell ${args.shell} failed (${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let placeholder = false;
    let warning = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
          continue;
        }

        let event: SectionStreamEvent;

        try {
          event = JSON.parse(line) as SectionStreamEvent;
        } catch {
          continue;
        }

        if (event.type === "chunk") {
          content += event.content;
          args.onChunk(content);
        }

        if (event.type === "done") {
          content = event.content || content;
          placeholder = Boolean(event.placeholder);
          warning = event.warning ?? warning;
          args.onChunk(content);
        }
      }
    }

    if (!content.trim()) {
      throw new Error("Streaming shell ended without section content.");
    }

    return {
      ok: true,
      section: {
        title: args.section.title,
        content,
      },
      shell: args.shell,
      total: args.total,
      placeholder,
      warning,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Streaming section request failed.";

    args.onRetry?.(
      `Shell ${args.shell} streaming plume wobbled: ${message}. Falling back to sealed section request...`,
    );

    return fetchSectionResult({
      requestPayload: args.requestPayload,
      section: args.section,
      shell: args.shell,
      total: args.total,
      onRetry: args.onRetry,
    });
  }
}

async function fetchInflateResult(args: {
  requestPayload: CannonRequestPayload;
  section: GeneratedPreviewSection;
  sectionNumber: number;
  addendumNumber: number;
  onRetry?: (message: string) => void;
}): Promise<InflateApiResponse> {
  let warning = "The second-volley request failed unexpectedly.";

  for (let attempt = 0; attempt <= SECTION_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch("/api/cannon/inflate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threatText: args.requestPayload.threatText,
          domain: args.requestPayload.domain,
          stance: args.requestPayload.stance,
          governingDocumentText: args.requestPayload.governingDocumentText,
          governingDocumentName: args.requestPayload.governingDocumentName,
          sectionTitle: args.section.title,
          sectionContent: args.section.content,
          addendumNumber: args.addendumNumber,
        }),
        cache: "no-store",
      });

      return await readJsonResponse<InflateApiResponse>(
        response,
        `Inflation request ${args.sectionNumber}`,
      );
    } catch (error) {
      warning =
        error instanceof Error ? error.message : "The second-volley request failed unexpectedly.";

      const retryDelay = SECTION_RETRY_DELAYS_MS[attempt];
      if (retryDelay && shouldRetrySectionError(warning)) {
        args.onRetry?.(
          `Inflation volley ${args.sectionNumber} connection hiccup: ${warning}. Re-pressurizing in ${Math.round(
            retryDelay / 1000,
          )}s...`,
        );
        await sleep(retryDelay);
        continue;
      }

      break;
    }
  }

  return {
    ok: true,
    addendum: {
      title: `Supplemental Addendum ${args.addendumNumber}: Additional Procedural Fog for ${args.section.title}`,
      content: JAMMED_SECTION_CONTENT,
    },
    placeholder: true,
    warning,
  };
}

async function readJsonResponse<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${text.slice(0, 240)}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label} returned a non-JSON response: ${text.slice(0, 240)}`);
  }
}

export default function Home() {
  const [threatText, setThreatText] = useState("");
  const [domain, setDomain] = useState<Domain>("housing");
  const [stance, setStance] = useState<Stance>("maximum_bureaucracy");
  const [slopDensity, setSlopDensity] = useState(10);
  const [metrics, setMetrics] = useState<MetricState>(INITIAL_METRICS);
  const [logs, setLogs] = useState<string[]>(["Procedural munitions armed."]);
  const [sections, setSections] = useState<GeneratedPreviewSection[]>([]);
  const [finalHtml, setFinalHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [pdfExportMessage, setPdfExportMessage] = useState("");
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [governingDocumentText, setGoverningDocumentText] = useState("");
  const [governingDocumentName, setGoverningDocumentName] = useState("");
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [pdfWarning, setPdfWarning] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [pdfMeta, setPdfMeta] = useState<PdfMeta | null>(null);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [shellProgress, setShellProgress] = useState<ProgressState | null>(null);

  const densityLabel = useMemo(() => formatDensityValue(slopDensity), [slopDensity]);
  const statusLine = isGenerating
    ? (GENERATION_STATUS_MESSAGES[statusMessageIndex] ?? "Writing slop.")
    : metricTone(metrics.fogIndex, isGenerating);
  const liveStatus = getLiveStatus({ isGenerating, completionMessage, error });
  const canReset = !isGenerating && (sections.length > 0 || logs.length > 1 || Boolean(error));

  useEffect(() => {
    if (!isGenerating) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setStatusMessageIndex((current) => (current + 1) % GENERATION_STATUS_MESSAGES.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, [isGenerating]);

  function resetOutput() {
    setMetrics(INITIAL_METRICS);
    setLogs(["Procedural munitions armed."]);
    setSections([]);
    setFinalHtml("");
    setError("");
    setCompletionMessage("");
    setCopyMessage("");
    setPdfExportMessage("");
    setShellProgress(null);
  }

  async function copyPlainText() {
    if (sections.length === 0) {
      return;
    }

    const plainText = sections
      .map((section, index) => `${index + 1}. ${section.title}\n\n${section.content}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(plainText);
      setCopyMessage("Generated packet text copied.");
    } catch {
      setCopyMessage("Copy failed. Browser clipboard permission may be unavailable.");
    }
  }

  async function downloadCeremonialPdf() {
    if (sections.length === 0) {
      return;
    }

    setPdfExportMessage("PDF cannon warming ceremonial rollers...");

    try {
      const payload = {
        title: "Procedural Response Packet",
        sections,
        metrics: {
          pages: metrics.pages,
          questions: metrics.questions,
          fogIndex: metrics.fogIndex,
          reviewBurden: metrics.reviewBurden,
        },
      };
      const payloadText = JSON.stringify(payload);

      if (new Blob([payloadText]).size > MAX_PDF_EXPORT_PAYLOAD_BYTES) {
        setPdfExportMessage(
          "This packet is too enormous for hosted PDF download. Opening the browser PDF exporter.",
        );
        window.print();
        return;
      }

      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadText,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "procedural-fog-packet.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPdfExportMessage("Ceremonial PDF downloaded.");
    } catch {
      setPdfExportMessage(
        "PDF cannon jammed. Opening the browser PDF exporter for this packet.",
      );
      window.print();
    }
  }

  async function handlePdfUpload(file: File) {
    setPdfStatus("extracting");
    setPdfError("");
    setPdfWarning("");
    setPdfMeta(null);
    setGoverningDocumentName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ParsedPdfResponse;

      if (!result.ok) {
        setPdfStatus("error");
        setPdfError("The Fog Machine choked on this PDF. Paste text manually and continue.");
        setLogs((current) => [...current, `PDF parsing note: ${result.error}`]);
        return;
      }

      setGoverningDocumentText(result.text);
      setGoverningDocumentName(result.filename);
      setPdfMeta({
        totalPages: result.totalPages,
        charCount: result.charCount,
        truncated: result.truncated,
      });
      setPdfWarning(
        result.warning
          ? result.text.length < 300
            ? "Selectable text was thin. The document may be scanned. Manual paste recommended."
            : result.warning
          : "",
      );
      setPdfStatus("extracted");
    } catch {
      setPdfStatus("error");
      setPdfError("The Fog Machine choked on this PDF. Paste text manually and continue.");
    }
  }

  async function fireFogMachine() {
    if (threatText.trim().length < 5) {
      setError("Paste at least five characters so the machine has something to over-process.");
      return;
    }

    setIsGenerating(true);
    setStatusMessageIndex(0);
    resetOutput();
    setLogs([
      "Procedural munitions armed.",
      "Loading breech with courtesy clauses...",
      "Requesting outline fire-control coordinates...",
    ]);

    try {
      const requestPayload = {
        threatText,
        domain,
        stance,
        slopDensity,
        governingDocumentText,
        governingDocumentName,
      };
      const outlineResponse = await fetch("/api/cannon/outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      const outlineResult = await readJsonResponse<OutlineApiResponse>(
        outlineResponse,
        "Outline request",
      );

      if (!outlineResult.ok) {
        throw new Error(outlineResult.error);
      }

      if (outlineResult.warning) {
        setLogs((current) => [...current, outlineResult.warning ?? "Fallback outline engaged."]);
      }

      const outline = outlineResult.outline;
      const outlineSections = outline.sections.slice(0, 24);
      setLogs((current) => [
        ...current,
        `Outline loaded: ${outlineSections.length} shells queued.`,
      ]);

      const generatedSections: GeneratedPreviewSection[] = outlineSections.map((section) => ({
        title: section.title,
        content: "",
      }));
      setSections([...generatedSections]);

      let launchedSections = 0;
      let completedSections = 0;
      const totalBaseSections = outlineSections.length;

      setLogs((current) => [
        ...current,
        `Launching base volley 1: shells 1-${Math.min(
          BASE_SECTION_CONCURRENCY,
          totalBaseSections,
        )}.`,
      ]);

      await runWithConcurrency(outlineSections, BASE_SECTION_CONCURRENCY, async (section, index) => {
        const shell = index + 1;
        const volley = Math.floor(index / BASE_SECTION_CONCURRENCY) + 1;
        launchedSections += 1;

        if (index > 0 && index % BASE_SECTION_CONCURRENCY === 0) {
          setLogs((current) => [
            ...current,
            `Launching base volley ${volley}: shells ${shell}-${Math.min(
              shell + BASE_SECTION_CONCURRENCY - 1,
              totalBaseSections,
            )}.`,
          ]);
        }

        setShellProgress({
          label: "Base",
          current: launchedSections,
          total: totalBaseSections,
        });
        setLogs((current) => [
          ...current,
          `Firing Shell ${shell}: ${section.title} (${shell}/${totalBaseSections})`,
        ]);

        const sectionResult = await fetchStreamingSectionResult({
          requestPayload,
          section,
          shell,
          total: totalBaseSections,
          onChunk: (content) => {
            generatedSections[index] = {
              title: section.title,
              content,
            };
            setSections([...generatedSections]);
            setMetrics(
              calculateClientMetrics(
                generatedSections,
                Math.max(completedSections / totalBaseSections, shell / totalBaseSections / 2),
              ),
            );
          },
          onRetry: (message) => {
            setLogs((current) => [...current, message]);
          },
        });

        if (!sectionResult.ok) {
          throw new Error(sectionResult.error);
        }

        if (sectionResult.placeholder && sectionResult.warning) {
          setLogs((current) => [
            ...current,
            `Shell ${shell} jammed briefly: ${sectionResult.warning}`,
          ]);
        }

        generatedSections[index] = sectionResult.section;
        completedSections += 1;
        setShellProgress({
          label: "Base",
          current: completedSections,
          total: totalBaseSections,
        });
        setSections([...generatedSections]);
        setMetrics(calculateClientMetrics(generatedSections, completedSections / totalBaseSections));
        setLogs((current) => [
          ...current,
          `Shell ${shell} reporting excessive paragraph pressure.`,
        ]);
      });

      if (slopDensity === 11) {
        setLogs((current) => [
          ...current,
          "Second volley authorized.",
          "Re-chambering the Appendix Goblin.",
        ]);

        const inflatedSections: GeneratedPreviewSection[] = generatedSections.flatMap((section) => [
          section,
          {
            title: `Supplemental Addendum ${generatedSections.indexOf(section) + 1}`,
            content: "",
          },
        ]);
        let launchedAddenda = 0;
        let completedAddenda = 0;
        const totalAddenda = generatedSections.length;
        setSections([...inflatedSections]);

        setLogs((current) => [
          ...current,
          `Launching second volley 1: addenda 1-${Math.min(
            INFLATE_CONCURRENCY,
            totalAddenda,
          )}.`,
        ]);

        await runWithConcurrency(generatedSections, INFLATE_CONCURRENCY, async (section, index) => {
          const addendumSlot = index * 2 + 1;
          const addendumNumber = index + 1;
          const volley = Math.floor(index / INFLATE_CONCURRENCY) + 1;
          launchedAddenda += 1;

          if (index > 0 && index % INFLATE_CONCURRENCY === 0) {
            setLogs((current) => [
              ...current,
              `Launching second volley ${volley}: addenda ${addendumNumber}-${Math.min(
                addendumNumber + INFLATE_CONCURRENCY - 1,
                totalAddenda,
              )}.`,
            ]);
          }

          setShellProgress({
            label: "Appendix",
            current: launchedAddenda,
            total: totalAddenda,
          });
          setLogs((current) => [
            ...current,
            `Inflating Section ${addendumNumber} beyond reasonable administrative necessity.`,
            "Deploying supplemental non-admission vapor.",
          ]);

          const inflateResult = await fetchInflateResult({
            requestPayload,
            section,
            sectionNumber: addendumNumber,
            addendumNumber,
            onRetry: (message) => {
              setLogs((current) => [...current, message]);
            },
          });

          if (!inflateResult.ok) {
            throw new Error(inflateResult.error);
          }

          if (inflateResult.placeholder && inflateResult.warning) {
            setLogs((current) => [
              ...current,
              `Second-volley addendum ${addendumNumber} jammed briefly: ${inflateResult.warning}`,
            ]);
          }

          inflatedSections[addendumSlot] = inflateResult.addendum;
          completedAddenda += 1;
          setShellProgress({
            label: "Appendix",
            current: completedAddenda,
            total: totalAddenda,
          });
          setSections([...inflatedSections]);
          setMetrics(
            calculateClientMetrics(
              inflatedSections,
              (totalBaseSections + completedAddenda) / (totalBaseSections + totalAddenda),
            ),
          );
        });

        generatedSections.splice(0, generatedSections.length, ...inflatedSections);
        setLogs((current) => [...current, "Quadrupling procedural surface area."]);
      }

      setFinalHtml("client-preview");
      setCompletionMessage("Cannon discharged. Bureaucracy deployed.");
      setLogs((current) => [...current, "Cannon discharged. Bureaucracy deployed."]);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "The fog machine jammed before producing paperwork.";

      setError(message);
      setLogs((current) => [...current, `Error: ${message}`]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell min-h-[100dvh] bg-[#15130f] text-stone-100">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="no-print border-b border-stone-700/70 pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 font-mono text-xs font-black uppercase tracking-[0.28em] text-amber-300">
                FLOOD THE ZONE
              </p>
              <h1 className="max-w-5xl text-4xl font-black leading-none tracking-tight text-stone-50 md:text-6xl">
                The Procedural Fog Machine
              </h1>
              <p className="mt-3 max-w-2xl text-base font-bold text-stone-300 md:text-lg">
                A Slop Cannon for bureaucratic self-defense. Not legal advice.
              </p>
            </div>
            <Image
              src="/brand/header-logo-options/header-logo-05.png"
              alt=""
              width={360}
              height={220}
              priority
              className="h-auto w-44 shrink-0 object-contain sm:w-56 lg:w-72"
            />
          </div>
        </header>

        {isGenerating || sections.length > 0 || finalHtml || error || completionMessage ? (
          <section className="no-print sticky top-0 z-20 border border-stone-700/80 bg-[#15130f]/95 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(220px,1.05fr)_minmax(0,2fr)] lg:items-center">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  Cannon Status
                </p>
                <p className="mt-1 text-base font-black text-stone-50">{liveStatus}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-amber-300">
                  {statusLine}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <CompactMetric
                  label="Progress"
                  value={
                    shellProgress
                      ? `${shellProgress.label} ${shellProgress.current}/${shellProgress.total}`
                      : "Ready"
                  }
                />
                <CompactMetric label="Pages" value={String(metrics.pages)} />
                <CompactMetric label="Admissions" value="0" />
                <CompactMetric label="Fog" value={`${metrics.fogIndex}/100`} />
                <CompactMetric label="Review" value={metrics.reviewBurden} />
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5">
          <section className="no-print border border-stone-700 bg-[#211d17] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-start justify-between gap-3 border-b border-stone-700 px-4 py-4 sm:px-5">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  Command Dock
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Preflight the cannon</h2>
                <p className="mt-1 text-sm text-stone-400">
                  Load source material, calibrate the stance, and authorize procedural fog.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setThreatText(SAMPLE_INPUT)}
                  disabled={isGenerating}
                  className="border border-stone-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-200 transition hover:border-amber-300 hover:text-amber-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sample
                </button>
                <button
                  type="button"
                  onClick={resetOutput}
                  disabled={!canReset}
                  className="border border-stone-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-200 transition hover:border-stone-300 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)] sm:p-5">
              <label className="grid content-start gap-2">
                <span className="text-sm font-semibold text-stone-200">
                  Paste the scary message
                </span>
                <textarea
                  value={threatText}
                  onChange={(event) => setThreatText(event.target.value)}
                  disabled={isGenerating}
                  rows={11}
                  className="min-h-80 resize-y border border-stone-600 bg-stone-950/80 px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Paste the threatening portal message, stern landlord note, compliance memo, or suspiciously confident administrative thunderclap."
                />
              </label>

              <section className="grid gap-3 border border-stone-700 bg-stone-950/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div>
                  <h3 className="text-base font-black tracking-tight text-stone-100">
                    Optional Fog Fuel
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-stone-400">
                    Upload a lease, policy, contract, or notice. Selectable-text PDFs work
                    best. No OCR. Max 4 MB on the hosted demo.
                  </p>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-stone-200">
                    Upload lease / policy / contract PDF
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={isGenerating || pdfStatus === "extracting"}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedPdfFile(file);
                      setPdfStatus("idle");
                      setPdfError("");
                      setPdfWarning("");
                      setPdfMeta(null);
                      setGoverningDocumentName(file?.name ?? "");
                    }}
                    className="w-full border border-stone-600 bg-stone-950/80 px-3 py-2 text-sm text-stone-200 file:mr-3 file:border-0 file:bg-amber-300 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.12em] file:text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <p className="font-mono text-xs text-stone-400">
                    {selectedPdfFile
                      ? `Selected: ${selectedPdfFile.name}`
                      : "No PDF selected. Manual paste remains fully authorized."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPdfFile) {
                        void handlePdfUpload(selectedPdfFile);
                      }
                    }}
                    disabled={!selectedPdfFile || isGenerating || pdfStatus === "extracting"}
                    className="border border-stone-600 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-100 transition hover:border-amber-300 hover:text-amber-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {pdfStatus === "extracting" ? "Extracting..." : "Extract PDF Fog Fuel"}
                  </button>
                </div>

                <div className="grid gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-stone-500">
                    {pdfStatus === "idle"
                      ? "Idle"
                      : pdfStatus === "extracting"
                        ? "Extracting..."
                        : pdfStatus === "extracted" && pdfMeta
                          ? `PDF digested: ${pdfMeta.totalPages} pages, ${pdfMeta.charCount.toLocaleString()} characters of procedural nutrients.`
                          : "PDF extraction needs manual backup."}
                  </p>
                  {pdfWarning ? (
                    <p className="border border-amber-300/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                      {pdfWarning}
                    </p>
                  ) : null}
                  {pdfError ? (
                    <p className="border border-red-300/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                      {pdfError}
                    </p>
                  ) : null}
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-stone-200">
                    Extracted governing document text
                  </span>
                  <textarea
                    value={governingDocumentText}
                    onChange={(event) => {
                      setGoverningDocumentText(event.target.value);
                      if (event.target.value.trim() && !governingDocumentName) {
                        setGoverningDocumentName("Manual governing document context");
                      }
                    }}
                    disabled={isGenerating}
                    rows={5}
                    className="min-h-32 resize-y border border-stone-600 bg-stone-950/80 px-3 py-3 text-xs leading-5 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="Paste optional lease, policy, contract, notice, or clause text here. The cannon will treat it as user-provided context, not legal authority."
                  />
                </label>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-stone-200">Domain</span>
                  <select
                    value={domain}
                    onChange={(event) => setDomain(event.target.value as Domain)}
                    disabled={isGenerating}
                    className="h-11 border border-stone-600 bg-stone-950/80 px-3 text-sm text-stone-100 outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-stone-200">Stance</span>
                  <select
                    value={stance}
                    onChange={(event) => setStance(event.target.value as Stance)}
                    disabled={isGenerating}
                    className="h-11 border border-stone-600 bg-stone-950/80 px-3 text-sm text-stone-100 outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {STANCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-3">
                <span className="flex items-center justify-between gap-3 text-sm font-semibold text-stone-200">
                  <span>Slop Density</span>
                  <span className="font-mono text-amber-200">
                    {densityLabel}
                  </span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="11"
                  value={slopDensity}
                  onChange={(event) => setSlopDensity(Number(event.target.value))}
                  disabled={isGenerating}
                  className="h-2 w-full accent-amber-300 disabled:opacity-60"
                />
              </label>

              {error ? (
                <div className="border border-red-300/40 bg-red-950/30 px-3 py-2 text-sm text-red-100 lg:col-span-2">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={fireFogMachine}
                disabled={isGenerating}
                className="flex min-h-16 w-full items-center justify-between gap-4 border border-amber-200 bg-amber-300 px-5 py-4 text-left text-base font-black uppercase tracking-[0.12em] text-stone-950 shadow-[6px_6px_0_rgba(120,53,15,0.55)] transition hover:-translate-y-0.5 hover:bg-amber-200 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 lg:col-span-2"
              >
                <span>{isGenerating ? "FIRING SHELLS..." : "FIRE THE SLOP CANNON"}</span>
                <Image
                  src="/brand/cta-icon-options/cta-icon-01.png"
                  alt=""
                  width={96}
                  height={96}
                  className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
                />
              </button>

            </div>
          </section>

          <section className="grid gap-5">
            <div className="grid gap-5">
              <section className="no-print min-h-72 border border-stone-700 bg-stone-950 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Live Shell Log</h2>
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-amber-300">
                    {isGenerating ? "Active" : "Armed"}
                  </span>
                </div>
                <div
                  className={`space-y-2 overflow-y-auto pr-1 font-mono text-xs leading-5 text-stone-300 ${
                    isGenerating ? "max-h-[360px]" : "max-h-40"
                  }`}
                >
                  {logs.map((log, index) => (
                    <div
                      key={`${log}-${index}`}
                      className="border-l border-amber-300/40 bg-stone-900/70 px-3 py-2"
                    >
                      <span className="text-amber-300">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      {log}
                    </div>
                  ))}
                </div>
              </section>

              <section className="document-preview-shell min-h-[760px] border border-stone-700 bg-[#e9dfc9] p-3 text-stone-950 sm:p-5 lg:p-7">
                <div className="no-print -mx-3 mb-4 grid gap-3 border-b border-stone-400/70 bg-[#e9dfc9] px-3 py-2 sm:-mx-5 sm:px-5 lg:-mx-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-7">
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-stone-600">
                      Packet Theater
                    </p>
                    <h2 className="mt-0.5 text-xl font-black tracking-tight text-stone-950">
                      Generated packet
                    </h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={copyPlainText}
                      disabled={sections.length === 0}
                      className="border border-stone-700 bg-[#fffaf0] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-950 transition hover:bg-amber-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy Plain Text
                    </button>
                    <button
                      type="button"
                      onClick={downloadCeremonialPdf}
                      disabled={sections.length === 0}
                      className="border border-stone-700 bg-[#fffaf0] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-stone-950 transition hover:bg-amber-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Download Ceremonial PDF
                    </button>
                  </div>
                </div>
                {copyMessage ? (
                  <p className="no-print mb-3 border border-stone-500 bg-[#fffaf0] px-3 py-2 text-sm font-bold text-stone-900">
                    {copyMessage}
                  </p>
                ) : null}
                {pdfExportMessage ? (
                  <p className="no-print mb-3 border border-stone-500 bg-[#fffaf0] px-3 py-2 text-sm font-bold text-stone-900">
                    {pdfExportMessage}
                  </p>
                ) : null}
                <div className="document-preview mx-auto min-h-[720px] max-w-6xl border border-stone-400 bg-[#fffaf0] px-6 py-8 shadow-[10px_10px_0_rgba(68,64,60,0.18)] sm:px-10 lg:px-14">
                  <h2 className="document-title text-3xl font-black tracking-tight">
                    Procedural Response Packet
                  </h2>
                  <div className="document-metadata mt-4 grid gap-2 border-y border-stone-300 py-4 font-mono text-xs uppercase tracking-[0.1em] text-stone-700 sm:grid-cols-3">
                    <p>
                      <span className="block text-stone-500">Packet Status</span>
                      Procedurally Overbuilt
                    </p>
                    <p>
                      <span className="block text-stone-500">Tone</span>
                      Weaponized Politeness
                    </p>
                    <p>
                      <span className="block text-stone-500">Admissions</span>0
                    </p>
                  </div>

                  {completionMessage ? (
                    <div className="no-print mt-4 border border-emerald-800 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950">
                      {completionMessage}
                    </div>
                  ) : null}

                  {sections.length === 0 ? (
                    <div className="empty-preview mt-16 border border-dashed border-stone-400 px-5 py-8 text-center">
                      <p className="text-lg font-bold">
                        {isGenerating ? "Formal packet condensing..." : "Awaiting shell impact."}
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                        {isGenerating
                          ? "The machine is pressurizing passive voice and checking that admissions remain precisely absent."
                          : "Generated sections will assemble here into a formal packet while the logs report every plume of procedural mist."}
                      </p>
                      {isGenerating ? (
                        <div className="mx-auto mt-6 grid max-w-md gap-2">
                          <div className="h-3 animate-pulse bg-stone-300" />
                          <div className="h-3 animate-pulse bg-stone-300 [animation-delay:120ms]" />
                          <div className="h-3 w-2/3 animate-pulse bg-stone-300 [animation-delay:240ms]" />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-6 space-y-8">
                      {sections.map((section, index) => (
                        <article
                          key={`${section.title}-${index}`}
                          className="doc-section break-inside-avoid"
                        >
                          <h3 className="border-b border-stone-300 pb-2 text-xl font-black">
                            {index + 1}. {section.title}
                          </h3>
                          <div className="mt-4 space-y-4 text-[15px] leading-7 text-stone-800">
                            {splitParagraphs(section.content).map((paragraph, paragraphIndex) => (
                              <p key={paragraphIndex}>{paragraph}</p>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-700 bg-stone-950/70 px-3 py-2">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-black text-amber-200">{value}</p>
    </div>
  );
}
