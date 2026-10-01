"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, createEvidence, getEvidences, type Control, type Evidence } from "@/lib/api";

export type EvidenceDraft = { name: string; description: string; external_url: string; control_id: string };
export const emptyEvidenceDraft = (): EvidenceDraft => ({ name: "", description: "", external_url: "", control_id: "" });
export function safeEvidenceUrl(value: string | null): string | null {
  try { const url = new URL(value ?? ""); return ["http:", "https:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
export function evidencePayload(draft: EvidenceDraft, controls: Control[]) {
  const name = draft.name.trim();
  if (!name || name.length > 255) throw new Error("Completa el nombre (máximo 255 caracteres).");
  const external_url = draft.external_url.trim();
  if (!safeEvidenceUrl(external_url) || external_url.length > 2048) throw new Error("Ingresa una URL HTTP(S) válida (máximo 2048 caracteres).");
  if (draft.control_id && !controls.some((control) => control.id === draft.control_id)) throw new Error("Selecciona un control disponible de esta obligación.");
  return { name, description: draft.description.trim() || null, external_url, control_id: draft.control_id || null, evidence_type: "EXTERNAL_LINK" as const };
}

export function useObligationEvidences(obligationId: string) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true); setLoadError("");
    try {
      const data = await getEvidences(obligationId);
      if (version === request.current) setItems(data);
      return true;
    } catch {
      if (version === request.current) setLoadError("No fue posible actualizar las evidencias. Reintenta la consulta.");
      return false;
    } finally { if (version === request.current) setLoading(false); }
  }, [obligationId]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const create = async (draft: EvidenceDraft, controls: Control[]) => {
    if (lock.current) return false;
    let payload;
    try { payload = evidencePayload(draft, controls); }
    catch (validationError) { setError((validationError as Error).message); return false; }
    lock.current = true; setSubmitting(true); setError(""); setSuccess("");
    try {
      await createEvidence(obligationId, payload);
      setSuccess("Evidencia registrada. Se guarda independientemente de los cambios de la obligación.");
      await load(); // A failed refresh must not turn a confirmed POST into a retryable creation.
      return true;
    } catch (creationError) {
      setError(creationError instanceof ApiError && creationError.status < 500
        ? "No fue posible registrar la evidencia. Revisa los datos y tus permisos."
        : "No se pudo confirmar el registro. Consulta las evidencias antes de volver a enviarlo para evitar duplicados.");
      await load();
      return false;
    } finally { lock.current = false; setSubmitting(false); }
  };
  return { items, loading, loadError, error, success, submitting, load, create };
}
