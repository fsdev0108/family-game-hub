import { useState } from 'react';
import Button from '../shared/Button';

const roleConfig = {
  killer: {
    emoji: '🔪',
    label: 'Killer',
    color: 'from-red-900/80 to-red-800/40',
    border: 'border-red-500/50',
    glow: 'glow-pink',
    text: 'text-red-400',
    desc: 'Wink at civilians to eliminate them. Stay hidden from the detective!',
  },
  detective: {
    emoji: '🔍',
    label: 'Detective',
    color: 'from-cyan-900/80 to-cyan-800/40',
    border: 'border-cyan-500/50',
    glow: 'glow-cyan',
    text: 'text-cyan-400',
    desc: 'Watch for winks and use your accusation wisely to catch the killer.',
  },
  civilian: {
    emoji: '👥',
    label: 'Civilian',
    color: 'from-violet-900/80 to-violet-800/40',
    border: 'border-violet-500/50',
    glow: 'glow-purple',
    text: 'text-violet-400',
    desc: 'Stay alert! Accept winks discreetly and help the detective find the killer.',
  },
  imposter: {
    emoji: '🕵️',
    label: 'Imposter',
    color: 'from-pink-900/80 to-pink-800/40',
    border: 'border-pink-500/50',
    glow: 'glow-pink',
    text: 'text-pink-400',
    desc: 'You have a different word. Blend in with the group to avoid being voted out!',
  },
  normal: {
    emoji: '💬',
    label: 'Crewmate',
    color: 'from-emerald-900/80 to-emerald-800/40',
    border: 'border-emerald-500/50',
    glow: 'glow-emerald',
    text: 'text-emerald-400',
    desc: 'Listen carefully. Vote out the imposter who seems to have a different word.',
  },
  'word-setter': {
    emoji: '📝',
    label: 'Word Setter',
    color: 'from-amber-900/80 to-amber-800/40',
    border: 'border-amber-500/50',
    glow: 'glow-purple',
    text: 'text-amber-400',
    desc: 'You set both words. Give the imposter a close but different clue word.',
  },
};

export default function RoleRevealCard({ role, word, onReady, isReady, hideReady = false }) {
  const [revealed, setRevealed] = useState(false);
  const cfg = roleConfig[role] || roleConfig.civilian;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div
        className={`relative w-full max-w-sm cursor-pointer transition-transform duration-300 hover:scale-[1.02]`}
        onClick={() => !revealed && setRevealed(true)}
      >
        {!revealed ? (
          <div className="bg-dark-600 border border-border rounded-2xl p-10 flex flex-col items-center gap-4 select-none">
            <div className="w-20 h-20 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-4xl animate-pulse">
              🃏
            </div>
            <p className="text-slate-400 font-medium">Tap to reveal your role</p>
            <p className="text-xs text-slate-600">Make sure no one else is watching!</p>
          </div>
        ) : (
          <div className={`bg-gradient-to-br ${cfg.color} border ${cfg.border} ${cfg.glow} rounded-2xl p-8 flex flex-col items-center gap-4 animate-flip-in`}>
            <div className="text-6xl">{cfg.emoji}</div>
            <div className={`text-2xl font-black ${cfg.text} text-glow-purple`}>{cfg.label}</div>
            {word && (
              <div className="mt-1 px-5 py-2 bg-black/30 border border-white/10 rounded-xl">
                <p className="text-xs text-slate-400 mb-1 text-center">Your Word</p>
                <p className="text-xl font-bold text-white text-center">{word}</p>
              </div>
            )}
            <p className="text-center text-sm text-slate-400 leading-relaxed">{cfg.desc}</p>
          </div>
        )}
      </div>

      {revealed && !isReady && !hideReady && (
        <Button onClick={onReady} size="lg" className="animate-fade-in-up">
          I'm Ready! ✅
        </Button>
      )}
      {isReady && (
        <div className="flex items-center gap-2 text-emerald-400 font-semibold animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Waiting for others...
        </div>
      )}
    </div>
  );
}
