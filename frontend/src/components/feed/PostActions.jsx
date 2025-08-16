import { HeartIcon, BookmarkIcon } from 'lucide-react';

const PostActions = ({ post, isLiked, setIsLiked, isBookmarked, setIsBookmarked }) => {
  const toggleLike = () => {
    setIsLiked(prev => !prev);
    // Handle API request for like toggle here
  };

  const toggleBookmark = () => {
    setIsBookmarked(prev => !prev);
    // Handle API request for bookmark toggle here
  };

  return (
    <div className="flex space-x-4 mt-4">
      <button onClick={toggleLike} className="flex items-center space-x-2">
        <HeartIcon className={`w-6 h-6 ${isLiked ? 'text-red-500' : 'text-gray-500'}`} />
        <span>{isLiked ? 'Liked' : 'Like'}</span>
      </button>
      <button onClick={toggleBookmark} className="flex items-center space-x-2">
        <BookmarkIcon className={`w-6 h-6 ${isBookmarked ? 'text-blue-500' : 'text-gray-500'}`} />
        <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
      </button>
    </div>
  );
};

export default PostActions;