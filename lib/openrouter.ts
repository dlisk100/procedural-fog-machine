type OpenRouterRole = "system" | "user" | "assistant";

export type OpenRouterMessage = {
  role: OpenRouterRole;
  content: string;
};

export type OpenRouterOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

type OpenRouterResponse = {
  choices?: Array<{
    finish_reason?: string;
    native_finish_reason?: string;
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
      reasoning?: string;
      refusal?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export const DEFAULT_OPENROUTER_MODEL = "x-ai/grok-4.3";

function normalizeOpenRouterModel(model: string | undefined): string {
  if (!model) {
    return DEFAULT_OPENROUTER_MODEL;
  }

  if (model.includes("grok-4.1")) {
    return DEFAULT_OPENROUTER_MODEL;
  }

  return model;
}

export const OPENROUTER_OUTLINE_MODEL = normalizeOpenRouterModel(
  process.env.OPENROUTER_OUTLINE_MODEL || process.env.OPENROUTER_MODEL,
);

export const OPENROUTER_SECTION_MODEL = normalizeOpenRouterModel(
  process.env.OPENROUTER_SECTION_MODEL || process.env.OPENROUTER_MODEL,
);

function extractAssistantContent(payload: OpenRouterResponse): string {
  const message = payload.choices?.[0]?.message;
  const content = message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" || !part.type ? part.text ?? "" : ""))
      .join("")
      .trim();
  }

  if (typeof message?.reasoning === "string") {
    return message.reasoning.trim();
  }

  return "";
}

function summarizeOpenRouterResponse(payload: OpenRouterResponse, responseText: string): string {
  const choice = payload.choices?.[0];
  const message = choice?.message;
  const content = message?.content;
  const contentShape = Array.isArray(content)
    ? `array(${content.length})`
    : content === null
      ? "null"
      : typeof content;
  const refusal = message?.refusal ? ` refusal=${message.refusal.slice(0, 120)}` : "";
  const finishReason = choice?.finish_reason || choice?.native_finish_reason || "unknown";
  const rawSnippet = responseText.slice(0, 500).replace(/\s+/g, " ");

  return `finish_reason=${finishReason}; content=${contentShape};${refusal} response=${rawSnippet}`;
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 45_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `OpenRouter request timed out after ${Math.round(timeoutMs / 1000)}s for model ${
          options.model || DEFAULT_OPENROUTER_MODEL
        }.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let payload: OpenRouterResponse = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as OpenRouterResponse;
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const detail =
      payload.error?.message || responseText || response.statusText || "Unknown error";
    throw new Error(`OpenRouter request failed (${response.status}): ${detail}`);
  }

  const content = extractAssistantContent(payload);

  if (!content) {
    throw new Error(
      `OpenRouter response did not include assistant content for model ${
        options.model || DEFAULT_OPENROUTER_MODEL
      }. ${summarizeOpenRouterResponse(payload, responseText)}`,
    );
  }

  return content;
}
