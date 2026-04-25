import React from 'react';
import { Button } from '../ui/Button';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  onClose,
  onConfirm,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDisabled = false,
  maxWidth = '560px',
}) => {
  if (!isOpen) return null;

  return (
    // F-CW-28: dialog a11y. F-CW-27: split header / scrollable body / sticky
    // footer so the action buttons stay reachable on tall content (e.g. the
    // Material form's Computation Engine section pushed Save off-screen).
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,.6)] z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] w-full max-h-[90vh] flex flex-col"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between px-[28px] pt-[24px] pb-[16px] flex-shrink-0">
          <h2 id="modal-title" className="font-serif text-[20px] text-[var(--text)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-none border-none text-[var(--text-3)] text-[20px] cursor-pointer p-[4px] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[28px] pb-[16px]">{children}</div>

        <div className="flex gap-[12px] justify-end px-[28px] py-[18px] border-t border-[var(--border)] flex-shrink-0">
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
