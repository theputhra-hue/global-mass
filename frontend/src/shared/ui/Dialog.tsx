import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  id?: string;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
}

// Portals can overlap (for example signing in from another dialog). Only the
// front dialog handles keyboard events, and scrolling stays locked until all close.
const openDialogs: HTMLElement[] = [];
let originalBodyOverflow = '';
const isolatedElements = new Map<Element, { count: number; original: string | null }>();

export function Dialog({ id, labelledBy, onClose, children, className, backdropClassName }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = ref.current;
    if (!element) return;
    if (openDialogs.length === 0) originalBodyOverflow = document.body.style.overflow;
    openDialogs.push(element);
    document.body.style.overflow = 'hidden';
    // Isolate the application (and any older portal) while this dialog is open.
    // Preserve previous values so nested dialogs restore the earlier modal.
    const backdrop = element.parentElement;
    const siblings = Array.from(document.body.children).filter(node => node !== backdrop);
    siblings.forEach(node => {
      const state = isolatedElements.get(node) || { count: 0, original: node.getAttribute('inert') };
      state.count += 1;
      isolatedElements.set(node, state);
      node.setAttribute('inert', '');
    });
    element.focus();
    const onKey = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== element) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === 'Tab' && element) {
        const focusable = Array.from(element.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, summary, [contenteditable="true"], [tabindex]',
        )).filter((candidate) => candidate.tabIndex >= 0 && !candidate.matches(':disabled, input[type="hidden"]')
          && !candidate.closest('[hidden], [inert], [aria-hidden="true"]'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) {
          event.preventDefault();
          element.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === element || !element.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element || !element.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const wasTopmost = openDialogs[openDialogs.length - 1] === element;
      const index = openDialogs.indexOf(element);
      if (index >= 0) openDialogs.splice(index, 1);
      if (openDialogs.length === 0) document.body.style.overflow = originalBodyOverflow;
      siblings.forEach(node => {
        const state = isolatedElements.get(node);
        if (!state || --state.count > 0) return;
        if (state.original === null) node.removeAttribute('inert');
        else node.setAttribute('inert', state.original);
        isolatedElements.delete(node);
      });
      if (wasTopmost && previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <div
      className={backdropClassName ?? 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4'}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={className ?? 'w-full max-w-xl max-h-[85vh] overflow-y-auto scroll-contained card-brutal-dark p-6 space-y-5 text-hermes-bone'}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
