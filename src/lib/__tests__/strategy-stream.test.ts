import { describe, it, expect } from "vitest";
import { readStrategyStream } from "@/lib/strategy-stream";
const streamOf = (chunks: string[]) => new ReadableStream<Uint8Array>({ start(c) { const e = new TextEncoder(); chunks.forEach((x) => c.enqueue(e.encode(x))); c.close(); } });
describe("readStrategyStream", () => {
  it("reports progress and returns the result (split chunks)", async () => {
    const steps: string[] = [];
    const r = await readStrategyStream(streamOf([
      'data: {"type":"progress","step":"analyzing","detail":"a"}\n\ndata: {"type":"pro',
      'gress","step":"core","detail":"b"}\n\n',
      'data: {"type":"result","strategy":{"search_query":"q"},"job_title":"x"}\n\n',
    ]), (s) => steps.push(s.step));
    expect(steps).toEqual(["analyzing", "core"]);
    expect(r).toMatchObject({ strategy: { search_query: "q" }, job_title: "x" });
  });
  it("throws on error events", async () => {
    await expect(readStrategyStream(streamOf(['data: {"type":"error","error":"boom"}\n\n']), () => {})).rejects.toThrow("boom");
  });
});
