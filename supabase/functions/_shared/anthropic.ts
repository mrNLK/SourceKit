const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_ANTHROPIC_MODEL =
  Deno.env.get("ANTHROPIC_MODEL")?.trim() || "claude-sonnet-4-20250514";
const FALLBACK_ANTHROPIC_MODELS: string[] = [
  "claude-sonnet-4-20250514",
  "claude-3-7-sonnet-20250219",
  "claude-3-7-sonnet-latest",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-20241022",
  "claude-3-5-haiku-latest",
  "claude-3-haiku-20240307",
];

interface AnthropicOptions {
  model?: string;
  maxTokens?: number;
}

function getApiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  return key;
}

function headers(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json",
  };
}

function getModelCandidates(model?: string): string[] {
  const candidates = [model?.trim(), DEFAULT_ANTHROPIC_MODEL, ...FALLBACK_ANTHROPIC_MODELS]
    .filter((candidate): candidate is string => Boolean(candidate && candidate.length > 0));
  return [...new Set(candidates)];
}

function parseAnthropicErrorMessage(errText: string): string {
  const fallback = errText.trim();
  if (!fallback) return "";
  try {
    const parsed = JSON.parse(errText);
    const message = parsed?.error?.message || parsed?.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  } catch {
    // noop: return raw text fallback
  }
  return fallback;
}

function formatAnthropicError(status: number, errText: string): string {
  const parsedMessage = parseAnthropicErrorMessage(errText);
  if (!parsedMessage) return `Anthropic API error: ${status}`;
  return `Anthropic API error: ${status} - ${parsedMessage}`;
}

function shouldRetryWithAnotherModel(status: number, errText: string): boolean {
  if (status !== 400 && status !== 404) return false;
  const message = parseAnthropicErrorMessage(errText).toLowerCase();
  if (!message.includes("model")) return false;
  return (
    message.includes("invalid") ||
    message.includes("not found") ||
    message.includes("not available") ||
    message.includes("unsupported")
  );
}

/** Strip prompt injection patterns from user-supplied text */
function sanitizeInput(text: string): string {
  if (!text) return text;
  let sanitized = text
    // Strip XML-like system/role tags
    .replace(/<\/?(?:system|human|assistant|admin|root)>/gi, '')
    // Remove common injection phrases
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi, '')
    .replace(/disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi, '')
    .replace(/you\s+are\s+now\s+(in\s+)?/gi, '');
  // Truncate overly long inputs
  if (sanitized.length > 50000) {
    sanitized = sanitized.substring(0, 50000);
  }
  return sanitized;
}

// Non-streaming text completion
export async function anthropicCall(
  system: string,
  userPrompt: string,
  options?: AnthropicOptions
): Promise<string> {
  const apiKey = getApiKey();
  const sanitizedPrompt = sanitizeInput(userPrompt);
  const models = getModelCandidates(options?.model);
  let lastModelError: { status: number; text: string } | null = null;

  for (const model of models) {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens || 4096,
        system,
        messages: [{ role: "user", content: sanitizedPrompt }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text || "";
    }

    const errText = await res.text();
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (shouldRetryWithAnotherModel(res.status, errText)) {
      lastModelError = { status: res.status, text: errText };
      continue;
    }
    console.error("Anthropic API error:", res.status, errText);
    throw new Error(formatAnthropicError(res.status, errText));
  }

  const status = lastModelError?.status ?? 400;
  const text = lastModelError?.text ?? "No compatible Anthropic model available for this key.";
  console.error("Anthropic model fallback exhausted:", status, text);
  throw new Error(formatAnthropicError(status, text));
}

// Tool use completion
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export async function anthropicToolCall(
  system: string,
  userPrompt: string,
  tools: AnthropicTool[],
  toolChoice?: { type: "tool"; name: string },
  options?: AnthropicOptions
): Promise<{ toolName: string; toolInput: Record<string, unknown> } | null> {
  const apiKey = getApiKey();
  const sanitizedPrompt = sanitizeInput(userPrompt);
  const models = getModelCandidates(options?.model);
  let lastModelError: { status: number; text: string } | null = null;

  for (const model of models) {
    const body: Record<string, unknown> = {
      model,
      max_tokens: options?.maxTokens || 1024,
      system,
      messages: [{ role: "user", content: sanitizedPrompt }],
      tools,
    };
    if (toolChoice) body.tool_choice = toolChoice;

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const toolBlock = data.content?.find(
        (block: any) => block.type === "tool_use"
      );
      if (!toolBlock) return null;
      return { toolName: toolBlock.name, toolInput: toolBlock.input };
    }

    const errText = await res.text();
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (shouldRetryWithAnotherModel(res.status, errText)) {
      lastModelError = { status: res.status, text: errText };
      continue;
    }
    console.error("Anthropic API error:", res.status, errText);
    throw new Error(formatAnthropicError(res.status, errText));
  }

  const status = lastModelError?.status ?? 400;
  const text = lastModelError?.text ?? "No compatible Anthropic model available for this key.";
  console.error("Anthropic tool model fallback exhausted:", status, text);
  throw new Error(formatAnthropicError(status, text));
}

// Streaming completion — returns a ReadableStream in OpenAI-compatible SSE format
// so the frontend (BulkActionsTab.tsx) needs zero changes
export async function anthropicStream(
  system: string,
  userPrompt: string,
  options?: AnthropicOptions
): Promise<ReadableStream> {
  const apiKey = getApiKey();
  const sanitizedPrompt = sanitizeInput(userPrompt);
  const models = getModelCandidates(options?.model);
  let res: Response | null = null;
  let lastModelError: { status: number; text: string } | null = null;

  for (const model of models) {
    const candidate = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens || 4096,
        system,
        messages: [{ role: "user", content: sanitizedPrompt }],
        stream: true,
      }),
    });

    if (candidate.ok) {
      res = candidate;
      break;
    }

    const errText = await candidate.text();
    if (candidate.status === 429) throw new Error("RATE_LIMITED");
    if (shouldRetryWithAnotherModel(candidate.status, errText)) {
      lastModelError = { status: candidate.status, text: errText };
      continue;
    }
    console.error("Anthropic streaming error:", candidate.status, errText);
    throw new Error(formatAnthropicError(candidate.status, errText));
  }

  if (!res) {
    const status = lastModelError?.status ?? 400;
    const text = lastModelError?.text ?? "No compatible Anthropic model available for this key.";
    console.error("Anthropic streaming model fallback exhausted:", status, text);
    throw new Error(formatAnthropicError(status, text));
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async pull(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);

          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "content_block_delta" && event.delta?.text) {
              // Re-emit as OpenAI-compatible SSE format
              const openAiChunk = JSON.stringify({
                choices: [{ index: 0, delta: { content: event.delta.text } }],
              });
              controller.enqueue(encoder.encode(`data: ${openAiChunk}\n\n`));
            } else if (event.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              reader.cancel();
              return;
            }
          } catch {
            // Partial JSON, continue buffering
          }
        }
      }
    },
  });
}
