type OpenRouterRole = "system" | "user" | "assistant";

export type OpenRouterMessage = {
  role: OpenRouterRole;
  content: string;
};

export type OpenRouterOptions = {
  model?: string;
  temperature?: number;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export const OPENROUTER_OUTLINE_MODEL =
  process.env.OPENROUTER_OUTLINE_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "openrouter/auto";

export const OPENROUTER_SECTION_MODEL =
  process.env.OPENROUTER_SECTION_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "openrouter/auto";

function extractAssistantContent(payload: OpenRouterResponse): string {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();
  }

  return "";
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: options.temperature,
    }),
    cache: "no-store",
  });

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
    throw new Error("OpenRouter response did not include assistant content.");
  }

  return content;
}
