"use client";

import { useState } from "react";

import { analyzeObligations, createObligation, type AIObligationProposal, type Obligation } from "@/lib/api";

import { normalizeTitle, toReviewProposal, type ReviewProposal } from "./obligation-analysis.types";

export type AnalysisPhase = "idle" | "analyzing" | "success" | "error" | "creating";

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useObligationAnalysis(existingTitles: string[], onCreated: (obligations: Obligation[]) => void) {
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [documentName, setDocumentName] = useState("");
  const [proposals, setProposals] = useState<ReviewProposal[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");

  const analyze = async (file: File) => {
    setPhase("analyzing");
    setError("");
    try {
      const response = await analyzeObligations(file);
      setDocumentName(response.document_name);
      setWarnings(response.warnings);
      setProposals(response.proposals.map((proposal, index) => toReviewProposal(proposal, index, existingTitles)));
      setPhase("success");
    } catch (caught) {
      setError(messageFor(caught, "No fue posible analizar el documento."));
      setPhase("error");
    }
  };

  const updateProposal = (id: string, field: keyof AIObligationProposal, value: string | null) => {
    setProposals((current) => current.map((proposal) => {
      if (proposal.id !== id) return proposal;
      const updated = { ...proposal, [field]: value };
      if (field === "title") {
        const title = normalizeTitle(value ?? "");
        updated.duplicate = Boolean(title && existingTitles.some((item) => normalizeTitle(item) === title));
      }
      return updated;
    }));
  };

  const toggleProposal = (id: string) => setProposals((current) => current.map((proposal) => proposal.id === id ? { ...proposal, selected: !proposal.selected } : proposal));

  const incorporate = async () => {
    const selected = proposals.filter((proposal) => proposal.selected && !proposal.incorporated);
    if (!selected.length) return;
    setPhase("creating");
    setError("");
    const created: Obligation[] = [];
    const failures: string[] = [];
    const successfulIds = new Set<string>();

    for (const proposal of selected) {
      if (!proposal.title.trim() || !proposal.matter?.trim() || !proposal.regulatory_source?.trim()) {
        failures.push(`${proposal.title || "Una propuesta"}: completa título, materia y fuente normativa.`);
        continue;
      }
      try {
        const obligation = await createObligation({
          title: proposal.title.trim(),
          description: proposal.description?.trim() || null,
          matter: proposal.matter.trim(),
          regulatory_source: proposal.regulatory_source.trim(),
          article: proposal.article?.trim() || null,
          deadline: proposal.deadline || null,
          frequency: proposal.frequency?.trim() || null,
        });
        created.push(obligation);
        successfulIds.add(proposal.id);
      } catch (caught) {
        failures.push(`${proposal.title}: ${messageFor(caught, "no fue posible crearla.")}`);
      }
    }

    if (created.length) {
      onCreated(created);
      setProposals((current) => current.map((proposal) => successfulIds.has(proposal.id) ? { ...proposal, incorporated: true, selected: false } : proposal));
    }
    if (failures.length) setError(failures.join(" "));
    setPhase("success");
  };

  const reset = () => {
    setPhase("idle");
    setDocumentName("");
    setProposals([]);
    setWarnings([]);
    setError("");
  };

  return { analyze, documentName, error, incorporate, phase, proposals, reset, toggleProposal, updateProposal, warnings };
}
