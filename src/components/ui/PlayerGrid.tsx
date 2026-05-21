import { cn } from '@/lib/cn';
import type { RoomPlayer } from '@/types';

export function PlayerGrid({
  players,
  selectedId,
  onSelect,
  selectable,
}: {
  players: RoomPlayer[];
  selectedId?: number;
  onSelect?: (id: number) => void;
  selectable?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {players.map(p => (
        <button
          key={p.userId}
          type="button"
          disabled={!selectable || !p.isAlive}
          onClick={() => onSelect?.(p.userId)}
          className={cn(
            'flex flex-col items-center gap-2 p-2 rounded-xl transition',
            selectable && p.isAlive && 'active:scale-95',
          )}
        >
          <div
            className={cn(
              'player-avatar',
              p.isAlive ? 'alive' : 'out',
              selectedId === p.userId && 'selected',
            )}
          >
            {p.displayName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs truncate max-w-full" style={{ color: 'var(--app-hint)' }}>
            {p.displayName}
          </span>
        </button>
      ))}
    </div>
  );
}
