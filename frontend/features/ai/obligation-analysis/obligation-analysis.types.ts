import type { AIObligationProposal } from "@/lib/api";

export type ReviewProposal = AIObligationProposal & {
  id: string;
  selected: boolean;
  incorporated: boolean;
  duplicate: boolean;
};

export function normalizeTitle(value: string) {
  return value.trim().toLocaleLowerCase("es-CL").replace(/\s+/g, " ");
}

export function toReviewProposal(proposal: AIObligationProposal, index: number, existingTitles: string[]): ReviewProposal {
  const title = normalizeTitle(proposal.title);
  return {
    ...proposal,
    id: `${Date.now()}-${index}`,
    selected: true,
    incorporated: false,
    duplicate: Boolean(title && existingTitles.some((item) => normalizeTitle(item) === title)),
  };
}
