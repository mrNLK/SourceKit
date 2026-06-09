import { supabase } from "@/integrations/supabase/client";

export type SellKitOnboardingField =
  | "idealCompany"
  | "buyerTitles"
  | "offerLine"
  | "buyingSignals"
  | "emailVoice";

export type SellKitOnboardingAnswers = Record<SellKitOnboardingField, string>;

export const emptySellKitOnboardingAnswers: SellKitOnboardingAnswers = {
  idealCompany: "",
  buyerTitles: "",
  offerLine: "",
  buyingSignals: "",
  emailVoice: "",
};

type SellKitOnboardingRow = {
  ideal_company: string;
  buyer_titles: string;
  offer_line: string;
  buying_signals: string;
  email_voice: string;
};

function toAnswers(row: SellKitOnboardingRow): SellKitOnboardingAnswers {
  return {
    idealCompany: row.ideal_company ?? "",
    buyerTitles: row.buyer_titles ?? "",
    offerLine: row.offer_line ?? "",
    buyingSignals: row.buying_signals ?? "",
    emailVoice: row.email_voice ?? "",
  };
}

export function countSellKitOnboardingAnswers(answers: SellKitOnboardingAnswers): number {
  return Object.values(answers).filter((value) => value.trim().length > 0).length;
}

export function isSellKitOnboardingComplete(answers: SellKitOnboardingAnswers): boolean {
  return countSellKitOnboardingAnswers(answers) === Object.keys(emptySellKitOnboardingAnswers).length;
}

export async function loadSellKitOnboardingProfile(userId: string): Promise<SellKitOnboardingAnswers | null> {
  const { data, error } = await supabase
    .from("sellkit_onboarding_profiles")
    .select("ideal_company, buyer_titles, offer_line, buying_signals, email_voice")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toAnswers(data) : null;
}

export async function saveSellKitOnboardingProfile(
  userId: string,
  answers: SellKitOnboardingAnswers,
): Promise<void> {
  const { error } = await supabase.from("sellkit_onboarding_profiles").upsert(
    {
      user_id: userId,
      ideal_company: answers.idealCompany,
      buyer_titles: answers.buyerTitles,
      offer_line: answers.offerLine,
      buying_signals: answers.buyingSignals,
      email_voice: answers.emailVoice,
      completed_at: isSellKitOnboardingComplete(answers) ? new Date().toISOString() : null,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}
