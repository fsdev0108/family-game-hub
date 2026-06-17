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
  const { session, setSession, clearSession } = useSession();
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
  const [imposterMode, setImposterMode] = useState('random');
  const [selectedImposterName, setSelectedImposterName] = useState('');
  const [leaving, setLeaving] = useState(false);

  const roomCode = session?.roomCode;
  const myName = session?.player?.name;
  const isHost = session?.player?.isHost;

  useEffect(() => {
    if (!roomCode) { navigate('/', { replace: true }); return; }

    api.getPlayers(roomCode)
      .then(data => setPlayerNames(data.players.map(p => p.name)))
      .catch(() => {});

    const socket = io(`${SOCKET_URL}/imposter`, {
      withCredentials: true,
      transports: ['websocket'],
      auth: { playerId: session?.player?.id, roomCode },
    });
    socketRef.current = socket;

    socket.on('imp:roles_dealt', ({ role, isWordSetter }) => {
      setMyRole(role);
      setAmWordSetter(isWordSetter);
      setPhase(isWordSetter ? 'word-setup' : 'waiting-words');
    });

    socket.on('imp:words_set', ({ word, role }) => {
      setMyWord(word);
      if (role) setMyRole(role);
      setPhase('word-reveal');
    });

    socket.on('imp:words_distributed', () => {
      // Fallback: transition anyone still waiting if imp:words_set was missed
      setPhase(prev => prev === 'waiting-words' ? 'word-reveal' : prev);
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

    socket.on('imp:game_restarted', () => {
      setSession(prev => ({ ...prev, phase: 'lobby' }));
      navigate('/lobby', { replace: true });
    });

    socket.on('error', ({ code, message }) => {
      toastError(message);
      if (code === 'HOST_DISCONNECTED') {
        setTimeout(() => { clearSession(); navigate('/', { replace: true }); }, 2500);
      }
    });

    return () => socket.disconnect();
  }, [roomCode]);

  useEffect(() => {
    if (phase !== 'voting' || timeLeft === null || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  function handleSubmitWords() {
    if (!normalWord.trim() || !imposterWord.trim()) return setWordError('Both words are required');
    if (normalWord.trim().toLowerCase() === imposterWord.trim().toLowerCase()) return setWordError('Words must be different');
    if (imposterMode === 'manual' && !selectedImposterName) return setWordError('Pick an imposter or switch to random');
    setWordError('');
    setHostWord({ normal: normalWord.trim(), imposter: imposterWord.trim() });
    socketRef.current?.emit('imp:submit_words', {
      normalWord: normalWord.trim(),
      imposterWord: imposterWord.trim(),
      imposterName: imposterMode === 'manual' ? selectedImposterName : null,
    });
    // Phase transitions to 'word-reveal' when server sends imp:words_set back
  }

  function handleVote(name) {
    if (hasVoted) return;
    setHasVoted(true);
    socketRef.current?.emit('imp:vote', { votedFor: name });
    toastInfo(`Voted for ${name}`);
  }

  function handleLeave() {
    if (isHost) {
      setLeaving(true);
      socketRef.current?.emit('imp:end_game');
    } else {
      navigate('/lobby', { replace: true });
    }
  }

  function handleRestart() {
    socketRef.current?.emit('imp:restart_game');
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
    const otherPlayers = playerNames.filter(n => n !== myName);
    return (
      <FullCenter>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-float">📝</div>
            <h1 className="text-2xl font-black text-white">You're the Word Setter!</h1>
            <p className="text-slate-400 mt-2 text-sm">
              Set the words and secretly choose the imposter.
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
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-400">Imposter Selection 🕵️</label>
              <div className="grid grid-cols-2 gap-2">
                {['random', 'manual'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setImposterMode(mode); setSelectedImposterName(''); setWordError(''); }}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${
                      imposterMode === mode
                        ? 'bg-violet-600/30 border-violet-500/60 text-violet-300'
                        : 'bg-dark-600/40 border-border text-slate-400 hover:border-violet-500/30'
                    }`}
                  >
                    {mode === 'random' ? '🎲 Random' : '👆 Manual'}
                  </button>
                ))}
              </div>
              {imposterMode === 'manual' && (
                <select
                  value={selectedImposterName}
                  onChange={e => { setSelectedImposterName(e.target.value); setWordError(''); }}
                  className="w-full bg-dark-600/60 border border-border rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                >
                  <option value="">Choose who is the imposter...</option>
                  {otherPlayers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>

            {wordError && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{wordError}</p>
            )}
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

  if (phase === 'word-reveal') {
    return (
      <FullCenter>
        <div className="w-full max-w-md space-y-5 animate-fade-in-up">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-float">
              {myRole === 'imposter' ? '🕵️' : amWordSetter ? '📝' : '💬'}
            </div>
            <h1 className="text-2xl font-black text-white">
              {myRole === 'imposter' ? "You're the Imposter!" : amWordSetter ? "You're the Word Setter!" : "You're a Crewmate!"}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {myRole === 'imposter'
                ? 'Blend in — your word is slightly different!'
                : 'Find the imposter — someone has a different word!'}
            </p>
          </div>

          <div className={`rounded-2xl p-8 text-center border ${
            myRole === 'imposter'
              ? 'bg-gradient-to-br from-pink-900/40 to-pink-800/20 border-pink-500/30'
              : 'bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-500/30'
          }`}>
            <p className="text-sm text-slate-400 mb-2">Your Word</p>
            <p className="text-4xl font-black text-white">{myWord ?? '—'}</p>
          </div>

          {amWordSetter && hostWord.normal && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1 text-center">Words you set</p>
              <p className="text-center text-slate-200 text-sm">
                Normal: <span className="font-bold text-white">{hostWord.normal}</span>
                {' · '}
                Imposter: <span className="font-bold text-white">{hostWord.imposter}</span>
              </p>
            </div>
          )}

          <Button onClick={() => setPhase('playing')} fullWidth size="lg">
            Got it! Let's Play 🎮
          </Button>
        </div>
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
    const voteResults = gameOver.voteDetails
      ? Object.entries(gameOver.voteDetails).map(([voter, votedFor]) => ({ voter, votedFor }))
      : [];
    return (
      <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <GameOverScreen
            winner={gameOver.winner}
            subtitle={
              gameOver.winner === 'players'
                ? `${gameOver.imposterName} was caught!`
                : gameOver.winner === 'imposter'
                  ? (gameOver.isTie
                      ? 'No consensus — the imposter escapes!'
                      : `${gameOver.eliminatedName ?? 'An innocent'} was eliminated — the imposter fooled everyone!`)
                  : 'Game ended by host.'
            }
            stats={stats}
            voteResults={voteResults}
            onRestart={isHost ? handleRestart : null}
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
