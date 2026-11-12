import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { NewInspection } from './pages/NewInspection'
import { InspectionHistory } from './pages/InspectionHistory'
import { InspectionDetailsPage } from './pages/InspectionDetailsPage'
import { Analytics } from './pages/Analytics'
import { ModelPerformance } from './pages/ModelPerformance'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inspect" element={<NewInspection />} />
          <Route path="/history" element={<InspectionHistory />} />
          <Route path="/history/:id" element={<InspectionDetailsPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/model" element={<ModelPerformance />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
