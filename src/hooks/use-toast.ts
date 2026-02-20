import { useState, useCallback } from 'react';

export function useToast() {
  const [isOpen, setIsOpen] = useState(false);

  const showToast = useCallback((message: string, variant: 'default' | 'destructive' = 'default') => {
    setIsOpen(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setIsOpen(false);
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    showToast,
    hideToast,
  };
}
