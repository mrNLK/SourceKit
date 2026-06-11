import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));
import {
  countSellKitOnboardingAnswers,
  emptySellKitOnboardingAnswers,
  hasSellKitContextTextChanged,
  normalizeSellKitOnboardingAnswers,
} from "@/services/sellkitOnboarding";

describe("SellKit onboarding profile helpers", () => {
  it("does not count optional additional context as required onboarding progress", () => {
    const answers = {
      ...emptySellKitOnboardingAnswers,
      idealCompany: "Enterprise software",
      buyerTitles: "VP Product",
      offerLine: "Expert operators",
      buyingSignals: "Hiring spike",
      emailVoice: "Short and direct",
      additionalContext: "Avoid public sector accounts",
    };

    expect(countSellKitOnboardingAnswers(answers)).toBe(5);
  });

  it("normalizes additional context to the 2,000 character cap", () => {
    const answers = normalizeSellKitOnboardingAnswers({
      ...emptySellKitOnboardingAnswers,
      additionalContext: "x".repeat(2_050),
    });

    expect(answers.additionalContext).toHaveLength(2_000);
  });

  it("detects context edits and clears for history/stale-score handling", () => {
    expect(hasSellKitContextTextChanged("old", "new")).toBe(true);
    expect(hasSellKitContextTextChanged("old", "")).toBe(true);
    expect(hasSellKitContextTextChanged(" same ", "same")).toBe(false);
  });
});
