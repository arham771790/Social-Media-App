// src/app/me/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Camera, Edit3, Grid, Heart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useUserStore } from '@/store/userStore';
import { usePostStore } from '@/store/postStore';
import { useSocialStore } from '@/store/socialStore'; // 👈 followers/following
import { useUploadStore } from '@/store/uploadStore'; // 👈 avatar upload
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

export default function ProfilePage() {
  const { toast } = useToast();

  // USER
  const { me, fetchMe, updateMe, isLoading: meLoading } = useUserStore();

  // POSTS (byAuthor + fetchByAuthor are supported in your postStore)
  const { byAuthor, fetchByAuthor } = usePostStore();

  // SOCIAL (expect these methods; rename if your store differs)
  const {
    followersByUser,     // map: { [userId]: { items, total, isLoading, page, hasMore } }
    followingByUser,     // map: same shape
    fetchFollowers,      // (userId, { page, limit })
    fetchFollowing,      // (userId, { page, limit })
    removeFollower,      // (followerId) — optional: if you support removing a follower
    unfollowUser,        // (userId)     — optional: if you support unfollowing
  } = useSocialStore();

  // UPLOAD
  const { uploadFile, isUploading } = useUploadStore();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  // Derived keys
  const meId = me?.id ? String(me.id) : '';
  const postsPack = meId ? byAuthor[meId] : null;
  const posts = postsPack?.items || [];

  // Edit form state (ONLY fields your backend accepts)
  const [editForm, setEditForm] = useState({
    bio: '',
    isPublic: true,
  });

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Followers / Following packs
  const followersPack = meId ? followersByUser?.[meId] : null;
  const followingPack = meId ? followingByUser?.[meId] : null;
  const followers = followersPack?.items || [];
  const following = followingPack?.items || [];

  // Load me
  useEffect(() => {
    fetchMe().catch(() => {});
  }, [fetchMe]);

  // Load my posts once I have me.id
  useEffect(() => {
    if (meId) {
      fetchByAuthor(meId, { page: 1, limit: 24 }).catch(() => {});
      // Preload followers/following first page
      fetchFollowers?.(meId, { page: 1, limit: 24 });
      fetchFollowing?.(meId, { page: 1, limit: 24 });
    }
  }, [meId, fetchByAuthor, fetchFollowers, fetchFollowing]);

  // Init edit form from me
  useEffect(() => {
    if (!me) return;
    setEditForm({
      bio: me.bio || '',
      isPublic: me.isPublic ?? true,
    });
  }, [me]);

  // Avatar picker (preview only; actual upload happens on Save)
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  // Save profile:
  // 1) If avatarFile chosen: upload via uploadStore.uploadFile(file) -> returns { originalUrl/optimizedUrl/url/... }
  // 2) call updateMe({ avatar, bio, isPublic })
  const handleSaveProfile = async () => {
    try {
      let avatarUrl;
      if (avatarFile) {
        const uploaded = await uploadFile(avatarFile); // 👈 using your uploadStore
        avatarUrl = uploaded?.optimizedUrl || uploaded?.originalUrl || uploaded?.url || uploaded?.secure_url;
      }

      const payload = {
        bio: editForm.bio,
        isPublic: !!editForm.isPublic,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      };

      await updateMe(payload);

      setEditDialogOpen(false);
      setAvatarFile(null);
      setAvatarPreview('');
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update profile';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  // Minimal Post Grid
  const PostGrid = ({ items, emptyMessage, isLoading }) => (
    <div className="grid grid-cols-3 gap-1 md:gap-2">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-800 rounded-lg animate-pulse" />
          ))
        : items.length > 0
        ? items.map((post) => (
            <a
              key={post.id}
              href={`/post/${post.id}`}
              className="aspect-square relative group cursor-pointer bg-gray-800 rounded-lg overflow-hidden"
            >
              {post.type === 'VIDEO' ||
              /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(post.mediaUrl || '') ? (
                <video
                  src={post.mediaUrl}
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={post.thumbnailUrl || post.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://via.placeholder.com/400x400/374151/9CA3AF?text=No+Image';
                  }}
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex items-center space-x-4 text-white">
                  <span className="flex items-center">
                    <Heart className="w-5 h-5 mr-1 fill-current" />
                    {post.likesCount || 0}
                  </span>
                  <span className="flex items-center">
                    {/* simple comment icon */}
                    <svg className="w-5 h-5 mr-1 fill-current" viewBox="0 0 24 24">
                      <path d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
                    </svg>
                    {post.commentsCount || post._count?.comments || 0}
                  </span>
                </div>
              </div>
            </a>
          ))
        : (
          <div className="col-span-3 text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <Grid className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400">{emptyMessage}</p>
          </div>
        )}
    </div>
  );

  if (meLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center gap-8 mb-8">
            <div className="w-32 h-32 bg-gray-800 rounded-full" />
            <div className="space-y-3">
              <div className="h-8 bg-gray-800 rounded w-48" />
              <div className="h-4 bg-gray-800 rounded w-64" />
              <div className="h-4 bg-gray-800 rounded w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!me) return null;

  const followersCount = followersPack?.total ?? followers.length;
  const followingCount = followingPack?.total ?? following.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-8 mb-8">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-gray-700">
              <AvatarImage src={avatarPreview || me.avatar || undefined} />
              <AvatarFallback className="bg-gray-800 text-white text-4xl">
                {me.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              className="absolute bottom-2 right-2 rounded-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setEditDialogOpen(true)}
              title="Edit profile"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-light">@{me.username}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="border-gray-600 hover:bg-gray-800"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit profile
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <span><strong>{posts.length}</strong> posts</span>
            <button
              className="hover:underline"
              onClick={() => setActiveTab('followers')}
              title="View followers"
            >
              <strong>{followersCount}</strong> followers
            </button>
            <button
              className="hover:underline"
              onClick={() => setActiveTab('following')}
              title="View following"
            >
              <strong>{followingCount}</strong> following
            </button>
          </div>

          {/* Bio + badge */}
          <div className="space-y-1">
            {me.bio && <p className="text-sm leading-relaxed">{me.bio}</p>}
            <div className="flex items-center gap-2 pt-1">
              <Badge variant={me.isPublic ? 'default' : 'secondary'} className="text-xs">
                {me.isPublic ? 'Public' : 'Private'} Account
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-900 border-b border-gray-700">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Followers</span>
          </TabsTrigger>
          <TabsTrigger value="following" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Following</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-2">
            <span className="hidden sm:inline">About</span>
          </TabsTrigger>
        </TabsList>

        {/* POSTS */}
        <TabsContent value="posts" className="mt-6">
          <PostGrid
            items={posts}
            emptyMessage="No posts yet"
            isLoading={postsPack?.isLoading || false}
          />
          {postsPack?.hasMore && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={() =>
                  fetchByAuthor(meId, { page: (postsPack.page || 0) + 1, limit: 24 })
                }
                disabled={postsPack.isLoading}
              >
                {postsPack.isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* FOLLOWERS */}
        <TabsContent value="followers" className="mt-6">
          <PeopleList
            items={followers}
            emptyMessage="No followers yet"
            isLoading={followersPack?.isLoading}
            onLoadMore={() =>
              fetchFollowers?.(meId, { page: (followersPack?.page || 0) + 1, limit: 24 })
            }
            hasMore={!!followersPack?.hasMore}
            actionLabel="Remove"
            onAction={(u) => removeFollower?.(u.id)} // optional if supported
          />
        </TabsContent>

        {/* FOLLOWING */}
        <TabsContent value="following" className="mt-6">
          <PeopleList
            items={following}
            emptyMessage="Not following anyone yet"
            isLoading={followingPack?.isLoading}
            onLoadMore={() =>
              fetchFollowing?.(meId, { page: (followingPack?.page || 0) + 1, limit: 24 })
            }
            hasMore={!!followingPack?.hasMore}
            actionLabel="Unfollow"
            onAction={(u) => unfollowUser?.(u.id)} // optional if supported
          />
        </TabsContent>

        {/* ABOUT */}
        <TabsContent value="about" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Email:</span>
                  <p>{me.email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Username:</span>
                  <p>@{me.username}</p>
                </div>
                <div>
                  <span className="text-gray-400">Account Type:</span>
                  <p>{me.isPublic ? 'Public' : 'Private'}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Avatar Upload (preview) */}
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarPreview || me.avatar || undefined} />
                <AvatarFallback className="bg-gray-800 text-white">
                  {me.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>{isUploading ? 'Uploading…' : 'Change photo'}</span>
                  </Button>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                className="bg-gray-800 border-gray-600"
                rows={3}
              />
            </div>

            {/* Public Account Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="public-account">Public Account</Label>
              <Switch
                id="public-account"
                checked={editForm.isPublic}
                onCheckedChange={(checked) => setEditForm((p) => ({ ...p, isPublic: checked }))}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditDialogOpen(false);
                  setAvatarPreview('');
                  setAvatarFile(null);
                  // reset form to current server values in case user cancels
                  setEditForm({
                    bio: me.bio || '',
                    isPublic: me.isPublic ?? true,
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={meLoading || isUploading}>
                {meLoading || isUploading ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Generic people list used by Followers/Following */
function PeopleList({ items, emptyMessage, isLoading, onLoadMore, hasMore, actionLabel, onAction }) {
  return (
    <div className="space-y-4">
      {isLoading && items.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {items.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar || undefined} />
                  <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link href={`/u/${u.username || u.id}`} className="font-medium hover:underline truncate">
                    @{u.username || u.id}
                  </Link>
                  {u.bio && <div className="text-xs text-muted-foreground truncate">{u.bio}</div>}
                </div>
              </div>
              {onAction && (
                <Button size="sm" variant="secondary" onClick={() => onAction(u)}>
                  {actionLabel}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
