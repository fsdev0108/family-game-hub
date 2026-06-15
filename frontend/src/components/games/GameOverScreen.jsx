import Button from '../shared/Button';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import { api } from '../../api';

export default function GameOverScreen({ winner, subtitle, stats = [] }) {
  const navigate = useNavigate();
  const { clearSession } = useSession();

  async function handleLeave() {
    await clearSession();
    navigate('/', { replace: true });
  }

  const isWin = winner === 'players' || winner === 'civilians';

  return (
    <div className="flex flex-col items-center gap-8 py-8 animate-fade-in-up">
      <div className="text-center">
        <div className="text-7xl mb-4 animate-float">{isWin ? '🏆' : '💀'}</div>
        <h1 className={`text-4xl font-black mb-2 ${isWin ? 'text-amber-400 text-glow-purple' : 'text-red-400'}`}>
          {isWin ? 'Players Win!' : winner === 'killers' ? 'Killers Win!' : 'Imposter Wins!'}
        </h1>
        {subtitle && <p className="text-slate-400 text-lg">{subtitle}</p>}
      </div>

      {stats.length > 0 && (
        <div className="w-full max-w-sm space-y-2">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 bg-dark-600/50 border border-border rounded-xl">
              <span className="text-slate-400 text-sm">{stat.label}</span>
              <span className="font-semibold text-slate-200">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      <Button onClick={handleLeave} size="lg" variant="secondary">
        Back to Home
      </Button>
    </div>
  );
}
