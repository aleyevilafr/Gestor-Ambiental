"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { AuthenticatedUser, Obligation, OrganizationUser } from "@/lib/api";

import { ObligationDetailContent } from "./obligation-detail-content";
import { ObligationDetailHeader } from "./obligation-detail-header";
import { useObligationDetail } from "./use-obligation-detail";

export function ObligationDetailModal({
  obligation,
  onClose,
  onUpdated,
  user,
  users,
}: {
  obligation: Obligation;
  onClose: () => void;
  onUpdated: (obligation: Obligation) => void;
  user: AuthenticatedUser | null;
  users: OrganizationUser[];
}) {
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const canEdit = Boolean(
    user &&
      (user.role === "ADMIN" ||
        (user.role === "RESPONSIBLE" && obligation.responsible_user_id === user.id)),
  );
  const { change, draft, error, reset, save, saved, saving } = useObligationDetail({
    obligation,
    canAssign: user?.role === "ADMIN",
    onUpdated,
  });

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="presentation">
      <button
        aria-label="Cerrar detalle de obligación"
        className="absolute inset-0 z-0 cursor-default border-0 bg-slate-950/50"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="obligation-detail-title"
        aria-modal="true"
        className="relative z-[10000] max-h-[88vh] w-full max-w-[800px] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <ObligationDetailHeader closeButtonRef={closeButtonRef} obligation={obligation} onClose={onClose} />
        <ObligationDetailContent change={change} draft={draft} editable={canEdit} obligation={obligation} saving={saving} user={user} users={users} />
        {canEdit ? (
          <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
            <div aria-live="polite" className="text-sm">
              {error ? <span className="text-red-700">{error}</span> : saved ? <span className="text-emerald-700">Cambios guardados</span> : null}
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900" disabled={saving} onClick={reset} type="button">Cancelar</button>
              <button className="button-primary rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
