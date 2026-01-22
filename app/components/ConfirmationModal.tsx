'use client';

import React, { useEffect, useRef } from 'react';

type ModalVariant = 'danger' | 'warning' | 'info';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isLoading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus trap and auto-focus confirm button
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap - keep focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
      confirmBg: 'bg-red-500 hover:bg-red-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    warning: {
      iconBg: 'bg-[#FAA819]/20',
      iconColor: 'text-[#FAA819]',
      confirmBg: 'bg-gradient-to-r from-[#FAA819] to-[#E99502] hover:shadow-lg',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    info: {
      iconBg: 'bg-[#00A99D]/20',
      iconColor: 'text-[#00A99D]',
      confirmBg: 'bg-gradient-to-r from-[#00A99D] to-[#0D7871] hover:shadow-lg',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const styles = variantStyles[variant];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[200] animate-fade-in"
        onClick={!isLoading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
        onClick={!isLoading ? onClose : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
      >
        <div
          ref={modalRef}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 outline-none animate-modal-slide-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <div className={styles.iconColor}>
              {styles.icon}
            </div>
          </div>

          {/* Title */}
          <h2 
            id="modal-title"
            className="text-xl text-center text-[#1a1a1a] mb-2"
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
          >
            {title}
          </h2>

          {/* Message */}
          <p 
            id="modal-message"
            className="text-center text-[#5c5652] mb-6"
            style={{ fontFamily: 'Inter', fontWeight: 500 }}
          >
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-[#dedede] text-[#1a1a1a] font-medium hover:bg-[#fffaf3] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
              style={{ fontFamily: 'Montserrat Alternates' }}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-xl ${styles.confirmBg} text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${variant === 'danger' ? 'focus:ring-red-500' : variant === 'warning' ? 'focus:ring-[#FAA819]' : 'focus:ring-[#00A99D]'}`}
              style={{ fontFamily: 'Montserrat Alternates' }}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Pre-built confirmation modals for common use cases
interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  isLoading?: boolean;
}

export function DeleteConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName = 'this item',
  isLoading = false 
}: DeleteConfirmationProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Confirmation"
      message={`Are you sure you want to delete ${itemName}? This action cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Keep it"
      variant="danger"
      isLoading={isLoading}
    />
  );
}

export function LogoutConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm 
}: Omit<DeleteConfirmationProps, 'itemName'>) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Sign Out"
      message="Are you sure you want to sign out of your account?"
      confirmLabel="Sign Out"
      cancelLabel="Stay Signed In"
      variant="warning"
    />
  );
}

export function DiscardChangesConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm 
}: Omit<DeleteConfirmationProps, 'itemName'>) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Discard Changes?"
      message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      confirmLabel="Discard"
      cancelLabel="Keep Editing"
      variant="warning"
    />
  );
}

export function DeleteAccountConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm,
  isLoading = false 
}: DeleteConfirmationProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Account"
      message="This will permanently delete your account and all associated data. This action cannot be undone. Are you absolutely sure?"
      confirmLabel="Delete My Account"
      cancelLabel="Keep My Account"
      variant="danger"
      isLoading={isLoading}
    />
  );
}
