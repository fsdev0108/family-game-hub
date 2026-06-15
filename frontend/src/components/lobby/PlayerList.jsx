export default function PlayerList({ players, currentPlayerId }) {
  return (
    <div className="space-y-2">
      {players.map((player, i) => (
        <div
          key={player.name}
          className="flex items-center gap-3 px-4 py-3 bg-dark-600/50 border border-border rounded-xl animate-fade-in-up"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
            ${player.isHost ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}
          >
            {player.name[0].toUpperCase()}
          </div>
          <span className="text-slate-200 font-medium flex-1 truncate">{player.name}</span>
          {player.isHost && (
            <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full">
              Host
            </span>
          )}
        </div>
      ))}
      {players.length === 0 && (
        <p className="text-center text-slate-600 py-6">Waiting for players...</p>
      )}
    </div>
  );
}
