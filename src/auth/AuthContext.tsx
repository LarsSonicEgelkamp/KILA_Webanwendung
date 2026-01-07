import React from 'react';
import { supabase } from '../lib/supabaseClient';

export type Role = 'admin' | 'leitung' | 'user';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type AuthResult = {
  ok: boolean;
  error?:
    | 'missing_fields'
    | 'email_in_use'
    | 'invalid_credentials'
    | 'weak_password'
    | 'invalid_email'
    | 'server_error';
};

type AuthContextValue = {
  user: User | null;
  users: User[];
  loading: boolean;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateRole: (id: string, role: Role) => Promise<AuthResult>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const parseAuthError = (message?: string | null): AuthResult['error'] => {
  if (!message) {
    return 'server_error';
  }
  const normalized = message.toLowerCase();
  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'email_in_use';
  }
  if (normalized.includes('password')) {
    return 'weak_password';
  }
  if (normalized.includes('invalid email') || (normalized.includes('email') && normalized.includes('invalid'))) {
    return 'invalid_email';
  }
  if (normalized.includes('invalid login credentials') || normalized.includes('invalid')) {
    return 'invalid_credentials';
  }
  return 'server_error';
};

const profileFromRow = (row: {
  id: string;
  name: string | null;
  email: string | null;
  role: Role | null;
}): User => ({
  id: row.id,
  name: row.name ?? 'User',
  email: row.email ?? '',
  role: row.role ?? 'user'
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchProfile = React.useCallback(async (id: string, fallback?: { name?: string; email?: string }) => {
    const { data, error } = await supabase.from('profiles').select('id, name, email, role').eq('id', id).single();
    if (data) {
      return profileFromRow(data);
    }
    if (error && error.code !== 'PGRST116') {
      return null;
    }
    const profile: User = {
      id,
      name: fallback?.name?.trim() || 'User',
      email: fallback?.email?.trim() || '',
      role: 'user'
    };
    const { error: insertError } = await supabase.from('profiles').insert({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role
    });
    if (insertError) {
      return null;
    }
    return profile;
  }, []);

  const refreshUsers = React.useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, name, email, role').order('name');
    setUsers((data ?? []).map(profileFromRow));
  }, []);

  const setSessionUser = React.useCallback(
    async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!sessionUser) {
        setUser(null);
        setUsers([]);
        setLoading(false);
        return;
      }
      const profile = await fetchProfile(sessionUser.id, {
        name: typeof sessionUser.user_metadata?.name === 'string' ? sessionUser.user_metadata.name : undefined,
        email: sessionUser.email ?? undefined
      });
      if (!profile) {
        setUser(null);
        setUsers([]);
        setLoading(false);
        return;
      }
      setUser(profile);
      if (profile.role === 'admin' || profile.role === 'leitung') {
        await refreshUsers();
      } else {
        setUsers([profile]);
      }
      setLoading(false);
    },
    [fetchProfile, refreshUsers]
  );

  React.useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      await setSessionUser(data.session?.user ?? null);
    };
    bootstrap();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [setSessionUser]);

  const register = async (input: RegisterInput): Promise<AuthResult> => {
    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    if (!name || !email || !input.password) {
      return { ok: false, error: 'missing_fields' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { name }
      }
    });
    if (error) {
      return { ok: false, error: parseAuthError(error.message) };
    }
    if (!data.user) {
      return { ok: false, error: 'server_error' };
    }
    return { ok: true };
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password
    });
    if (error) {
      return { ok: false, error: parseAuthError(error.message) };
    }
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateRole = async (id: string, role: Role): Promise<AuthResult> => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) {
      return { ok: false, error: 'server_error' };
    }
    await refreshUsers();
    return { ok: true };
  };

  return (
    <AuthContext.Provider value={{ user, users, loading, register, login, logout, updateRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
