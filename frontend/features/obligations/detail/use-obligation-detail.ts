import { useEffect, useState } from "react";

import { updateObligation, updateObligationStatus, type Obligation } from "@/lib/api";

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

function draftFrom(obligation: Obligation): ObligationDetailDraft {
  return { title: obligation.title, description: obligation.description ?? "", matter: obligation.matter, regulatory_source: obligation.regulatory_source, article: obligation.article ?? "", deadline: obligation.deadline ?? "", frequency: obligation.frequency ?? "", responsible_user_id: obligation.responsible_user_id, compliance_status: obligation.compliance_status };
}

export function useObligationDetail({ obligation, canAssign, onUpdated }: { obligation: Obligation; canAssign: boolean; onUpdated: (obligation: Obligation) => void }) {
  const [draft, setDraft] = useState<ObligationDetailDraft>(() => draftFrom(obligation));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(draftFrom(obligation)); setError(""); setSaved(false); }, [obligation.id]);
  function change<K extends keyof ObligationDetailDraft>(field: K, value: ObligationDetailDraft[K]) { setDraft((current) => ({ ...current, [field]: value })); setSaved(false); }
  function reset() { setDraft(draftFrom(obligation)); setError(""); setSaved(false); }
  async function save() {
    const title = draft.title.trim();
    if (!title) { setError("El nombre de la obligación es obligatorio."); return; }
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
      let updated = obligation;
      if (Object.keys(payload).length > 0) updated = await updateObligation(obligation.id, payload);
      if (draft.compliance_status !== obligation.compliance_status) updated = await updateObligationStatus(obligation.id, draft.compliance_status);
      setDraft(draftFrom(updated));
      onUpdated(updated);
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar los cambios."); }
    finally { setSaving(false); }
  }
  return { change, draft, error, reset, save, saved, saving };
}
