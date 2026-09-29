"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { AuthenticatedUser, Obligation, OrganizationUser } from "@/lib/api";
import type { ObligationSaveResult } from "../save-obligation";

import { ObligationDetailContent } from "./obligation-detail-content";
import { ObligationDetailHeader } from "./obligation-detail-header";
import { useObligationDetail } from "./use-obligation-detail";
import { ObligationModalActivityContext, type ModalActivity, type ReportModalActivity } from "./obligation-modal-activity";
import { handleDialogEscape, requestDialogClose, trapDialogTab } from "./obligation-dialog.utils";

export function ObligationDetailModal({
  obligation,
  onClose,
  onSaveResult,
  user,
  users,
}: {
  obligation: Obligation;
  onClose: () => void;
  onSaveResult: (result: ObligationSaveResult) => void;
  user: AuthenticatedUser | null;
  users: OrganizationUser[];
}) {
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const keepEditingRef = useRef<HTMLButtonElement | null>(null);
  const confirmationRef = useRef<HTMLElement | null>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const activities = useRef(new Map<string, ModalActivity>());
  const [controlSaving, setControlSaving] = useState(false);
  const [controlDirty, setControlDirty] = useState(false);
  const reportActivity = useCallback<ReportModalActivity>((key, activity) => {
    if (activity) activities.current.set(key, activity);
    else activities.current.delete(key);
    setControlSaving(Array.from(activities.current.values()).some((value) => value.saving));
    setControlDirty(Array.from(activities.current.values()).some((value) => value.dirty));
  }, []);
  const canEdit = Boolean(
    user &&
      (user.role === "ADMIN" ||
        (user.role === "RESPONSIBLE" && obligation.responsible_user_id === user.id)),
  );
  const { change, draft, error, reset, save, saved, saving, dirty, isSaving } = useObligationDetail({
    obligation,
    canAssign: user?.role === "ADMIN",
    onSaveResult,
  });
  const busy = saving || controlSaving;
  const requestClose = () => requestDialogClose(
    isSaving() || Array.from(activities.current.values()).some((value) => value.saving),
    dirty || Array.from(activities.current.values()).some((value) => value.dirty),
    () => {
      if (!confirmingClose) {
        confirmationTriggerRef.current = document.activeElement instanceof HTMLElement && dialogRef.current?.contains(document.activeElement)
          ? document.activeElement : closeButtonRef.current;
        setConfirmingClose(true);
      }
      return false;
    },
    onClose,
  );
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  const cancelClose = () => {
    if (isSaving() || Array.from(activities.current.values()).some((value) => value.saving)) return;
    setConfirmingClose(false);
  };
  const confirmationState = useRef({ open: confirmingClose, cancel: cancelClose });
  confirmationState.current = { open: confirmingClose, cancel: cancelClose };
  useEffect(() => {
    if (confirmingClose) keepEditingRef.current?.focus({ preventScroll: true });
    else if (confirmationTriggerRef.current) {
      const target = confirmationTriggerRef.current;
      confirmationTriggerRef.current = null;
      (target.isConnected ? target : closeButtonRef.current)?.focus({ preventScroll: true });
    }
  }, [confirmingClose]);
  useEffect(() => {
    if (!dirty && !controlDirty) setConfirmingClose(false);
  }, [dirty, controlDirty]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (handleDialogEscape(event, confirmationState.current.open, confirmationState.current.cancel, () => closeRef.current())) return;
      const activeDialog = confirmationState.current.open ? confirmationRef.current : dialogRef.current;
      if (activeDialog) trapDialogTab(event, activeDialog);
    };
    document.addEventListener("keydown", onKeyDown);
    const containFocus = (event: FocusEvent) => {
      const dialog = confirmationState.current.open ? confirmationRef.current : dialogRef.current;
      if (dialog && event.target instanceof Node && !dialog.contains(event.target)) dialog.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", containFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", containFocus);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      closeButtonRef.current?.focus({ preventScroll: true });
    }
  }, [mounted, obligation.id]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (mounted && dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
  }, [mounted, busy]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="presentation">
      <button
        aria-label="Cerrar detalle de obligación"
        className="absolute inset-0 z-0 cursor-default border-0 bg-slate-950/50"
        disabled={busy || confirmingClose}
        onMouseDown={(event) => event.preventDefault()}
        onClick={requestClose}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby="obligation-detail-title"
        aria-describedby="obligation-detail-description"
        aria-modal="true"
        className="relative z-[10000] max-h-[88vh] w-full max-w-[800px] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
        inert={confirmingClose}
        aria-hidden={confirmingClose || undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        <ObligationDetailHeader closeButtonRef={closeButtonRef} obligation={obligation} onClose={requestClose} closingDisabled={busy} />
        <p id="obligation-detail-description" className="sr-only">Detalle de obligación. Los controles se guardan de forma independiente.</p>
        <ObligationModalActivityContext.Provider value={reportActivity}>
          <ObligationDetailContent change={change} draft={draft} editable={canEdit} obligation={obligation} saving={saving} user={user} users={users} />
        </ObligationModalActivityContext.Provider>
        {canEdit ? (
          <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
            <div aria-live="polite" className="text-sm">
              {error ? <span role="alert" className="text-red-700">{error}</span> : busy ? <span role="status">Guardando cambios. Espera antes de cerrar.</span> : saved ? <span className="text-emerald-700">Cambios guardados</span> : null}
              <p className="mt-1 text-xs text-slate-500">Cancelar descarta solo los cambios de la obligación. Los controles se guardan por separado.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900" disabled={busy} onClick={reset} type="button">Cancelar</button>
              <button className="button-primary rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={() => void save()} type="button">{saving ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </footer>
        ) : null}
      </section>
      {confirmingClose ? (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <button type="button" tabIndex={-1} aria-label="Volver a la edición" className="absolute inset-0 bg-slate-950/40" disabled={busy} onMouseDown={(event) => event.preventDefault()} onClick={cancelClose} />
          <section ref={confirmationRef} role="alertdialog" aria-modal="true" aria-labelledby="discard-obligation-title" aria-describedby="discard-obligation-description" tabIndex={-1} className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 id="discard-obligation-title" className="text-lg font-semibold text-slate-900">Descartar cambios</h3>
            <p id="discard-obligation-description" className="mt-3 text-sm leading-relaxed text-slate-600">Hay cambios sin guardar. Si cierras ahora, se descartarán los cambios realizados en la obligación. Los controles que ya fueron guardados se conservarán.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button ref={keepEditingRef} type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" disabled={busy} onClick={cancelClose}>Seguir editando</button>
              <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50" disabled={busy} onClick={() => requestDialogClose(isSaving() || Array.from(activities.current.values()).some((value) => value.saving), false, () => false, onClose)}>Descartar y cerrar</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
