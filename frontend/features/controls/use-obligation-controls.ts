"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  createControl,
  getControls,
  type Control,
  updateControl,
  updateControlStatus,
} from "@/lib/api";

import type { ControlDraft } from "./controls.types";

function messageFor(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useObligationControls(obligationId: string) {
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setControls(await getControls(obligationId));
    } catch (loadError) {
      setLoadError(messageFor(loadError, "No fue posible cargar los controles."));
    } finally {
      setLoading(false);
    }
  }, [obligationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (draft: ControlDraft) => {
      try {
        const created = await createControl(obligationId, {
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          due_date: draft.due_date || null,
          status: draft.status,
        });
        setControls((current) => [created, ...current]);
        return created;
      } catch (createError) {
        const message = messageFor(createError, "No fue posible crear el control.");
        throw new Error(message);
      }
    },
    [obligationId],
  );

  const update = useCallback(async (control: Control, draft: ControlDraft) => {
    try {
      const updatedDetails = await updateControl(control.id, {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        due_date: draft.due_date || null,
      });
      const updated = draft.status === control.status
        ? updatedDetails
        : await updateControlStatus(control.id, draft.status);
      setControls((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      return updated;
    } catch (updateError) {
      const message = messageFor(updateError, "No fue posible guardar los cambios del control.");
      throw new Error(message);
    }
  }, []);

  return { controls, create, load, loadError, loading, update };
}
