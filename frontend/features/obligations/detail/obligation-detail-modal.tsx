"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { StatusBadge } from "@/components/ui/surface";
import type { Obligation, OrganizationUser } from "@/lib/api";

import { ObligationDetailContent } from "./obligation-detail-content";

const labels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLIANT: "Cumplida",
  OVERDUE: "Vencida",
};

const tones = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLIANT: "success",
  OVERDUE: "danger",
} as const;

export function ObligationDetailModal({
  obligation,
  onClose,
  users,
}: {
  obligation: Obligation;
  onClose: () => void;
  users: OrganizationUser[];
}) {
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (mounted) {
      closeButtonRef.current?.focus({ preventScroll: true });
    }
  }, [mounted, obligation.id]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <button
        aria-label="Cerrar detalle de obligación"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, border: 0, background: "transparent", cursor: "default" }}
        type="button"
      />
      <section
        aria-labelledby="obligation-detail-title"
        aria-modal="true"
        style={{
          width: "600px",
          maxWidth: "90vw",
          maxHeight: "85vh",
          background: "white",
          color: "black",
          borderRadius: "16px",
          boxShadow: "0 25px 80px rgba(0,0,0,.4)",
          overflowY: "auto",
          position: "relative",
        }}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[#111c30]" id="obligation-detail-title">
                {obligation.title}
              </h2>
              <StatusBadge tone={tones[obligation.compliance_status]}>
                {labels[obligation.compliance_status]}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-slate-500">Detalle de obligación ambiental</p>
          </div>
          <button
            aria-label="Cerrar detalle"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#111c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </header>
        <ObligationDetailContent obligation={obligation} users={users} />
      </section>
    </div>,
    document.body,
  );
}
