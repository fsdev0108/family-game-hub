import Button from '../shared/Button';

export default function WinkMurderConfig({ config, playerCount, onChange, isHost }) {
  const killerCount = config?.killerCount ?? 1;
  const detectiveCount = config?.detectiveCount ?? 0;
  const civilianCount = Math.max(0, playerCount - killerCount - detectiveCount);

  function adjust(field, delta) {
    const next = { killerCount, detectiveCount, [field]: Math.max(0, (field === 'killerCount' ? killerCount : detectiveCount) + delta) };
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Game Settings</h3>

      <div className="space-y-3">
        {[
          { label: 'Killers', field: 'killerCount', value: killerCount, color: 'text-red-400', min: 1, emoji: '🔪' },
          { label: 'Detectives', field: 'detectiveCount', value: detectiveCount, color: 'text-cyan-400', min: 0, emoji: '🔍' },
        ].map(({ label, field, value, color, min, emoji }) => (
          <div key={field} className="flex items-center justify-between px-4 py-3 bg-dark-600/40 border border-border rounded-xl">
            <span className="flex items-center gap-2 text-slate-300 font-medium">
              <span>{emoji}</span> {label}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjust(field, -1)}
                disabled={!isHost || value <= min}
                className="w-8 h-8 rounded-lg bg-dark-500 border border-border text-slate-300 hover:bg-dark-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >−</button>
              <span className={`w-6 text-center font-bold text-lg ${color}`}>{value}</span>
              <button
                onClick={() => adjust(field, 1)}
                disabled={!isHost}
                className="w-8 h-8 rounded-lg bg-dark-500 border border-border text-slate-300 hover:bg-dark-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >+</button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between px-4 py-3 bg-dark-600/20 border border-border/50 rounded-xl">
          <span className="flex items-center gap-2 text-slate-400">
            <span>👥</span> Civilians
          </span>
          <span className={`font-bold text-lg ${civilianCount < 1 ? 'text-red-400' : 'text-emerald-400'}`}>{civilianCount}</span>
        </div>
      </div>

      {civilianCount < 1 && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
          At least 1 civilian is required. Reduce killers or detectives.
        </p>
      )}

      <p className="text-xs text-slate-500">
        Roles are assigned randomly when the game starts. Need at least 3 players.
      </p>
    </div>
  );
}
