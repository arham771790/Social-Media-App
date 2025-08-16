import { useEffect, useState } from 'react';
import { fetchPosts } from '@/lib/axios';
import PostCard from './PostCard';
import { useFeedStore } from '@/store/feedStore';
import { Skeleton } from 'shadcn/ui';
import InfiniteScroll from 'react-infinite-scroll-component';

const Feed = () => {
  const { posts, setPosts, hasMore, setHasMore } = useFeedStore(state => ({
    posts: state.posts,
    setPosts: state.setPosts,
    hasMore: state.hasMore,
    setHasMore: state.setHasMore
  }));
  
  useEffect(() => {
    // Fetch initial posts
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const newPosts = await fetchPosts();
    setPosts(newPosts);
    if (newPosts.length < 10) setHasMore(false); // Stop fetching when posts run out
  };

  return (
    <InfiniteScroll
      dataLength={posts.length}
      next={loadPosts}
      hasMore={hasMore}
      loader={<Skeleton />}
      endMessage={<p>No more posts</p>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </InfiniteScroll>
  );
};

export default Feed;