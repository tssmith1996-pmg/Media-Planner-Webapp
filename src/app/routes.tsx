import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { MediaPlanningPage } from '@/pages/MediaPlanningPage';
import { PlanDetailPage } from '@/pages/PlanDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/plan/:id" element={<MediaPlanningPage />} />
      <Route path="/plan/:id/review" element={<PlanDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
