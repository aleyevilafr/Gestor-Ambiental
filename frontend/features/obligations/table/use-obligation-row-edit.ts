import { useEffect, useState } from "react";

import type { Obligation } from "@/lib/api";
import { saveObligationChanges, reconciledMessage, unverifiedMessage, type ObligationSaveResult } from "../save-obligation";

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
  onSaveResult,
  onFinished,
}: {
  obligation: Obligation;
  canAssign: boolean;
  editing: boolean;
  onSaveResult: (result: ObligationSaveResult) => void;
  onFinished: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(obligation));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(draftFrom(obligation));
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
      const result = await saveObligationChanges(obligation, payload, draft.compliance_status);
      if (result.kind !== "unverified") setDraft(draftFrom(result.obligation));
      setError(result.kind === "saved" ? "" : result.kind === "reconciled" ? reconciledMessage : unverifiedMessage);
      onSaveResult(result);
      if (result.kind === "saved") onFinished();
    } finally {
      setSaving(false);
    }
  }

  return { cancel, change, draft, error, save, saving };
}
