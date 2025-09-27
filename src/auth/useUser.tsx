/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { ENV, type AuthMode } from '@/app/env';
import { getFirebaseServices } from '@/lib/firebase';

type Role = 'Planner' | 'Manager' | 'Admin';

export type UserLike = {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  role: Role;
};

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type UserContextValue = {
  mode: AuthMode;
  status: AuthStatus;
  user: UserLike;
  setRole: (role: Role) => void;
  canEditRole: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const defaultUserBase = {
  id: 'local-user',
  name: 'Taylor Planner',
  email: 'taylor.planner@example.com',
} as const;

const UserContext = createContext<UserContextValue | undefined>(undefined);

const LEGACY_ROLE_KEY = 'mp-role';
const ROLE_STORAGE_PREFIX = 'mp-role';

function isRole(value: string | null): value is Role {
  return value === 'Planner' || value === 'Manager' || value === 'Admin';
}

function readStoredRole(userId: string): Role | undefined {
  if (typeof window === 'undefined') return undefined;
  const explicitKey = `${ROLE_STORAGE_PREFIX}:${userId}`;
  const explicitRole = window.localStorage.getItem(explicitKey);
  if (isRole(explicitRole)) {
    return explicitRole;
  }
  const legacyRole = window.localStorage.getItem(LEGACY_ROLE_KEY);
  if (isRole(legacyRole)) {
    return legacyRole;
  }
  return undefined;
}

function writeStoredRole(userId: string, role: Role) {
  if (typeof window === 'undefined') return;
  const explicitKey = `${ROLE_STORAGE_PREFIX}:${userId}`;
  window.localStorage.setItem(explicitKey, role);
  window.localStorage.setItem(LEGACY_ROLE_KEY, role);
}

function MockUserProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => readStoredRole(defaultUserBase.id) ?? 'Planner');

  useEffect(() => {
    writeStoredRole(defaultUserBase.id, role);
  }, [role]);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      mode: 'mock',
      status: 'authenticated',
      user: { ...defaultUserBase, role },
      setRole,
      canEditRole: true,
      signIn: async () => {},
      signOut: async () => {},
    }),
    [role, setRole],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

function FirebaseUserProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [baseUser, setBaseUser] = useState<Omit<UserLike, 'role'>>({
    id: 'anonymous-user',
    name: 'Guest User',
    email: undefined,
  });
  const [userId, setUserId] = useState<string>('anonymous-user');
  const [role, setRoleState] = useState<Role>(() => readStoredRole('anonymous-user') ?? 'Planner');

  useEffect(() => {
    const { auth } = getFirebaseServices();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const nextRole = readStoredRole(firebaseUser.uid) ?? 'Planner';
        setBaseUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName ?? firebaseUser.email ?? 'Authenticated Planner',
          email: firebaseUser.email ?? undefined,
          photoURL: firebaseUser.photoURL ?? undefined,
        });
        setUserId(firebaseUser.uid);
        setRoleState(nextRole);
        setStatus('authenticated');
      } else {
        const nextRole = readStoredRole('anonymous-user') ?? 'Planner';
        setBaseUser({ id: 'anonymous-user', name: 'Guest User', email: undefined });
        setUserId('anonymous-user');
        setRoleState(nextRole);
        setStatus('unauthenticated');
      }
    });
    return () => unsubscribe();
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    writeStoredRole(userId, next);
  }, [userId]);

  const signIn = useCallback(async () => {
    const { auth } = getFirebaseServices();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    const { auth } = getFirebaseServices();
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      mode: 'firebase',
      status,
      user: { ...baseUser, role },
      setRole,
      canEditRole: true,
      signIn,
      signOut,
    }),
    [baseUser, role, setRole, signIn, signOut, status],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function UserProvider({ children }: { children: ReactNode }) {
  if (ENV.auth === 'firebase') {
    return <FirebaseUserProvider>{children}</FirebaseUserProvider>;
  }
  return <MockUserProvider>{children}</MockUserProvider>;
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
