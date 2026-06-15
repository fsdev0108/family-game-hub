import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center px-4">
      <div className="text-center animate-fade-in-up">
        <div className="text-8xl mb-6 animate-float">🎲</div>
        <h1 className="text-6xl font-black text-white mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-8">This page doesn't exist in any game!</p>
        <Button onClick={() => navigate('/')} size="lg">
          Back to Home 🏠
        </Button>
      </div>
    </div>
  );
}
