export function requestDialogClose(saving: boolean, dirty: boolean, confirmDiscard: () => boolean, close: () => void) {
  if (saving) return;
  if (!dirty || confirmDiscard()) close();
}

export function handleDialogEscape(event: KeyboardEvent, confirming: boolean, cancelConfirmation: () => void, requestClose: () => void): boolean {
  if (event.key !== "Escape") return false;
  event.preventDefault();
  event.stopPropagation();
  if (confirming) cancelConfirmation();
  else requestClose();
  return true;
}

export function trapDialogTab(event: KeyboardEvent, dialog: HTMLElement) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
  )).filter((node) => node.tabIndex >= 0 && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden");
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first) {
    event.preventDefault();
    dialog.focus({ preventScroll: true });
  } else if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus({ preventScroll: true });
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}
