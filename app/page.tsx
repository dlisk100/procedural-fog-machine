"use client";

import { useMemo, useState } from "react";
import type { Domain, Stance } from "@/lib/types";

const SAMPLE_INPUT =
  "You are in violation of your lease due to an unauthorized pet. Remove the pet within 48 hours or face penalties.";

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

type CannonEvent =
  | {
      type: "log";
      message: string;
    }
  | {
      type: "metric";
      pages: number;
      admissions: number;
      fogIndex: number;
      questions: number;
      reviewBurden: string;
    }
  | {
      type: "shell";
      shell: number;
      total: number;
      title: string;
      message: string;
    }
  | {
      type: "section";
      title: string;
      content: string;
    }
  | {
      type: "done";
      html: string;
      message: string;
    }
  | {
      type: "error";
      message: string;
    };

const INITIAL_METRICS: MetricState = {
  pages: 0,
  admissions: 0,
  fogIndex: 0,
  questions: 0,
  reviewBurden: "0.0 hours",
};

function getDensityLabel(value: number): string {
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

function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
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

export default function Home() {
  const [threatText, setThreatText] = useState("");
  const [domain, setDomain] = useState<Domain>("housing");
  const [stance, setStance] = useState<Stance>("clarify");
  const [slopDensity, setSlopDensity] = useState(5);
  const [metrics, setMetrics] = useState<MetricState>(INITIAL_METRICS);
  const [logs, setLogs] = useState<string[]>(["Procedural munitions armed."]);
  const [sections, setSections] = useState<GeneratedPreviewSection[]>([]);
  const [finalHtml, setFinalHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");

  const densityLabel = useMemo(() => getDensityLabel(slopDensity), [slopDensity]);
  const statusLine = metricTone(metrics.fogIndex, isGenerating);
  const canReset = !isGenerating && (sections.length > 0 || logs.length > 1 || Boolean(error));

  function resetOutput() {
    setMetrics(INITIAL_METRICS);
    setLogs(["Procedural munitions armed."]);
    setSections([]);
    setFinalHtml("");
    setError("");
    setCompletionMessage("");
  }

  function applyEvent(event: CannonEvent) {
    if (event.type === "log") {
      setLogs((current) => [...current, event.message]);
      return;
    }

    if (event.type === "metric") {
      setMetrics({
        pages: event.pages,
        admissions: event.admissions,
        fogIndex: event.fogIndex,
        questions: event.questions,
        reviewBurden: event.reviewBurden,
      });
      return;
    }

    if (event.type === "shell") {
      setLogs((current) => [
        ...current,
        `${event.message} (${event.shell}/${event.total})`,
      ]);
      return;
    }

    if (event.type === "section") {
      setSections((current) => [
        ...current,
        {
          title: event.title,
          content: event.content,
        },
      ]);
      return;
    }

    if (event.type === "done") {
      setFinalHtml(event.html);
      setCompletionMessage(event.message);
      setLogs((current) => [...current, event.message]);
      return;
    }

    if (event.type === "error") {
      setError(event.message);
      setLogs((current) => [...current, `Error: ${event.message}`]);
    }
  }

  async function fireFogMachine() {
    setIsGenerating(true);
    resetOutput();
    setLogs(["Procedural munitions armed.", "Loading breech with courtesy clauses..."]);

    try {
      const response = await fetch("/api/cannon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threatText,
          domain,
          stance,
          slopDensity,
        }),
      });

      if (!response.body) {
        throw new Error("The cannon returned no stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        buffer += decoder.decode(result.value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed) {
            continue;
          }

          applyEvent(JSON.parse(trimmed) as CannonEvent);
        }
      }

      const remaining = buffer.trim();

      if (remaining) {
        applyEvent(JSON.parse(remaining) as CannonEvent);
      }
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
    <main className="min-h-[100dvh] bg-[#15130f] text-stone-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-5 border-b border-stone-700/70 pb-5 md:grid-cols-[1.4fr_0.6fr] md:items-end">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">
              Comedy-powered drafting support. Not legal advice.
            </p>
            <h1 className="text-4xl font-black tracking-tight text-stone-50 md:text-6xl">
              The Procedural Fog Machine
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300">
              Turn scary messages into polite, non-admitting bureaucratic mist.
            </p>
          </div>
          <div className="border border-amber-200/20 bg-stone-950/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-400">
              Cannon Status
            </p>
            <p className="mt-2 text-xl font-bold text-amber-200">{statusLine}</p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.25fr]">
          <section className="border border-stone-700 bg-[#211d17] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Input Bay</h2>
                <p className="mt-1 text-sm text-stone-400">
                  Feed the machine. It will respond with excessive procedural calm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setThreatText(SAMPLE_INPUT)}
                disabled={isGenerating}
                className="border border-stone-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-200 transition hover:border-amber-300 hover:text-amber-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sample
              </button>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-stone-200">
                  Paste the scary message
                </span>
                <textarea
                  value={threatText}
                  onChange={(event) => setThreatText(event.target.value)}
                  disabled={isGenerating}
                  rows={10}
                  className="min-h-52 resize-y border border-stone-600 bg-stone-950/80 px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Paste the threatening portal message, stern landlord note, compliance memo, or suspiciously confident administrative thunderclap."
                />
              </label>

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
                    {slopDensity}/10, {densityLabel}
                  </span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={slopDensity}
                  onChange={(event) => setSlopDensity(Number(event.target.value))}
                  disabled={isGenerating}
                  className="h-2 w-full accent-amber-300 disabled:opacity-60"
                />
              </label>

              {error ? (
                <div className="border border-red-300/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={fireFogMachine}
                disabled={isGenerating}
                className="min-h-14 border border-amber-200 bg-amber-300 px-5 py-4 text-left text-base font-black uppercase tracking-[0.12em] text-stone-950 shadow-[6px_6px_0_rgba(120,53,15,0.55)] transition hover:-translate-y-0.5 hover:bg-amber-200 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isGenerating ? "FIRING THE FOG MACHINE..." : "FIRE THE FOG MACHINE"}
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                {canReset ? (
                  <button
                    type="button"
                    onClick={resetOutput}
                    className="border border-stone-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-stone-200 transition hover:border-stone-300 active:translate-y-[1px]"
                  >
                    Reset
                  </button>
                ) : null}
                {finalHtml ? (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="border border-amber-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-amber-200 transition hover:bg-amber-300 hover:text-stone-950 active:translate-y-[1px]"
                  >
                    Print / Export
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-5">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <MetricCard label="Estimated Pages" value={String(metrics.pages)} />
              <MetricCard label="Admissions Made" value={String(metrics.admissions)} />
              <MetricCard label="Procedural Fog Index" value={String(metrics.fogIndex)} />
              <MetricCard label="Clarifying Questions" value={String(metrics.questions)} />
              <MetricCard label="Estimated Review Burden" value={metrics.reviewBurden} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
              <section className="min-h-72 border border-stone-700 bg-stone-950 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Live Shell Log</h2>
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-amber-300">
                    {isGenerating ? "Active" : "Armed"}
                  </span>
                </div>
                <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1 font-mono text-xs leading-5 text-stone-300">
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

              <section className="min-h-[620px] border border-stone-700 bg-[#e9dfc9] p-3 text-stone-950 sm:p-5">
                <div className="mx-auto min-h-[590px] max-w-3xl border border-stone-400 bg-[#fffaf0] px-5 py-6 shadow-[8px_8px_0_rgba(68,64,60,0.22)] sm:px-8">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-amber-900">
                    Comedy-powered drafting support. Not legal advice.
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight">
                    Procedural Response Packet
                  </h2>
                  <p className="mt-2 border-b border-stone-300 pb-4 font-mono text-xs uppercase tracking-[0.12em] text-stone-600">
                    Admissions made: 0
                  </p>

                  {completionMessage ? (
                    <div className="mt-4 border border-emerald-800 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950">
                      {completionMessage}
                    </div>
                  ) : null}

                  {sections.length === 0 ? (
                    <div className="mt-16 border border-dashed border-stone-400 px-5 py-8 text-center">
                      <p className="text-lg font-bold">Awaiting shell impact.</p>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                        Generated sections will assemble here into a formal packet while the
                        logs report every plume of procedural mist.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-8">
                      {sections.map((section, index) => (
                        <article key={`${section.title}-${index}`} className="break-inside-avoid">
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-700 bg-[#211d17] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="min-h-8 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-black text-amber-200">{value}</p>
    </div>
  );
}
