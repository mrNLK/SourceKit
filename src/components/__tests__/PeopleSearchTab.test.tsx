import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const svc = vi.hoisted(() => ({
  sourceCandidates: vi.fn(),
  startDeepSearch: vi.fn(),
  pollDeepSearch: vi.fn(),
  enrichEmails: vi.fn(),
}));
vi.mock("@/services/candidateSources", async (orig) => ({ ...(await orig<typeof import("@/services/candidateSources")>()), ...svc }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import PeopleSearchTab from "../PeopleSearchTab";

const cand = (over = {}) => ({ id: "c1", full_name: "Jane Doe", current_title: "Staff Engineer", current_company: "Acme", emails: [], profile_urls: [], providers: ["exa", "harmonic"], sourcing_score: 80, linkedin_url: "https://www.linkedin.com/in/jane", ...over });

describe("PeopleSearchTab", () => {
  beforeEach(() => Object.values(svc).forEach((f) => f.mockReset()));

  it("runs multi-source search and shows source badges", async () => {
    svc.sourceCandidates.mockResolvedValue({ candidates: [cand()], sources: { exa: { count: 1, est_cost_usd: 0.02 }, harmonic: { count: 1, est_cost_usd: 0 } }, enabled: {}, raw_count: 2, est_cost_usd: 0.02 });
    render(<PeopleSearchTab />);
    fireEvent.change(screen.getByLabelText("people query"), { target: { value: "ml infra" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());
    expect(screen.getAllByTestId("source-badge").map((b) => b.textContent)).toEqual(["Exa", "Harmonic"]);
    expect(svc.sourceCandidates.mock.calls[0][0]).toMatchObject({ query: "ml infra", limit: 50 });
  });

  it("starts deep search and renders polled results", async () => {
    svc.startDeepSearch.mockResolvedValue({ run_id: "r1", engine: "webset", external_run_id: "w", status: "running", est_cost_usd: null });
    svc.pollDeepSearch.mockImplementation(async (_id: string, onUpdate: (s: unknown) => void) => {
      onUpdate({ status: "idle", is_active: false, candidates: [cand({ id: "c2", full_name: "Bob Roe", providers: ["exa_webset"] })] });
      return null;
    });
    render(<PeopleSearchTab />);
    fireEvent.change(screen.getByLabelText("deep search role"), { target: { value: "SRE" } });
    fireEvent.click(screen.getByRole("button", { name: /start deep search/i }));
    await waitFor(() => expect(screen.getByText("Bob Roe")).toBeInTheDocument());
    expect(screen.getByTestId("deep-status").textContent).toContain("Websets: idle");
    expect(svc.startDeepSearch).toHaveBeenCalledWith({ role: "SRE", company: undefined, location: undefined });
  });

  it("finds emails for selected shortlist", async () => {
    svc.sourceCandidates.mockResolvedValue({ candidates: [cand()], sources: {}, enabled: {}, raw_count: 1, est_cost_usd: 0 });
    svc.enrichEmails.mockResolvedValue({ results: [{ id: "c1", status: "success", email: "jane@acme.com" }], found: 1, est_credits: 2 });
    render(<PeopleSearchTab />);
    fireEvent.change(screen.getByLabelText("people query"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByLabelText("select Jane Doe"));
    fireEvent.click(screen.getByRole("button", { name: /find emails/i }));
    await waitFor(() => expect(screen.getByText("jane@acme.com")).toBeInTheDocument());
    expect(svc.enrichEmails).toHaveBeenCalledWith(["c1"]);
    expect(screen.getAllByTestId("source-badge").map((b) => b.textContent)).toContain("Airscale");
  });
});
