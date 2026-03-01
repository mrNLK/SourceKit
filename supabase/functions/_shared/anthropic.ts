const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

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
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      model: options?.model || "claude-haiku-4-5-20251001",
      max_tokens: options?.maxTokens || 4096,
      system,
      messages: [{ role: "user", content: sanitizedPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic API error:", res.status, errText);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
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
  const body: Record<string, unknown> = {
    model: options?.model || "claude-haiku-4-5-20251001",
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

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic API error:", res.status, errText);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const toolBlock = data.content?.find(
    (block: any) => block.type === "tool_use"
  );
  if (!toolBlock) return null;
  return { toolName: toolBlock.name, toolInput: toolBlock.input };
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
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      model: options?.model || "claude-haiku-4-5-20251001",
      max_tokens: options?.maxTokens || 4096,
      system,
      messages: [{ role: "user", content: sanitizedPrompt }],
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic streaming error:", res.status, errText);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`Anthropic API error: ${res.status}`);
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
