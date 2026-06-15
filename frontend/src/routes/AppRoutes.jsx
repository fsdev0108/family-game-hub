import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import Spinner from '../components/shared/Spinner';
import HomePage from '../pages/HomePage';
import LobbyPage from '../pages/LobbyPage';
import WinkMurderPage from '../pages/WinkMurderPage';
import ImposterPage from '../pages/ImposterPage';
import NotFoundPage from '../pages/NotFoundPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Redirects away from home if player already has an active session
function HomeGuard({ children }) {
  const { session, loading } = useSession();
  if (loading) return <LoadingScreen />;
  if (session?.valid) {
    if (session.phase === 'lobby') return <Navigate to="/lobby" replace />;
    if (session.gameType) return <Navigate to={`/game/${session.gameType}`} replace />;
  }
  return children;
}

// Requires a valid session; redirects to home if none
function AuthGuard({ children }) {
  const { session, loading } = useSession();
  if (loading) return <LoadingScreen />;
  if (!session?.valid) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <HomeGuard><HomePage /></HomeGuard>
      } />
      <Route path="/lobby" element={
        <AuthGuard><LobbyPage /></AuthGuard>
      } />
      <Route path="/game/wink-murder" element={
        <AuthGuard><WinkMurderPage /></AuthGuard>
      } />
      <Route path="/game/imposter" element={
        <AuthGuard><ImposterPage /></AuthGuard>
      } />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
