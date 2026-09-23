import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler, tokenStorage } from '@/api/client';
import type { LoginResponse, Usuario } from '@/types/api';

type UsuarioSesion = Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol'>;

interface AuthContextValue {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  esAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUsuario(null);
    queryClient.clear();
  }, [queryClient]);

  // Al cargar la página: valida el token guardado con /auth/me
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStorage.get()) {
      setCargando(false);
      return;
    }
    api
      .get<Usuario>('/auth/me')
      .then((res) => setUsuario(res.data))
      .catch(() => logout())
      .finally(() => setCargando(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    tokenStorage.set(data.token);
    setUsuario(data.usuario);
  }, []);

  const value = useMemo(
    () => ({ usuario, cargando, esAdmin: usuario?.rol === 'ADMIN', login, logout }),
    [usuario, cargando, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
