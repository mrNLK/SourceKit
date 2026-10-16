export interface StrategyProgressStep { step: string; detail: string; elapsed?: number }

/** Parse the research-role SSE stream. Calls onProgress per step; resolves with the final result payload. */
export async function readStrategyStream(
  body: ReadableStream<Uint8Array>,
  onProgress: (s: StrategyProgressStep) => void,
): Promise<Record<string, unknown>> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let result: Record<string, unknown> | null = null;
  const handle = (chunk: string) => {
    const line = chunk.split("\n").find((l) => l.startsWith("data:"));
    if (!line) return;
    const evt = JSON.parse(line.slice(5).trim());
    if (evt.type === "progress") onProgress({ step: evt.step, detail: evt.detail, elapsed: evt.elapsed });
    else if (evt.type === "result") { const { type: _t, ...rest } = evt; result = rest; }
    else if (evt.type === "error") throw new Error(evt.error || "Strategy generation failed");
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) { handle(buf.slice(0, i)); buf = buf.slice(i + 2); }
    if (done) break;
  }
  if (buf.trim()) handle(buf);
  if (!result) throw new Error("Strategy stream ended without a result");
  return result;
}
