import { ReactNode, useState } from 'react';
import { useUser } from './useUser';
import { Select } from '@/ui/Select';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, setRole, status, mode, canEditRole, signIn, signOut } = useUser();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signIn();
    } catch (err) {
      console.error(err);
      setError('Sign-in failed. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      await signOut();
    } catch (err) {
      console.error(err);
      setError('Sign-out failed. Please try again.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <p className="text-sm">Checking your session…</p>
      </div>
    );
  }

  if (mode === 'firebase' && status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
        <Card className="w-full max-w-md space-y-4 p-6">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold">Sign in to Media Planner</h1>
            <p className="text-sm text-slate-500">
              Use your workspace credentials to continue. For local development without authentication, run
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">npm run dev:mock</code>.
            </p>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button variant="primary" onClick={handleSignIn} className="w-full">
            Continue with Google
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Media Planner</h1>
            <p className="text-sm text-slate-500">
              Signed in as {user.name}
              {user.email ? <span className="ml-1 text-xs">({user.email})</span> : null}
            </p>
          </div>
          {canEditRole && mode === 'mock' ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Role</span>
              <Select value={user.role} onChange={(event) => setRole(event.target.value as typeof user.role)}>
                <option value="Planner">Planner</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </Select>
            </div>
          ) : (
            <Button variant="ghost" onClick={handleSignOut} className="text-sm text-slate-500">
              Sign out
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {error && mode === 'firebase' && status === 'authenticated' ? (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {error}
          </p>
        ) : null}
        <Card>{children}</Card>
      </main>
    </div>
  );
}
