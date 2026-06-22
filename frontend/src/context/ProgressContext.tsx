/**
 * Progress Context
 * Provides a way to trigger progress bar refresh from anywhere in the app
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProgressContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <ProgressContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};
