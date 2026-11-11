"use client";
import { useId, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
export function Modal({
  trigger,
  title,
  description,
  children,
  danger = false,
  initialOpen = false,
}: {
  trigger: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
  initialOpen?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (initialOpen && !dialog.current?.open) dialog.current?.showModal();
  }, [initialOpen]);
  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className={danger ? "negative" : ""}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {trigger}
      </Button>
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby={id}
        aria-describedby={description ? id + "-description" : undefined}
        onClose={() => triggerRef.current?.focus()}
        onClick={(e) => {
          if (e.target === dialog.current) {
            const bounds = dialog.current.getBoundingClientRect();
            if (
              e.clientX < bounds.left ||
              e.clientX > bounds.right ||
              e.clientY < bounds.top ||
              e.clientY > bounds.bottom
            )
              dialog.current.close();
          }
        }}
      >
        <div className="dialog-head">
          <div>
            <h2 id={id}>{title}</h2>
            {description && <p id={id + "-description"}>{description}</p>}
          </div>
          <button
            className="dialog-close"
            type="button"
            aria-label="Închide dialogul"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </dialog>
    </>
  );
}
