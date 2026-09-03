import type { Control } from "@/lib/api";

export const controlStatusLabels: Record<Control["status"], string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completado",
};

export type ControlDraft = {
  title: string;
  description: string;
  due_date: string;
  status: Control["status"];
};

export function controlToDraft(control: Control): ControlDraft {
  return {
    title: control.title,
    description: control.description ?? "",
    due_date: control.due_date ?? "",
    status: control.status,
  };
}

export function emptyControlDraft(): ControlDraft {
  return {
    title: "",
    description: "",
    due_date: "",
    status: "PENDING",
  };
}
