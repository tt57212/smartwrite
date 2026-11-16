import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import type { Reward } from '../lib/types';
import { Card, Spinner } from '../components/ui';
import { RewardIcon } from '../components/Avatar';

const CONDITION_LABEL: Record<string, (v: number) => string> = {
  rounds: (v) => `${v} Runden`,
  xp: (v) => `${v} XP`,
  streak: (v) => `${v} Tage Serie`,
  level: (v) => `Level ${v}`,
  grade: (v) => `Note ≥ ${v}%`,
};

export function Rewards() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);

  useEffect(() => {
    get<{ rewards: Reward[] }>('/rewards').then((d) => setRewards(d.rewards)).catch(() => setRewards([]));
  }, []);

  if (!rewards) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  const unlocked = rewards.filter((r) => r.unlocked).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Belohnungen</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {unlocked} von {rewards.length} freigeschaltet – Belohnungen sind motivierend, aber nie wichtiger als das Lernen.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((r, i) => (
          <Card
            key={r.id}
            className={`relative overflow-hidden p-5 transition ${r.unlocked ? '' : 'opacity-60 saturate-50'}`}
          >
            {r.unlocked && (
              <div className="absolute right-3 top-3"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">FREIGESCHALTET</span></div>
            )}
            <RewardIcon icon={r.icon} className="text-4xl" />
            <p className="mt-3 font-bold">{r.name}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{r.description}</p>
            <p className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {CONDITION_LABEL[r.condition_type]?.(r.condition_value) || r.condition_type}
            </p>
            {!r.unlocked && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl" style={{ animationDelay: `${i * 30}ms` }}>🔒</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}
