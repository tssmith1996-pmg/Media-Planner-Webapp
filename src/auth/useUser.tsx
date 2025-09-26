/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type Role = 'Planner' | 'Manager' | 'Admin';

export type UserLike = {
  id: string;
  name: string;
  email?: string;
  role: Role;
};

type UserContextValue = {
  user: UserLike;
  setRole: (role: Role) => void;
};

const defaultUser: UserLike = {
  id: 'local-user',
  name: 'Taylor Planner',
  role: 'Planner',
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

const STORAGE_KEY = 'mp-role';

function readStoredRole(): Role | undefined {
  if (typeof window === 'undefined') return undefined;
  const role = window.localStorage.getItem(STORAGE_KEY) as Role | null;
  if (!role) return undefined;
  if (role === 'Planner' || role === 'Manager' || role === 'Admin') {
    return role;
  }
  return undefined;
}

function writeStoredRole(role: Role) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, role);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => readStoredRole() ?? defaultUser.role);

  useEffect(() => {
    writeStoredRole(role);
  }, [role]);

  const setRole = (next: Role) => setRoleState(next);

  const value = useMemo<UserContextValue>(
    () => ({ user: { ...defaultUser, role }, setRole }),
    [role],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}

export function canApprove(user: UserLike) {
  return user.role === 'Manager' || user.role === 'Admin';
}
