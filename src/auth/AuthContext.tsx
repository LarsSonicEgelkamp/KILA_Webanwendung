import React from 'react';

export type Role = 'admin' | 'leitung' | 'user';

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role?: Role;
  autoLogin?: boolean;
};

type AuthResult = {
  ok: boolean;
  error?: string;
};

type AuthContextValue = {
  user: User | null;
  users: User[];
  register: (input: RegisterInput) => AuthResult;
  login: (email: string, password: string) => AuthResult;
  logout: () => void;
  updateRole: (id: string, role: Role) => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const USERS_KEY = 'kila_users';
const CURRENT_KEY = 'kila_current_user';

const readUsers = (): User[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as User[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readCurrentId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(CURRENT_KEY);
};

const writeUsers = (users: User[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const writeCurrentId = (id: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (id) {
    localStorage.setItem(CURRENT_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_KEY);
  }
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = React.useState<User[]>(() => readUsers());
  const [user, setUser] = React.useState<User | null>(() => {
    const currentId = readCurrentId();
    if (!currentId) {
      return null;
    }
    return readUsers().find((stored) => stored.id === currentId) ?? null;
  });

  React.useEffect(() => {
    writeUsers(users);
    if (user) {
      const updated = users.find((stored) => stored.id === user.id);
      if (updated && updated !== user) {
        setUser(updated);
      }
      if (!updated) {
        setUser(null);
      }
    }
  }, [users, user]);

  React.useEffect(() => {
    writeCurrentId(user ? user.id : null);
  }, [user]);

  const register = (input: RegisterInput): AuthResult => {
    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    if (!name || !email || !input.password) {
      return { ok: false, error: 'missing_fields' };
    }
    if (users.some((stored) => normalizeEmail(stored.email) === email)) {
      return { ok: false, error: 'email_in_use' };
    }
    const role = input.role ?? (users.length === 0 ? 'admin' : 'user');
    const newUser: User = {
      id: createId(),
      name,
      email,
      password: input.password,
      role
    };
    setUsers((prev) => [...prev, newUser]);
    if (input.autoLogin !== false) {
      setUser(newUser);
    }
    return { ok: true };
  };

  const login = (email: string, password: string): AuthResult => {
    const normalized = normalizeEmail(email);
    const found = users.find(
      (stored) => normalizeEmail(stored.email) === normalized && stored.password === password
    );
    if (!found) {
      return { ok: false, error: 'invalid_credentials' };
    }
    setUser(found);
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
  };

  const updateRole = (id: string, role: Role) => {
    setUsers((prev) => prev.map((stored) => (stored.id === id ? { ...stored, role } : stored)));
  };

  return (
    <AuthContext.Provider value={{ user, users, register, login, logout, updateRole }}>
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
