import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useSession } from '../contexts/SessionContext';
import { api } from '../api';
import { toastError, toastInfo, toastSuccess } from '../utils/toast';
import RoleRevealCard from '../components/games/RoleRevealCard';
import GameOverScreen from '../components/games/GameOverScreen';
import Button from '../components/shared/Button';
import Spinner from '../components/shared/Spinner';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3002`;

export default function WinkMurderPage() {
  const navigate = useNavigate();
  const { session, clearSession } = useSession();
  const socketRef = useRef(null);

  const [phase, setPhase] = useState('role-reveal');
  const [myRole, setMyRole] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [playerNames, setPlayerNames] = useState([]);
  const [eliminated, setEliminated] = useState(new Set());
  const [gameOver, setGameOver] = useState(null);
  const [accusationUsed, setAccusationUsed] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const roomCode = session?.roomCode;
  const myName = session?.player?.name;
  const isHost = session?.player?.isHost;
  const isEliminated = eliminated.has(myName);

  useEffect(() => {
    if (!roomCode) { navigate('/', { replace: true }); return; }

    api.getPlayers(roomCode)
      .then(data => setPlayerNames(data.players.map(p => p.name)))
      .catch(() => {});

    const socket = io(`${SOCKET_URL}/wink-murder`, {
      withCredentials: true,
      transports: ['websocket'],
      auth: { playerId: session?.player?.id, roomCode },
    });
    socketRef.current = socket;

    socket.on('wm:roles_dealt', ({ role }) => setMyRole(role));
    socket.on('wm:all_ready', () => setPhase('playing'));

    socket.on('wm:player_winked', ({ targetName }) => {
      setEliminated(prev => new Set([...prev, targetName]));
      setLastEvent({ type: 'wink', name: targetName });
      if (targetName === myName) toastInfo('You have been winked out! 😵');
      else toastInfo(`${targetName} was winked out!`);
    });

    socket.on('wm:accusation_result', ({ accuserName, accusedName, accusedRole, correct }) => {
      setEliminated(prev => new Set([...prev, correct ? accusedName : accuserName]));
      setLastEvent({ type: 'accusation', accuserName, accusedName, accusedRole, correct });
      if (correct) toastSuccess(`${accuserName} caught the killer!`);
      else toastError(`${accuserName} was wrong — eliminated!`);
    });

    socket.on('wm:game_over', ({ winner, roles }) => {
      setPhase('ended');
      setGameOver({ winner, roles });
    });

    socket.on('error', ({ code, message }) => {
      toastError(message);
      if (code === 'HOST_DISCONNECTED') {
        setTimeout(() => { clearSession(); navigate('/', { replace: true }); }, 2500);
      }
    });

    return () => socket.disconnect();
  }, [roomCode]);

  function handleReady() {
    setIsReady(true);
    socketRef.current?.emit('wm:ready');
  }

  async function handleLeave() {
    setLeaving(true);
    // Emit end game first if host so others get notified, then clear session
    if (isHost) socketRef.current?.emit('wm:end_game');
    await clearSession();
    navigate('/', { replace: true });
  }

  if (!session?.valid) return null;

  if (phase === 'role-reveal') {
    return (
      <GameLayout emoji="🔪" title="Wink Murder" roomCode={roomCode} onLeave={handleLeave} leaving={leaving}>
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {myRole ? (
              <RoleRevealCard role={myRole} onReady={handleReady} isReady={isReady} />
            ) : (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            )}
          </div>
        </div>
      </GameLayout>
    );
  }

  if (phase === 'ended' && gameOver) {
    const rolesArr = Object.entries(gameOver.roles || {}).map(([name, role]) => ({ label: name, value: role }));
    return (
      <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <GameOverScreen
            winner={gameOver.winner}
            subtitle={
              gameOver.winner === 'killers' ? 'The killers outnumbered the civilians!' :
              gameOver.winner === 'civilians' ? 'All killers were caught!' :
              'Game ended by host.'
            }
            stats={rolesArr}
          />
        </div>
      </div>
    );
  }

  return (
    <GameLayout emoji="🔪" title="Wink Murder" roomCode={roomCode} onLeave={handleLeave} leaving={leaving}>
      <div className="flex items-center justify-between mb-4">
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
          myRole === 'killer' ? 'bg-red-900/30 text-red-400 border-red-500/40' :
          myRole === 'detective' ? 'bg-cyan-900/30 text-cyan-400 border-cyan-500/40' :
          'bg-violet-900/30 text-violet-400 border-violet-500/40'
        }`}>
          You: {myRole}
        </div>
        {isHost && (
          <Button variant="danger" size="sm" onClick={() => socketRef.current?.emit('wm:end_game')}>
            End Game
          </Button>
        )}
      </div>

      {isEliminated && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium animate-fade-in">
          😵 You've been eliminated! Watch the game unfold...
        </div>
      )}

      {lastEvent && (
        <div className="mb-4 px-4 py-3 bg-dark-600/60 border border-border rounded-xl text-sm text-slate-300 animate-slide-in-right">
          {lastEvent.type === 'wink' && `💀 ${lastEvent.name} was winked out!`}
          {lastEvent.type === 'accusation' && (
            lastEvent.correct
              ? `🎯 ${lastEvent.accuserName} correctly accused ${lastEvent.accusedName} (${lastEvent.accusedRole})!`
              : `❌ ${lastEvent.accuserName} wrongly accused ${lastEvent.accusedName} — eliminated!`
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-dark-700 border border-border rounded-2xl p-6">
          <h2 className="font-bold text-slate-200 mb-4">Players</h2>
          <div className="space-y-2">
            {playerNames.map(name => {
              const isMe = name === myName;
              const isOut = eliminated.has(name);
              const amKiller = myRole === 'killer';
              const amDetective = myRole === 'detective';

              return (
                <div
                  key={name}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    isOut ? 'bg-red-900/10 border-red-900/20 opacity-50' :
                    isMe ? 'bg-violet-900/20 border-violet-500/30' :
                    'bg-dark-600/40 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{isOut ? '💀' : '👤'}</span>
                    <span className={`font-medium ${isOut ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                      {name} {isMe && <span className="text-xs text-slate-500">(you)</span>}
                    </span>
                  </div>
                  {!isMe && !isOut && !isEliminated && (
                    <div className="flex gap-2">
                      {amKiller && (
                        <Button size="sm" variant="pink" onClick={() => socketRef.current?.emit('wm:wink', { targetName: name })}>
                          😉 Wink
                        </Button>
                      )}
                      {amDetective && !accusationUsed && (
                        <Button size="sm" variant="cyan" onClick={() => {
                          setAccusationUsed(true);
                          socketRef.current?.emit('wm:accuse', { accusedName: name });
                        }}>
                          🎯 Accuse
                        </Button>
                      )}
                    </div>
                  )}
                  {myRole === 'detective' && accusationUsed && !isMe && !isOut && !isEliminated && (
                    <span className="text-xs text-slate-600 italic">accusation used</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-dark-700 border border-border rounded-2xl p-6">
          <h2 className="font-bold text-slate-200 mb-4">Your Role Guide</h2>
          <div className="space-y-3">
            {(myRole === 'killer' ? [
              { icon: '😉', text: 'Wink subtly at civilians to eliminate them' },
              { icon: '🤫', text: 'Stay hidden from the detective!' },
              { icon: '🎯', text: 'Win by outnumbering the civilians' },
            ] : myRole === 'detective' ? [
              { icon: '👀', text: 'Watch everyone carefully for winks' },
              { icon: '🎯', text: `Accusation: ${accusationUsed ? '❌ Used' : '✅ Available — use it wisely!'}` },
              { icon: '💡', text: 'A wrong accusation gets you eliminated!' },
            ] : [
              { icon: '😵', text: 'If winked at, act naturally then "die" theatrically' },
              { icon: '🤝', text: 'Help the detective — talk about who you suspect' },
              { icon: '🛡️', text: 'Survive until the killer is caught!' },
            ]).map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-dark-600/40 border border-border/50 rounded-xl">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-slate-300 leading-relaxed">{item.text}</span>
              </div>
            ))}
            <div className="px-3 py-3 bg-dark-600/20 border border-border/30 rounded-xl mt-2">
              <p className="text-xs text-slate-500 italic">
                🎭 Play physically — act, bluff, and observe your family in person!
              </p>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}

function GameLayout({ emoji, title, roomCode, onLeave, leaving, children }) {
  return (
    <div className="min-h-screen bg-dark-900 bg-grid relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-red-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <h1 className="text-xl font-black text-white">{title}</h1>
              <p className="text-xs text-slate-500">Room: {roomCode}</p>
            </div>
          </div>
          <Button onClick={onLeave} loading={leaving} variant="ghost" size="sm">
            Leave Game
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
