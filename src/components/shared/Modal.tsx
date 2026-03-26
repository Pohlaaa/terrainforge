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
  maxWidth = '560px',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.6)] z-[200] flex items-center justify-center">
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] w-full max-h-[90vh] overflow-y-auto p-[28px]"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between mb-[22px]">
          <h2 className="font-serif text-[20px] text-[var(--text)]">{title}</h2>
          <button
            onClick={onClose}
            className="bg-none border-none text-[var(--text-3)] text-[20px] cursor-pointer p-[4px] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>

        <div className="mb-[22px]">{children}</div>

        <div className="flex gap-[12px] justify-end">
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button variant="primary" onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
