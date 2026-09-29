import { getObligation, updateObligation, updateObligationStatus, type Obligation } from "@/lib/api";

export const reconciledMessage = "No fue posible guardar todos los cambios. Se actualizó la información con el estado real almacenado.";
export const unverifiedMessage = "No pudimos confirmar qué cambios se guardaron. La obligación se oculta temporalmente hasta consultar su estado real. No vuelvas a enviar los cambios antes de verificarla.";

export type ObligationSaveResult =
  | { kind: "saved" | "reconciled"; id: string; obligation: Obligation }
  | { kind: "unverified"; id: string };

// A failed response can occur AFTER a commit. Read instead of assuming rollback
// or retrying a write. This also handles failure of the first PATCH.
export async function reconcileObligation(id: string): Promise<ObligationSaveResult> {
  try {
    return { kind: "reconciled", id, obligation: await getObligation(id) };
  } catch {
    return { kind: "unverified", id };
  }
}

export async function saveObligationChanges(
  obligation: Obligation,
  fields: Record<string, string | null>,
  status: Obligation["compliance_status"],
): Promise<ObligationSaveResult> {
  let updated = obligation;
  try {
    if (Object.keys(fields).length) updated = await updateObligation(obligation.id, fields);
    if (status !== obligation.compliance_status) updated = await updateObligationStatus(obligation.id, status);
    return { kind: "saved", id: obligation.id, obligation: updated };
  } catch {
    return reconcileObligation(obligation.id);
  }
}
