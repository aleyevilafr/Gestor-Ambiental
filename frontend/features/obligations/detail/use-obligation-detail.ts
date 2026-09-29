import { useEffect, useRef, useState } from "react";

import type { Obligation } from "@/lib/api";
import { saveObligationChanges, reconciledMessage, unverifiedMessage, type ObligationSaveResult } from "../save-obligation";

export type ObligationDetailDraft = {
  title: string;
  description: string;
  matter: string;
  regulatory_source: string;
  article: string;
  deadline: string;
  frequency: string;
  responsible_user_id: string | null;
  compliance_status: Obligation["compliance_status"];
};

export function draftFrom(obligation: Obligation): ObligationDetailDraft {
  return { title: obligation.title, description: obligation.description ?? "", matter: obligation.matter, regulatory_source: obligation.regulatory_source, article: obligation.article ?? "", deadline: obligation.deadline ?? "", frequency: obligation.frequency ?? "", responsible_user_id: obligation.responsible_user_id, compliance_status: obligation.compliance_status };
}

// Match the values sent by the existing save flow (only title is trimmed).
export function draftKey(draft: ObligationDetailDraft): string {
  return JSON.stringify([draft.title.trim(), draft.description, draft.matter, draft.regulatory_source, draft.article, draft.deadline, draft.frequency, draft.responsible_user_id || null, draft.compliance_status]);
}

export function useObligationDetail({ obligation, canAssign, onSaveResult }: { obligation: Obligation; canAssign: boolean; onSaveResult: (result: ObligationSaveResult) => void }) {
  const [draft, setDraft] = useState<ObligationDetailDraft>(() => draftFrom(obligation));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const baseline = draftKey(draftFrom(obligation));
  const previousBase = useRef({ id: obligation.id, key: baseline });

  useEffect(() => {
    // A failed save reconciled to the unchanged resource must not erase the draft.
    if (previousBase.current.id !== obligation.id || previousBase.current.key !== baseline) {
      setDraft(draftFrom(obligation));
    }
    previousBase.current = { id: obligation.id, key: baseline };
  }, [obligation, baseline]);
  useEffect(() => { setError(""); setSaved(false); }, [obligation.id]);
  function change<K extends keyof ObligationDetailDraft>(field: K, value: ObligationDetailDraft[K]) { setDraft((current) => ({ ...current, [field]: value })); setSaved(false); }
  function reset() { setDraft(draftFrom(obligation)); setError(""); setSaved(false); }
  async function save() {
    if (savingRef.current) return;
    const title = draft.title.trim();
    if (!title) { setError("El nombre de la obligación es obligatorio."); return; }
    savingRef.current = true;
    setSaving(true); setError(""); setSaved(false);
    try {
      const payload: Record<string, string | null> = {};
      const fields: Array<Exclude<keyof ObligationDetailDraft, "responsible_user_id" | "compliance_status">> = ["title", "description", "matter", "regulatory_source", "article", "deadline", "frequency"];
      for (const field of fields) {
        const next = field === "title" ? title : draft[field];
        const current = obligation[field] ?? "";
        if (next !== current) payload[field] = next || null;
      }
      if (canAssign && draft.responsible_user_id !== obligation.responsible_user_id) payload.responsible_user_id = draft.responsible_user_id;
      const result = await saveObligationChanges(obligation, payload, draft.compliance_status);
      if (result.kind === "saved" || (result.kind === "reconciled" && draftKey(draftFrom(result.obligation)) !== baseline)) {
        setDraft(draftFrom(result.obligation));
      }
      setError(result.kind === "saved" ? "" : result.kind === "reconciled" ? reconciledMessage : unverifiedMessage);
      setSaved(result.kind === "saved");
      onSaveResult(result);
    }
    finally { savingRef.current = false; setSaving(false); }
  }
  return { change, draft, error, reset, save, saved, saving, dirty: draftKey(draft) !== baseline, isSaving: () => savingRef.current };
}
