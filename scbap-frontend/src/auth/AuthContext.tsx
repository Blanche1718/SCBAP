import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import type { ApiResponse } from "../types";

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
  user: AuthenticatedUser;
};
// Valeur du contexte d'authentification
type AuthContextValue = {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<AuthenticatedUser | null>;
};
// Création du contexte d'authentification
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Fournisseur du contexte d'authentification
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const res = await api.get<ApiResponse<AuthenticatedUser>>("/auth/me");
        if (active) {
          setUser(res.data);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const handleInvalidAuth = () => {
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

    setUser(res.data.user);
  }

  function logout() {
    void api.post<ApiResponse<{ ok: boolean }>>("/auth/logout", {});
    setUser(null);
  }

  async function refreshUser() {
    try {
      const res = await api.get<ApiResponse<AuthenticatedUser>>("/auth/me");
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [user, loading],
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
