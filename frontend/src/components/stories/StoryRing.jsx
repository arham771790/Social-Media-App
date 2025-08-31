// src/components/stories/StoryRing.jsx
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
      className="flex flex-col items-center space-y-2 group shrink-0"
      aria-label={username}
    >
      <div
        className={[
          'relative w-16 h-16 rounded-full p-0.5 transition-transform duration-200 group-active:scale-95',
          hasStory && !isViewed ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500' : '',
          hasStory && isViewed ? 'bg-gray-600' : '',
          !hasStory ? 'bg-gray-700' : '',
        ].join(' ')}
      >
        <div className="w-full h-full rounded-full bg-black p-0.5">
          {showAddButton ? (
            <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
          ) : (
            <img
              src={user?.avatar || user?.profilePicture || '/default-avatar.png'}
              alt={user?.username || 'user'}
              className="w-full h-full object-cover rounded-full"
              loading="lazy"
            />
          )}
        </div>
        {showAddButton && (
          <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-black">
            <Plus className="w-3 h-3 text-white" />
          </span>
        )}
      </div>
      <span className="text-[11px] sm:text-xs text-center max-w-[72px] truncate">
        {username}
      </span>
    </button>
  );
}
