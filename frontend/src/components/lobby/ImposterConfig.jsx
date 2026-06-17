export default function ImposterConfig({ config, players, onChange, isHost }) {
  const wordSetterId = config?.wordSetterId ?? '';

  function update(patch) {
    onChange({ wordSetterId, ...patch });
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Game Settings</h3>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-400">Word Setter 📝</label>
        <select
          value={wordSetterId}
          onChange={(e) => update({ wordSetterId: e.target.value })}
          disabled={!isHost}
          className="w-full bg-dark-600/60 border border-border rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">Select word setter...</option>
          {players.map(p => (
            <option key={p.id || p.name} value={p.id}>{p.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          This player sets the words and secretly picks the imposter at game start.
        </p>
      </div>

      {!wordSetterId && (
        <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-2">
          A word setter must be selected before starting.
        </p>
      )}
    </div>
  );
}
