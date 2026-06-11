import { supabase } from "@/integrations/supabase/client";
import { clampOperatorContext, normalizeOperatorContext } from "@/lib/bd-sourcing/operator-context";

export type SellKitRequiredOnboardingField =
  | "idealCompany"
  | "buyerTitles"
  | "offerLine"
  | "buyingSignals"
  | "emailVoice";

export type SellKitOnboardingField = SellKitRequiredOnboardingField | "additionalContext";
export type SellKitContextSource = "manual" | "guide_paste" | "api_import";
export type SellKitOnboardingAnswers = Record<SellKitOnboardingField, string>;

const requiredOnboardingFields: SellKitRequiredOnboardingField[] = [
  "idealCompany",
  "buyerTitles",
  "offerLine",
  "buyingSignals",
  "emailVoice",
];

export const emptySellKitOnboardingAnswers: SellKitOnboardingAnswers = {
  idealCompany: "",
  buyerTitles: "",
  offerLine: "",
  buyingSignals: "",
  emailVoice: "",
  additionalContext: "",
};

type SellKitOnboardingRow = {
  ideal_company: string;
  buyer_titles: string;
  offer_line: string;
  buying_signals: string;
  email_voice: string;
  context_text?: string | null;
  context_source?: SellKitContextSource | null;
  context_updated_at?: string | null;
};

export function normalizeSellKitOnboardingAnswers(
  answers: Partial<SellKitOnboardingAnswers>,
): SellKitOnboardingAnswers {
  return {
    idealCompany: answers.idealCompany ?? "",
    buyerTitles: answers.buyerTitles ?? "",
    offerLine: answers.offerLine ?? "",
    buyingSignals: answers.buyingSignals ?? "",
    emailVoice: answers.emailVoice ?? "",
    additionalContext: clampOperatorContext(answers.additionalContext ?? ""),
  };
}

function toAnswers(row: SellKitOnboardingRow): SellKitOnboardingAnswers {
  return normalizeSellKitOnboardingAnswers({
    idealCompany: row.ideal_company ?? "",
    buyerTitles: row.buyer_titles ?? "",
    offerLine: row.offer_line ?? "",
    buyingSignals: row.buying_signals ?? "",
    emailVoice: row.email_voice ?? "",
    additionalContext: row.context_text ?? "",
  });
}

export function hasSellKitContextTextChanged(previous?: string | null, next?: string | null): boolean {
  return normalizeOperatorContext(previous) !== normalizeOperatorContext(next);
}

export function countSellKitOnboardingAnswers(answers: SellKitOnboardingAnswers): number {
  return requiredOnboardingFields.filter((field) => answers[field].trim().length > 0).length;
}

export function isSellKitOnboardingComplete(answers: SellKitOnboardingAnswers): boolean {
  return countSellKitOnboardingAnswers(answers) === requiredOnboardingFields.length;
}

export async function loadSellKitOnboardingProfile(userId: string): Promise<SellKitOnboardingAnswers | null> {
  const { data, error } = await supabase
    .from("sellkit_onboarding_profiles")
    .select("ideal_company, buyer_titles, offer_line, buying_signals, email_voice, context_text, context_source, context_updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toAnswers(data) : null;
}

export async function saveSellKitOnboardingProfile(
  userId: string,
  answers: SellKitOnboardingAnswers,
  options: { contextSource?: SellKitContextSource } = {},
): Promise<void> {
  const normalized = normalizeSellKitOnboardingAnswers(answers);
  const { error } = await supabase.from("sellkit_onboarding_profiles").upsert(
    {
      user_id: userId,
      ideal_company: normalized.idealCompany,
      buyer_titles: normalized.buyerTitles,
      offer_line: normalized.offerLine,
      buying_signals: normalized.buyingSignals,
      email_voice: normalized.emailVoice,
      context_text: normalized.additionalContext,
      context_source: options.contextSource ?? "manual",
      completed_at: isSellKitOnboardingComplete(normalized) ? new Date().toISOString() : null,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}
