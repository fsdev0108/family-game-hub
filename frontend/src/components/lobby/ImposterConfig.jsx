export default function ImposterConfig({ config, players, onChange, isHost }) {
  const wordSetterId = config?.wordSetterId ?? '';
  const imposterSelectionMode = config?.imposterSelectionMode ?? 'random';
  const imposterId = config?.imposterId ?? '';

  function update(patch) {
    onChange({ wordSetterId, imposterSelectionMode, imposterId, ...patch });
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Game Settings</h3>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-400">Word Setter 📝</label>
        <select
          value={wordSetterId}
          onChange={(e) => update({ wordSetterId: e.target.value, imposterId: '' })}
          disabled={!isHost}
          className="w-full bg-dark-600/60 border border-border rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">Select word setter...</option>
          {players.map(p => (
            <option key={p.id || p.name} value={p.id}>{p.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500">This player knows both words and sets them at the start.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-400">Imposter Selection 🕵️</label>
        <div className="grid grid-cols-2 gap-2">
          {['random', 'manual'].map(mode => (
            <button
              key={mode}
              onClick={() => update({ imposterSelectionMode: mode, imposterId: '' })}
              disabled={!isHost}
              className={`py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed capitalize ${
                imposterSelectionMode === mode
                  ? 'bg-violet-600/30 border-violet-500/60 text-violet-300'
                  : 'bg-dark-600/40 border-border text-slate-400 hover:border-violet-500/30'
              }`}
            >
              {mode === 'random' ? '🎲 Random' : '👆 Manual'}
            </button>
          ))}
        </div>
      </div>

      {imposterSelectionMode === 'manual' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-400">Choose Imposter</label>
          <select
            value={imposterId}
            onChange={(e) => update({ imposterId: e.target.value })}
            disabled={!isHost}
            className="w-full bg-dark-600/60 border border-border rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">Select imposter...</option>
            {players
              .filter(p => p.id !== wordSetterId)
              .map(p => (
                <option key={p.id || p.name} value={p.id}>{p.name}</option>
              ))}
          </select>
        </div>
      )}

      {!wordSetterId && (
        <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-2">
          A word setter must be selected before starting.
        </p>
      )}
    </div>
  );
}
