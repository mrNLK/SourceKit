export type BdBuyerPersona =
  | "cto"
  | "vp_eng"
  | "vp_data"
  | "head_transformation"
  | "security_ciso"
  | "other";

export const buyerPersonas: BdBuyerPersona[] = [
  "cto",
  "vp_eng",
  "vp_data",
  "head_transformation",
  "security_ciso",
  "other",
];

const personaLabels: Record<BdBuyerPersona, string> = {
  cto: "CTO",
  vp_eng: "VP Eng",
  vp_data: "VP Data",
  head_transformation: "Head of Transformation",
  security_ciso: "Security / CISO",
  other: "Other senior buyer",
};

export function buyerPersonaLabel(persona: BdBuyerPersona): string {
  return personaLabels[persona];
}

export function inferBuyerPersona(title: string): BdBuyerPersona {
  const normalized = title.toLowerCase();

  if (/(ciso|security)/.test(normalized)) return "security_ciso";
  if (/(cto|chief technology)/.test(normalized)) return "cto";
  if (/transformation|it operations|change management/.test(normalized)) return "head_transformation";
  if (/(data|analytics|ai platform)/.test(normalized)) return "vp_data";
  if (/(engineering|platform|infrastructure|devops|technology)/.test(normalized)) return "vp_eng";
  return "other";
}
