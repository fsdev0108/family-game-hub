import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSession()
      .then(setSession)
      .catch(() => setSession({ valid: false }))
      .finally(() => setLoading(false));
  }, []);

  async function clearSession() {
    try { await api.clearSession(); } catch (_) {}
    setSession({ valid: false });
  }

  return (
    <SessionContext.Provider value={{ session, setSession, clearSession, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
