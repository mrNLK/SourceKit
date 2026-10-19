import { describe, it, expect } from "vitest";
import { isAllowedOrigin } from "../cors.ts";

it("cors allows production, localhost and this project's Vercel deployment URLs", () => {
  expect(isAllowedOrigin("https://getsourcekit.vercel.app")).toBe(true);
  expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
  expect(isAllowedOrigin("https://getsourcekit-kh2gqac9l-mrnlks-projects.vercel.app")).toBe(true);
  expect(isAllowedOrigin("https://getsourcekit-git-main-mrnlks-projects.vercel.app")).toBe(true);
});

it("cors rejects other origins", () => {
  expect(isAllowedOrigin("https://evil.vercel.app")).toBe(false);
  expect(isAllowedOrigin("https://getsourcekit-x-otherteam-projects.vercel.app")).toBe(false);
  expect(isAllowedOrigin("https://getsourcekit-x-mrnlks-projects.vercel.app.evil.com")).toBe(false);
  expect(isAllowedOrigin("")).toBe(false);
});
