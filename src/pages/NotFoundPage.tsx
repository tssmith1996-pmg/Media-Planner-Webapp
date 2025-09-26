import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Page not found</h2>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link className="text-sm font-semibold text-indigo-600" to="/">
        Back to dashboard
      </Link>
    </div>
  );
}
