"use client";

import { createContext, useContext, useLayoutEffect } from "react";

export type ModalActivity = { dirty: boolean; saving: boolean };
export type ReportModalActivity = (key: string, activity: ModalActivity | null) => void;

// Optional outside the modal: independent detail routes keep their existing behavior.
export const ObligationModalActivityContext = createContext<ReportModalActivity | null>(null);

export function useModalActivity(key: string, dirty: boolean, saving: boolean) {
  const report = useContext(ObligationModalActivityContext);
  useLayoutEffect(() => { report?.(key, { dirty, saving }); }, [report, key, dirty, saving]);
  useLayoutEffect(() => () => report?.(key, null), [report, key]);
}
