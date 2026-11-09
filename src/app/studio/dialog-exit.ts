// Keep the dialog contents available for the exit transition, then release them.
export function afterDialogExit(dialog: HTMLDialogElement, clearContents: () => void) {
  const transitions = dialog.getAnimations?.() ?? [];
  void Promise.allSettled(transitions.map(({ finished }) => finished)).then(() => {
    if (!dialog.open) clearContents();
  });
}
