import { ReactNode } from 'react';
import { useUser } from './useUser';
import { Select } from '@/ui/Select';
import { Card } from '@/ui/Card';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, setRole } = useUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Media Planner</h1>
            <p className="text-sm text-slate-500">Signed in as {user.name}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Role</span>
            <Select value={user.role} onChange={(event) => setRole(event.target.value as typeof user.role)}>
              <option value="Planner">Planner</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </Select>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Card>{children}</Card>
      </main>
    </div>
  );
}
