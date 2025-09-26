import { AppRoutes } from './routes';
import { AuthGate } from '@/auth/AuthGate';

export function App() {
  return (
    <AuthGate>
      <AppRoutes />
    </AuthGate>
  );
}
