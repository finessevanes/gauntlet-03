import React, { createContext, useContext, useState, useCallback } from "react";
import { Session, AppState } from "../types/session";

interface SessionContextType extends AppState {
  setSession: (session: Session) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session>({
    version: 1,
    clips: [],
    timelineOrder: [],
    zoomLevel: 100,
    scrollPosition: 0,
  });

  const handleSetSession = useCallback((newSession: Session) => {
    setSession(newSession);
  }, []);

  const handleSetLoading = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const handleSetError = useCallback((errorMsg: string | null) => {
    setError(errorMsg);
  }, []);

  const value: SessionContextType = {
    session,
    loading,
    error,
    setSession: handleSetSession,
    setLoading: handleSetLoading,
    setError: handleSetError,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
