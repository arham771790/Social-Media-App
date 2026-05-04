'use client';

import { Plus } from 'lucide-react';

export default function StoryRing({
  user,
  hasStory,
  isViewed,
  onClick,
  showAddButton = false,
}) {
  const username = showAddButton ? 'Your story' : (user?.username || 'user');

  return (
    <button
      type="button"
      onClick={onClick}
      className="story-ring group flex shrink-0 flex-col items-center gap-2 text-center"
      aria-label={username}
    >
      <div
        className={[
          'relative size-[4.5rem] rounded-full p-[2px] transition-transform duration-200 group-active:scale-[0.98]',
          hasStory && !isViewed
            ? 'bg-[linear-gradient(135deg,rgba(214,173,118,1),rgba(104,134,118,0.96))] shadow-[0_18px_34px_-18px_rgba(214,173,118,0.65)]'
            : '',
          hasStory && isViewed ? 'bg-border/80' : '',
          !hasStory ? 'bg-white/10' : '',
        ].join(' ')}
      >
        <div className="flex size-full items-center justify-center rounded-full bg-[rgba(12,15,20,0.94)] p-[3px]">
          {showAddButton ? (
            <div className="flex size-full items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] text-primary">
              <Plus className="h-6 w-6" />
            </div>
          ) : (
            <img
              src={user?.avatar || user?.profilePicture || '/default-avatar.png'}
              alt={user?.username || 'user'}
              className="size-full rounded-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        {showAddButton && (
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-[rgba(12,15,20,0.94)] bg-primary text-primary-foreground shadow-[0_14px_22px_-14px_rgba(214,173,118,0.9)]">
            <Plus className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <span className="max-w-[4.8rem] truncate text-[11px] font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground sm:text-xs">
        {username}
      </span>
    </button>
  );
}
