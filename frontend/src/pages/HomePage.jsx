import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/shared/Modal';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import { api } from '../api';
import { useSession } from '../contexts/SessionContext';
import { toastError, toastSuccess } from '../utils/toast';

const GAME_TYPES = [
  {
    id: 'wink-murder',
    name: 'Wink Murder',
    emoji: '🔪',
    desc: 'Killers wink to eliminate players. Detectives must catch them before it\'s too late!',
    color: 'from-red-900/60 to-red-800/20',
    border: 'border-red-500/30 hover:border-red-500/60',
    accent: 'text-red-400',
    players: '3–12 players',
  },
  {
    id: 'imposter',
    name: 'Imposter',
    emoji: '🕵️',
    desc: 'Everyone gets a word — except the imposter who gets a different one. Find the odd one out!',
    color: 'from-pink-900/60 to-pink-800/20',
    border: 'border-pink-500/30 hover:border-pink-500/60',
    accent: 'text-pink-400',
    players: '3–12 players',
  },
];

function CreateRoomModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [form, setForm] = useState({ playerName: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function reset() {
    setForm({ playerName: '', password: '' });
    setErrors({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    const errs = {};
    if (!form.playerName.trim()) errs.playerName = 'Name is required';
    if (!form.password.trim()) errs.password = 'Password is required';
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      const data = await api.createRoom({
        playerName: form.playerName.trim(),
        password: form.password.trim(),
      });
      setSession({
        valid: true,
        roomCode: data.roomCode,
        gameType: data.gameType,
        phase: 'lobby',
        player: data.player,
      });
      toastSuccess('Room created!');
      navigate('/lobby');
    } catch (err) {
      toastError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create a Room">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Choose your game inside the lobby after creating the room.</p>
        <Input
          label="Your Name"
          placeholder="e.g. Dad, Sherlock..."
          value={form.playerName}
          onChange={e => { setForm(f => ({ ...f, playerName: e.target.value })); setErrors(er => ({ ...er, playerName: '' })); }}
          error={errors.playerName}
          maxLength={20}
          autoFocus
        />
        <Input
          label="Room Password"
          type="password"
          placeholder="Share with family..."
          value={form.password}
          onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })); }}
          error={errors.password}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          maxLength={20}
        />
        <Button onClick={handleCreate} loading={loading} fullWidth size="lg">
          Create Room 🚀
        </Button>
      </div>
    </Modal>
  );
}

function JoinRoomModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [form, setForm] = useState({ roomCode: '', playerName: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function reset() {
    setForm({ roomCode: '', playerName: '', password: '' });
    setErrors({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleJoin() {
    const errs = {};
    if (!form.roomCode.trim()) errs.roomCode = 'Room code is required';
    if (!form.playerName.trim()) errs.playerName = 'Name is required';
    if (!form.password.trim()) errs.password = 'Password is required';
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      const data = await api.joinRoom({
        roomCode: form.roomCode.trim().toUpperCase(),
        playerName: form.playerName.trim(),
        password: form.password.trim(),
      });
      setSession({
        valid: true,
        roomCode: data.roomCode,
        gameType: data.gameType,
        phase: 'lobby',
        player: data.player,
      });
      toastSuccess('Joined room!');
      navigate('/lobby');
    } catch (err) {
      toastError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join a Room">
      <div className="space-y-4">
        <Input
          label="Room Code"
          placeholder="e.g. A1B2C3"
          value={form.roomCode}
          onChange={e => { setForm(f => ({ ...f, roomCode: e.target.value.toUpperCase() })); setErrors(er => ({ ...er, roomCode: '' })); }}
          error={errors.roomCode}
          maxLength={6}
          className="uppercase tracking-widest font-mono text-lg"
          autoFocus
        />
        <Input
          label="Your Name"
          placeholder="e.g. Mom, Watson..."
          value={form.playerName}
          onChange={e => { setForm(f => ({ ...f, playerName: e.target.value })); setErrors(er => ({ ...er, playerName: '' })); }}
          error={errors.playerName}
          maxLength={20}
        />
        <Input
          label="Room Password"
          type="password"
          placeholder="Ask the host..."
          value={form.password}
          onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })); }}
          error={errors.password}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <Button onClick={handleJoin} loading={loading} fullWidth size="lg">
          Join Room 🎮
        </Button>
      </div>
    </Modal>
  );
}

export default function HomePage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900 bg-grid relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-pink-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-5xl animate-float">🎮</span>
            <span className="text-5xl animate-float-delay">🎲</span>
            <span className="text-5xl animate-float-delay-2">🃏</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-white mb-4 leading-tight">
            Family{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400">
              Game Hub
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
            Play party games with your family. No accounts needed — just pick a game and jump in!
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20 animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <Button onClick={() => setShowCreate(true)} size="xl" className="text-lg font-bold shadow-lg shadow-violet-900/30">
            🚀 Create Room
          </Button>
          <Button onClick={() => setShowJoin(true)} size="xl" variant="secondary" className="text-lg">
            🎯 Join Room
          </Button>
        </div>

        {/* Game cards */}
        <div className="grid sm:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          {GAME_TYPES.map(g => (
            <div
              key={g.id}
              className={`bg-gradient-to-br ${g.color} border ${g.border} rounded-2xl p-6 card-hover transition-all duration-300`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">{g.emoji}</div>
                <div>
                  <h2 className={`text-xl font-bold ${g.accent}`}>{g.name}</h2>
                  <p className="text-xs text-slate-500">{g.players}</p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-center text-slate-600 text-sm mt-12">
          All games are played in real-time • No registration required • Family friendly 🏠
        </p>
      </div>

      <CreateRoomModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <JoinRoomModal isOpen={showJoin} onClose={() => setShowJoin(false)} />
    </div>
  );
}
