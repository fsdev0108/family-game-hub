import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useSession } from '../contexts/SessionContext';
import { api } from '../api';
import { toastError, toastInfo, toastSuccess } from '../utils/toast';
import PlayerList from '../components/lobby/PlayerList';
import WinkMurderConfig from '../components/lobby/WinkMurderConfig';
import ImposterConfig from '../components/lobby/ImposterConfig';
import Button from '../components/shared/Button';
import Spinner from '../components/shared/Spinner';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3002`;

const gameInfo = {
  'wink-murder': { emoji: '🔪', name: 'Wink Murder', color: 'from-red-900/40 to-red-800/20', border: 'border-red-500/30' },
  imposter: { emoji: '🕵️', name: 'Imposter', color: 'from-pink-900/40 to-pink-800/20', border: 'border-pink-500/30' },
};

const GAME_TYPES = [
  { id: 'wink-murder', emoji: '🔪', name: 'Wink Murder' },
  { id: 'imposter', emoji: '🕵️', name: 'Imposter' },
];

export default function LobbyPage() {
  const navigate = useNavigate();
  const { session, setSession, clearSession } = useSession();
  const socketRef = useRef(null);

  const [players, setPlayers] = useState([]);
  const [config, setConfig] = useState({});
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const roomCode = session?.roomCode;
  const isHost = session?.player?.isHost;
  const gameType = session?.gameType || 'wink-murder';
  const game = gameInfo[gameType] || gameInfo['wink-murder'];

  const fetchPlayers = useCallback(async () => {
    if (!roomCode) return;
    try {
      const data = await api.getPlayers(roomCode);
      setPlayers(data.players);
    } catch (_) {}
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;

    fetchPlayers();
    // Fetch current config so the controls show the actual saved values
    api.getRoom(roomCode)
      .then(room => { if (room.config) setConfig(room.config); })
      .catch(() => {});

    const socket = io(`${SOCKET_URL}/lobby`, {
      withCredentials: true,
      transports: ['websocket'],
      auth: { playerId: session?.player?.id, roomCode },
    });
    socketRef.current = socket;

    socket.on('lobby:player_joined', ({ player }) => {
      setPlayers(prev => {
        if (prev.find(p => p.name === player.name)) return prev;
        toastInfo(`${player.name} joined!`);
        return [...prev, player];
      });
    });

    socket.on('lobby:player_left', ({ playerName }) => {
      setPlayers(prev => prev.filter(p => p.name !== playerName));
      toastInfo(`${playerName} left`);
    });

    socket.on('lobby:player_renamed', ({ oldName, newName }) => {
      setPlayers(prev => prev.map(p => p.name === oldName ? { ...p, name: newName } : p));
    });

    socket.on('lobby:config_updated', ({ config: newConfig }) => {
      setConfig(newConfig);
    });

    socket.on('lobby:game_type_changed', ({ gameType: newGameType, config: newConfig }) => {
      setSession(prev => ({ ...prev, gameType: newGameType }));
      setConfig(newConfig || {});
    });

    socket.on('lobby:game_starting', ({ gameType }) => {
      toastSuccess('Game is starting!');
      setStarting(true);
      // Update session phase so route guards don't redirect back to lobby
      setSession(prev => ({ ...prev, phase: 'starting' }));
      setTimeout(() => {
        navigate(`/game/${gameType}`, { replace: true });
      }, 1200);
    });

    socket.on('lobby:error', ({ code, message }) => {
      if (code === 'HOST_LEFT') {
        toastError(message);
        clearSession();
        navigate('/', { replace: true });
      } else {
        toastError(message);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode]);

  function handleUpdateConfig(newConfig) {
    socketRef.current?.emit('lobby:update_config', newConfig);
  }

  function handleChangeGameType(newGameType) {
    if (newGameType === gameType) return;
    socketRef.current?.emit('lobby:change_game_type', { gameType: newGameType });
  }

  function handleStartGame() {
    socketRef.current?.emit('lobby:start_game');
  }

  async function handleLeave() {
    setLeaving(true);
    await clearSession();
    navigate('/', { replace: true });
  }

  function handleCopyCode() {
    const onCopied = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    // navigator.clipboard requires HTTPS or localhost; use execCommand as LAN fallback
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomCode).then(onCopied).catch(() => fallbackCopy(roomCode, onCopied));
    } else {
      fallbackCopy(roomCode, onCopied);
    }
  }

  function fallbackCopy(text, onSuccess) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand('copy'); onSuccess(); } catch (_) {}
    document.body.removeChild(el);
  }

  if (!session?.valid) return null;

  return (
    <div className="min-h-screen bg-dark-900 bg-grid relative overflow-hidden">
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

      {starting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-900/95 backdrop-blur-sm animate-fade-in">
          <div className="text-7xl mb-4 animate-float">{game.emoji}</div>
          <h2 className="text-3xl font-black text-white mb-2">Game Starting!</h2>
          <p className="text-slate-400">Get ready...</p>
          <Spinner size="lg" className="mt-6" />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <span>{game.emoji}</span>
              <span>{game.name}</span>
            </div>
            <h1 className="text-2xl font-black text-white">Game Lobby</h1>
          </div>
          <Button onClick={handleLeave} loading={leaving} variant="ghost" size="sm">
            Leave
          </Button>
        </div>

        {/* Room code card */}
        <div className={`bg-gradient-to-br ${game.color} border ${game.border} rounded-2xl p-6 mb-6 animate-fade-in-up`}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-slate-400 mb-1">Room Code</p>
              <div className="font-mono text-4xl font-black text-white tracking-[0.2em]">{roomCode}</div>
              <p className="text-xs text-slate-500 mt-1">Share with family members to join</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm text-slate-300 transition-all"
            >
              {copied ? '✅ Copied!' : '📋 Copy Code'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Players */}
          <div className="bg-dark-700 border border-border rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-200">
                Players <span className="text-slate-500 font-normal text-sm ml-1">({players.length}/12)</span>
              </h2>
              {players.length < 3 && (
                <span className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2 py-1 rounded-full">
                  Need {3 - players.length} more
                </span>
              )}
            </div>
            <PlayerList players={players} currentPlayerId={session?.player?.id} />
          </div>

          {/* Config + Start */}
          <div className="space-y-4">
            {/* Game type selector */}
            <div className="bg-dark-700 border border-border rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
              <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Game</p>
              <div className="flex gap-2">
                {GAME_TYPES.map(g => {
                  const active = gameType === g.id;
                  return isHost ? (
                    <button
                      key={g.id}
                      onClick={() => handleChangeGameType(g.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                        active
                          ? 'bg-violet-600/30 border-violet-500/60 text-violet-300'
                          : 'bg-dark-600/40 border-border text-slate-500 hover:text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span>{g.emoji}</span>
                      <span>{g.name}</span>
                    </button>
                  ) : (
                    <div
                      key={g.id}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium ${
                        active
                          ? 'bg-violet-600/30 border-violet-500/60 text-violet-300'
                          : 'bg-dark-600/40 border-border text-slate-600'
                      }`}
                    >
                      <span>{g.emoji}</span>
                      <span>{g.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-dark-700 border border-border rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              {gameType === 'wink-murder' && (
                <WinkMurderConfig
                  config={config}
                  playerCount={players.length}
                  onChange={handleUpdateConfig}
                  isHost={isHost}
                />
              )}
              {gameType === 'imposter' && (
                <ImposterConfig
                  config={config}
                  players={players}
                  onChange={handleUpdateConfig}
                  isHost={isHost}
                />
              )}
            </div>

            {isHost && (
              <div className="bg-dark-700 border border-border rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                <Button
                  onClick={handleStartGame}
                  fullWidth
                  size="lg"
                  disabled={players.length < 3}
                  className="animate-pulse-glow"
                >
                  Start Game {game.emoji}
                </Button>
                {players.length < 3 && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Need at least 3 players to start
                  </p>
                )}
              </div>
            )}

            {!isHost && (
              <div className="bg-dark-700/50 border border-border rounded-2xl p-5 text-center animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                <div className="text-2xl mb-2 animate-float">⏳</div>
                <p className="text-slate-400 text-sm">Waiting for the host to start the game...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
