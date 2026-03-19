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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
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
              className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full ${
                modal.size === 'sm' ? 'max-w-md' :
                modal.size === 'lg' ? 'max-w-2xl' :
                modal.size === 'xl' ? 'max-w-4xl' :
                'max-w-lg'
              }`}
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{modal.title}</h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                {modal.content}
              </div>

              {(modal.primaryAction || modal.secondaryAction) && (
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
                  {modal.secondaryAction && (
                    <button
                      onClick={() => {
                        modal.secondaryAction?.onClick();
                        closeModal();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
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
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
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
