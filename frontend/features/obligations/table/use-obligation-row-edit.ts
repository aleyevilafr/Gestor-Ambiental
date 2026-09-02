import { useEffect, useState } from "react";

import {
  updateObligation,
  updateObligationStatus,
  type Obligation,
} from "@/lib/api";

type Draft = {
  title: string;
  responsible_user_id: string | null;
  deadline: string;
  compliance_status: Obligation["compliance_status"];
};

function draftFrom(obligation: Obligation): Draft {
  return {
    title: obligation.title,
    responsible_user_id: obligation.responsible_user_id,
    deadline: obligation.deadline ?? "",
    compliance_status: obligation.compliance_status,
  };
}

export function useObligationRowEdit({
  obligation,
  canAssign,
  editing,
  onUpdated,
  onFinished,
}: {
  obligation: Obligation;
  canAssign: boolean;
  editing: boolean;
  onUpdated: (obligation: Obligation) => void;
  onFinished: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(obligation));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(draftFrom(obligation));
    setError("");
  }, [obligation]);

  useEffect(() => {
    if (!editing) {
      setDraft(draftFrom(obligation));
      setError("");
    }
  }, [editing, obligation]);

  function change<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function cancel() {
    setDraft(draftFrom(obligation));
    setError("");
    onFinished();
  }

  async function save() {
    const title = draft.title.trim();
    if (!title) {
      setError("El nombre de la obligación es obligatorio.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string | null> = {};
      if (title !== obligation.title) {
        payload.title = title;
      }
      if ((draft.deadline || null) !== obligation.deadline) {
        payload.deadline = draft.deadline || null;
      }
      if (canAssign && draft.responsible_user_id !== obligation.responsible_user_id) {
        payload.responsible_user_id = draft.responsible_user_id;
      }
      let updated = obligation;
      if (Object.keys(payload).length > 0) {
        updated = await updateObligation(obligation.id, payload);
      }
      if (draft.compliance_status !== obligation.compliance_status) {
        updated = await updateObligationStatus(obligation.id, draft.compliance_status);
      }
      onUpdated(updated);
      onFinished();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  return { cancel, change, draft, error, save, saving };
}
