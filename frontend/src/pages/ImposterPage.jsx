import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useSession } from '../contexts/SessionContext';
import { api } from '../api';
import { toastError, toastInfo } from '../utils/toast';
import GameOverScreen from '../components/games/GameOverScreen';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import Spinner from '../components/shared/Spinner';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3002`;

export default function ImposterPage() {
  const navigate = useNavigate();
  const { session, clearSession } = useSession();
  const socketRef = useRef(null);

  const [phase, setPhase] = useState('role-reveal');
  const [myRole, setMyRole] = useState(null);
  const [amWordSetter, setAmWordSetter] = useState(false);
  const [myWord, setMyWord] = useState(null);
  const [hostWord, setHostWord] = useState({ normal: '', imposter: '' });
  const [playerNames, setPlayerNames] = useState([]);
  const [votingPlayers, setVotingPlayers] = useState([]);
  const [votedNames, setVotedNames] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(60);
  const [gameOver, setGameOver] = useState(null);
  const [normalWord, setNormalWord] = useState('');
  const [imposterWord, setImposterWord] = useState('');
  const [wordError, setWordError] = useState('');
  const [leaving, setLeaving] = useState(false);

  const roomCode = session?.roomCode;
  const myName = session?.player?.name;
  const myId = session?.player?.id;
  const isHost = session?.player?.isHost;

  useEffect(() => {
    if (!roomCode) { navigate('/', { replace: true }); return; }

    Promise.all([
      api.getPlayers(roomCode),
      api.getRoom(roomCode),
    ]).then(([playersData, roomData]) => {
      setPlayerNames(playersData.players.map(p => p.name));
      if (roomData.config?.wordSetterId === myId) setAmWordSetter(true);
    }).catch(() => {});

    const socket = io(`${SOCKET_URL}/imposter`, {
      withCredentials: true,
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('imp:roles_dealt', ({ role }) => setMyRole(role));

    socket.on('imp:words_set', ({ word }) => {
      setMyWord(word);
      setPhase('playing');
    });

    socket.on('imp:words_distributed', () => {
      setPhase(prev => prev === 'waiting-words' ? 'playing' : prev);
    });

    socket.on('imp:voting_open', ({ players, durationSeconds }) => {
      setVotingPlayers(players);
      setTotalTime(durationSeconds);
      setTimeLeft(durationSeconds);
      setPhase('voting');
    });

    socket.on('imp:vote_update', ({ votedNames }) => setVotedNames(votedNames));

    socket.on('imp:game_over', (data) => {
      setPhase('ended');
      setGameOver(data);
    });

    socket.on('error', ({ code, message }) => {
      toastError(message);
      if (code === 'HOST_DISCONNECTED') {
        setTimeout(() => { clearSession(); navigate('/', { replace: true }); }, 2500);
      }
    });

    return () => socket.disconnect();
  }, [roomCode, myId]);

  useEffect(() => {
    if (myRole === null) return;
    if (amWordSetter) setPhase('word-setup');
    else setPhase('waiting-words');
  }, [myRole, amWordSetter]);

  useEffect(() => {
    if (phase !== 'voting' || timeLeft === null || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  function handleSubmitWords() {
    if (!normalWord.trim() || !imposterWord.trim()) return setWordError('Both words are required');
    if (normalWord.trim().toLowerCase() === imposterWord.trim().toLowerCase()) return setWordError('Words must be different');
    setWordError('');
    setHostWord({ normal: normalWord.trim(), imposter: imposterWord.trim() });
    socketRef.current?.emit('imp:submit_words', { normalWord: normalWord.trim(), imposterWord: imposterWord.trim() });
    setPhase('playing');
  }

  function handleVote(name) {
    if (hasVoted) return;
    setHasVoted(true);
    socketRef.current?.emit('imp:vote', { votedFor: name });
    toastInfo(`Voted for ${name}`);
  }

  async function handleLeave() {
    setLeaving(true);
    if (isHost) socketRef.current?.emit('imp:end_game');
    await clearSession();
    navigate('/', { replace: true });
  }

  if (!session?.valid) return null;

  if (phase === 'role-reveal') {
    return (
      <FullCenter>
        <div className="text-6xl mb-3 animate-float">🕵️</div>
        <h1 className="text-3xl font-black text-white mb-2">Imposter</h1>
        <p className="text-slate-400 text-sm mb-6">Assigning roles...</p>
        <Spinner size="lg" />
      </FullCenter>
    );
  }

  if (phase === 'word-setup') {
    return (
      <FullCenter>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-float">📝</div>
            <h1 className="text-2xl font-black text-white">You're the Word Setter!</h1>
            <p className="text-slate-400 mt-2 text-sm">
              Give everyone one word, and give the imposter a close but different one.
            </p>
          </div>
          <div className="bg-dark-700 border border-border rounded-2xl p-6 space-y-4">
            <Input
              label="Normal Word (for everyone else)"
              placeholder="e.g. Ocean"
              value={normalWord}
              onChange={e => { setNormalWord(e.target.value); setWordError(''); }}
              autoFocus
            />
            <Input
              label="Imposter Word (close but different)"
              placeholder="e.g. River"
              value={imposterWord}
              onChange={e => { setImposterWord(e.target.value); setWordError(''); }}
              error={wordError}
              onKeyDown={e => e.key === 'Enter' && handleSubmitWords()}
            />
            <Button onClick={handleSubmitWords} fullWidth size="lg">Distribute Words 📤</Button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            💡 Good pairs: Beach/Pool, Doctor/Nurse, Pizza/Pasta
          </p>
        </div>
      </FullCenter>
    );
  }

  if (phase === 'waiting-words') {
    return (
      <FullCenter>
        <div className="text-5xl mb-4 animate-float">⏳</div>
        <h2 className="text-xl font-bold text-white mb-2">Waiting for words...</h2>
        <p className="text-slate-400 text-sm">The word setter is choosing words</p>
        <Spinner size="lg" className="mt-6" />
      </FullCenter>
    );
  }

  if (phase === 'ended' && gameOver) {
    const stats = [
      { label: 'Imposter', value: gameOver.imposterName ?? '—' },
      { label: 'Normal Word', value: gameOver.normalWord ?? '—' },
      { label: 'Imposter Word', value: gameOver.imposterWord ?? '—' },
      ...(gameOver.eliminatedName ? [{ label: 'Eliminated', value: gameOver.eliminatedName }] : []),
    ];
    return (
      <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <GameOverScreen
            winner={gameOver.winner}
            subtitle={
              gameOver.winner === 'players' ? `${gameOver.imposterName} was caught!` :
              gameOver.winner === 'imposter' ? `${gameOver.imposterName} fooled everyone!` :
              'Game ended by host.'
            }
            stats={stats}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 bg-grid relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-pink-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🕵️</span>
            <div>
              <h1 className="text-xl font-black text-white">Imposter</h1>
              <p className="text-xs text-slate-500">Room: {roomCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <Button variant="danger" size="sm" onClick={() => socketRef.current?.emit('imp:end_game')}>
                End Game
              </Button>
            )}
            <Button onClick={handleLeave} loading={leaving} variant="ghost" size="sm">
              Leave
            </Button>
          </div>
        </div>

        {/* Role badge */}
        <div className={`mb-4 inline-flex px-3 py-1.5 rounded-full text-sm font-semibold border ${
          myRole === 'imposter' ? 'bg-pink-900/30 text-pink-400 border-pink-500/40' :
          amWordSetter ? 'bg-amber-900/30 text-amber-400 border-amber-500/40' :
          'bg-emerald-900/30 text-emerald-400 border-emerald-500/40'
        }`}>
          {myRole === 'imposter' ? '🕵️ Imposter' : amWordSetter ? '📝 Word Setter' : '💬 Crewmate'}
        </div>

        {/* Word display */}
        {myWord && (
          <div className={`mb-6 rounded-2xl p-6 text-center border animate-fade-in-up ${
            myRole === 'imposter'
              ? 'bg-gradient-to-br from-pink-900/40 to-pink-800/20 border-pink-500/30'
              : 'bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-500/30'
          }`}>
            <p className="text-sm text-slate-400 mb-1">Your Word</p>
            <p className="text-4xl font-black text-white">{myWord}</p>
            {myRole === 'imposter' && (
              <p className="text-xs text-pink-400 mt-2">⚠️ Your word is different — blend in!</p>
            )}
          </div>
        )}
        {amWordSetter && phase === 'playing' && (
          <div className="mb-6 bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-500/30 rounded-2xl p-5 text-center animate-fade-in-up">
            <p className="text-xs text-slate-400 mb-2">Words you set</p>
            <p className="text-slate-200">
              Normal: <span className="font-bold text-white">{hostWord.normal}</span>
              {' · '}
              Imposter: <span className="font-bold text-white">{hostWord.imposter}</span>
            </p>
          </div>
        )}

        {phase === 'voting' ? (
          <VotingPanel
            players={votingPlayers}
            myName={myName}
            votedNames={votedNames}
            hasVoted={hasVoted}
            timeLeft={timeLeft}
            totalTime={totalTime}
            onVote={handleVote}
          />
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-dark-700 border border-border rounded-2xl p-6 animate-fade-in-up">
              <h2 className="font-bold text-slate-200 mb-4">Players ({playerNames.length})</h2>
              <div className="space-y-2">
                {playerNames.map(name => (
                  <div key={name} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${name === myName ? 'bg-violet-900/20 border-violet-500/30' : 'bg-dark-600/40 border-border'}`}>
                    <span>👤</span>
                    <span className="text-slate-200 font-medium">
                      {name} {name === myName && <span className="text-xs text-slate-500">(you)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-dark-700 border border-border rounded-2xl p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <h2 className="font-bold text-slate-200">Discussion Phase 💬</h2>
              <div className="space-y-3">
                {[
                  { icon: '💬', text: 'Describe your word without saying it directly' },
                  { icon: '👂', text: 'Listen for anyone who seems off' },
                  { icon: '🤔', text: 'The imposter has a similar but different word' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-dark-600/40 border border-border/50 rounded-xl">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
              {isHost && (
                <Button onClick={() => socketRef.current?.emit('imp:open_voting')} fullWidth variant="cyan">
                  🗳️ Open Voting
                </Button>
              )}
              {!isHost && (
                <p className="text-xs text-slate-500 text-center">Host opens voting when ready</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FullCenter({ children }) {
  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex flex-col items-center justify-center px-4 py-8 animate-fade-in-up">
      {children}
    </div>
  );
}

function VotingPanel({ players, myName, votedNames, hasVoted, timeLeft, totalTime, onVote }) {
  const pct = totalTime > 0 ? ((timeLeft ?? 0) / totalTime) * 100 : 0;
  const timerColor = pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-dark-700 border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-slate-200">🗳️ Voting Open!</span>
          <span className={`font-mono text-2xl font-black ${(timeLeft ?? 0) <= 10 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
            {timeLeft ?? 0}s
          </span>
        </div>
        <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
          <div className={`h-full ${timerColor} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Voted: {votedNames.length} / {players.length}</p>
      </div>

      <div className="bg-dark-700 border border-border rounded-2xl p-6">
        <h2 className="font-bold text-slate-200 mb-4">
          {hasVoted ? '✅ Vote cast — waiting for others...' : 'Who is the imposter?'}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {players.map(name => {
            const isMe = name === myName;
            return (
              <button
                key={name}
                onClick={() => !isMe && !hasVoted && onVote(name)}
                disabled={isMe || hasVoted}
                className={`relative p-4 rounded-xl border text-left font-medium active:scale-95 transition-all ${
                  isMe || hasVoted
                    ? 'bg-dark-600/20 border-border/30 text-slate-600 cursor-not-allowed opacity-60'
                    : 'bg-dark-600/50 border-border hover:border-pink-500/60 hover:bg-pink-900/20 text-slate-200'
                }`}
              >
                <span className="block text-lg mb-1">👤</span>
                <span className="text-sm">{name}</span>
                {isMe && <span className="text-xs text-slate-600 block">(you)</span>}
                {votedNames.includes(name) && (
                  <span className="absolute top-2 right-2 text-xs bg-pink-600/30 text-pink-400 px-1.5 py-0.5 rounded-full border border-pink-500/30">
                    voted
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
