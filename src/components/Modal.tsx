import React, { useEffect, useId, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
  confirmText = 'OK',
  cancelText = 'Cancel',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
    if (focusable && focusable[0]) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="presentation">
      <div
        ref={dialogRef}
        role={onConfirm ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold mb-4 text-gray-800">
          {title}
        </h2>
        <div id={descId} className="text-gray-700 mb-6">
          {message}
        </div>
        <div className="flex justify-end space-x-3">
          {onConfirm && (
            <button
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {confirmText}
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {onConfirm ? cancelText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

