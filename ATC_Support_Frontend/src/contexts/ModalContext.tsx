import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalOptions {
  title: string;
  content: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    variant?: 'primary' | 'danger';
    disabled?: boolean;
    disabledUntil?: number; // seconds
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  closeOnOutsideClick?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

interface ModalContextType {
  openModal: (options: ModalOptions) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const openModal = useCallback((options: ModalOptions) => {
    setModal(options);
    setIsClosing(false);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setModal(null);
      setIsClosing(false);
      document.body.style.overflow = 'unset';
    }, 200);
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center p-2 sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={modal.closeOnOutsideClick !== false ? closeModal : undefined}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative flex h-[min(100dvh-1rem,100%)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] ${
                modal.size === 'sm' ? 'sm:max-w-md' :
                modal.size === 'lg' ? 'sm:max-w-2xl' :
                modal.size === 'xl' ? 'sm:max-w-4xl' :
                'sm:max-w-lg'
              }`}
            >
              <div className="flex shrink-0 items-center justify-between border-b px-4 py-4 sm:px-6">
                <h3 className="text-lg font-semibold text-gray-900">{modal.title}</h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                {modal.content}
              </div>

              {(modal.primaryAction || modal.secondaryAction) && (
                <div className="flex shrink-0 flex-col gap-3 border-t bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                  {modal.secondaryAction && (
                    <button
                      onClick={() => {
                        modal.secondaryAction?.onClick();
                        closeModal();
                      }}
                      className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:w-auto"
                    >
                      {modal.secondaryAction.label}
                    </button>
                  )}
                  {modal.primaryAction && (
                    <PrimaryActionButton 
                      action={modal.primaryAction} 
                      closeModal={closeModal} 
                    />
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

function PrimaryActionButton({ action, closeModal }: { action: any, closeModal: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(action.disabledUntil || 0);

  React.useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t: number) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleClick = async () => {
    if (isLoading || timeLeft > 0) return;
    setIsLoading(true);
    try {
      await action.onClick();
      closeModal();
    } catch (error) {
      console.error('Modal action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = action.disabled || timeLeft > 0 || isLoading;

  return (
    <button
      disabled={isDisabled}
      onClick={handleClick}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:w-auto ${
        action.variant === 'danger'
          ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
          : 'bg-orange-600 text-white hover:bg-orange-700 disabled:bg-orange-300'
      }`}
    >
      {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {action.label}
      {timeLeft > 0 && ` (${timeLeft}s)`}
    </button>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
