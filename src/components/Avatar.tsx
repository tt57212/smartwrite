const COLORS: Record<string, string> = {
  indigo: 'from-indigo-500 to-violet-500',
  emerald: 'from-emerald-500 to-teal-500',
  rose: 'from-rose-500 to-pink-500',
  amber: 'from-amber-500 to-orange-500',
  sky: 'from-sky-500 to-cyan-500',
  violet: 'from-violet-500 to-purple-500',
};

const ICONS: Record<string, string> = {
  star: '⭐', rocket: '🚀', bot: '🤖', wand: '🪄', cat: '🐱', dog: '🐶', panda: '🐼', alien: '👽',
};

export function Avatar({ name, avatar, color, size = 'md' }: {
  name: string; avatar?: string; color?: string; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sz = { sm: 'h-8 w-8 text-sm', md: 'h-11 w-11 text-xl', lg: 'h-16 w-16 text-3xl', xl: 'h-24 w-24 text-5xl' }[size];
  const grad = COLORS[color || 'indigo'] || COLORS.indigo;
  const icon = ICONS[avatar || ''] || '🧑‍🎓';
  return (
    <div className={`flex ${sz} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} font-bold text-white shadow-md`}>
      {avatar ? icon : name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function RewardIcon({ icon, className = 'text-2xl' }: { icon: string; className?: string }) {
  const map: Record<string, string> = {
    target: '🎯', flame: '🔥', medal: '🥇', star: '⭐', crown: '👑', zap: '⚡',
    calendar: '📅', trophy: '🏆', badge: '🎖️', gem: '💎', sparkles: '✨',
    rocket: '🚀', bot: '🤖', wand: '🪄', moon: '🌙', sunset: '🌅',
  };
  return <span className={className}>{map[icon] || '🏅'}</span>;
}
