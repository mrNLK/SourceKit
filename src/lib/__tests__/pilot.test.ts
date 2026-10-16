import { describe, it, expect } from "vitest";
import { isPilotMode } from "../pilot";

describe("isPilotMode", () => {
  it("is off when unset", () => expect(isPilotMode({})).toBe(false));
  it("is on for true/1", () => {
    expect(isPilotMode({ VITE_PILOT_MODE: "true" })).toBe(true);
    expect(isPilotMode({ VITE_PILOT_MODE: "1" })).toBe(true);
  });
  it("is off for false", () => expect(isPilotMode({ VITE_PILOT_MODE: "false" })).toBe(false));
});
