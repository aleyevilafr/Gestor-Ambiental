import { getControls, getEvidences, type Control, type Evidence } from "@/lib/api";

export const CHECKLIST_PAGE_SIZE = 8;
export type ChecklistSummary = { total: number; completed: number; backed: number; general: number; evidenceCount: number };
export type ChecklistResult = { summary: ChecklistSummary; error?: never } | { error: string; summary?: never };

export function summarizeChecklist(id: string, controls: Control[], evidences: Evidence[]): ChecklistSummary {
  const ownControls = controls.filter((control) => control.obligation_id === id);
  const ownEvidences = evidences.filter((evidence) => evidence.obligation_id === id);
  const controlIds = new Set(ownControls.map((control) => control.id));
  return {
    total: ownControls.length,
    completed: ownControls.filter((control) => control.status === "COMPLETED").length,
    backed: new Set(ownEvidences.filter((evidence) => evidence.control_id && controlIds.has(evidence.control_id)).map((evidence) => evidence.control_id)).size,
    general: ownEvidences.filter((evidence) => evidence.control_id === null).length,
    evidenceCount: ownEvidences.length,
  };
}

// Two workers, each with two requests: at most four requests in flight.
// allSettled waits for both, including on failures, before releasing a worker.
export async function loadChecklistBatch(
  ids: string[],
  publish: (id: string, result: ChecklistResult) => void,
  cancelled: () => boolean = () => false,
) {
  const queue = [...new Set(ids)];
  async function worker() {
    while (queue.length && !cancelled()) {
      const id = queue.shift()!;
      const [controls, evidences] = await Promise.allSettled([getControls(id), getEvidences(id)]);
      if (cancelled()) return;
      publish(id, controls.status === "fulfilled" && evidences.status === "fulfilled"
        ? { summary: summarizeChecklist(id, controls.value, evidences.value) }
        : { error: "No fue posible consultar controles y evidencias. Reintenta la consulta." });
    }
  }
  await Promise.all([worker(), worker()]);
}
