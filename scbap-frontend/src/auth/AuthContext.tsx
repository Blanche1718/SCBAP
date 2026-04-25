import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import type { ApiResponse } from "../types";
import { clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from "./authStorage";

// Types 
export type AuthenticatedUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  statut: string;
  createdAt: string;
  role: {
    id: string;
    nom: string;
  };
  structure: {
    id: string;
    nom: string;
    code: string;
    type: string;
    juridiction?: string | null;
  };
};
// Response type for login endpoint
type LoginResponse = {
  token: string;
  user: AuthenticatedUser;
};
// Valeur du contexte d'authentification
type AuthContextValue = {
  user: AuthenticatedUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<AuthenticatedUser | null>;
};
// Création du contexte d'authentification
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Fournisseur du contexte d'authentification
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const storedToken = getStoredAuthToken();

      if (!storedToken) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await api.get<ApiResponse<AuthenticatedUser>>("/auth/me");
        if (active) {
          setUser(res.data);
          setToken(storedToken);
        }
      } catch {
        clearStoredAuthToken();
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const handleInvalidAuth = () => {
      clearStoredAuthToken();
      setToken(null);
      setUser(null);
      setLoading(false);
    };

    bootstrap();
    window.addEventListener("scbap:auth-invalid", handleInvalidAuth);

    return () => {
      active = false;
      window.removeEventListener("scbap:auth-invalid", handleInvalidAuth);
    };
  }, []);
// Fonction de connexion
  async function login(email: string, motDePasse: string) {
    const res = await api.post<ApiResponse<LoginResponse>>("/auth/login", {
      email,
      motDePasse,
    });

    setStoredAuthToken(res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    clearStoredAuthToken();
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const storedToken = getStoredAuthToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      return null;
    }

    const res = await api.get<ApiResponse<AuthenticatedUser>>("/auth/me");
    setToken(storedToken);
    setUser(res.data);
    return res.data;
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit etre utilise dans AuthProvider");
  }

  return context;
}
