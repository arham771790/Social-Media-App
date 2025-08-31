// src/app/me/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Camera, Edit3, Grid, Heart, Users, Calendar, MapPin, Link as LinkIcon, MoreHorizontal, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useUserStore } from '@/store/userStore';
import { usePostStore } from '@/store/postStore';
import { useSocialStore } from '@/store/socialStore';
import { useUploadStore } from '@/store/uploadStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import api from '@/lib/axios';

export default function ProfilePage() {
  const { toast } = useToast();

  // USER
  const { me, fetchMe, updateMe, isLoading: meLoading } = useUserStore();

  // POSTS (byAuthor + fetchByAuthor are supported in your postStore)
  const { byAuthor, fetchByAuthor } = usePostStore();

  // SOCIAL - Fixed method names to match store
  const {
    followersByUser,
    followingByUser,
    getFollowers,      // Fixed: using getFollowers instead of fetchFollowers
    getFollowing,      // Fixed: using getFollowing instead of fetchFollowing
    unfollowUser,
  } = useSocialStore();

  // UPLOAD
  const { uploadFile, isUploading } = useUploadStore();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  // Derived keys
  const meId = me?.id ? String(me.id) : '';
  const postsPack = meId ? byAuthor[meId] : null;
  const posts = postsPack?.items || [];

  // Edit form state
  const [editForm, setEditForm] = useState({
    bio: '',
    isPublic: true,
    location: '',
    website: '',
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
      // Fixed: using correct method names
      getFollowers?.(meId, { page: 1, limit: 24 });
      getFollowing?.(meId, { page: 1, limit: 24 });
    }
  }, [meId, fetchByAuthor, getFollowers, getFollowing]);

  // Init edit form from me
  useEffect(() => {
    if (!me) return;
    setEditForm({
      bio: me.bio || '',
      isPublic: me.isPublic ?? true,
      location: me.location || '',
      website: me.website || '',
    });
  }, [me]);

  // Avatar picker
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: 'File too large', 
        description: 'Please choose an image smaller than 5MB',
        variant: 'destructive' 
      });
      return;
    }
    
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  // Save profile
  const handleSaveProfile = async () => {
    try {
      let avatarUrl;
      if (avatarFile) {
        const uploaded = await uploadFile(avatarFile);
        avatarUrl = uploaded?.optimizedUrl || uploaded?.originalUrl || uploaded?.url || uploaded?.secure_url;
      }

      const payload = {
        bio: editForm.bio,
        isPublic: !!editForm.isPublic,
        location: editForm.location,
        website: editForm.website,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      };

      await updateMe(payload);

      setEditDialogOpen(false);
      setAvatarFile(null);
      setAvatarPreview('');
      toast({ 
        title: '✨ Profile updated', 
        description: 'Your changes have been saved successfully.' 
      });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update profile';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  // Enhanced Post Grid with better animations
  const PostGrid = ({ items, emptyMessage, isLoading }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className="aspect-square bg-gradient-to-br from-muted/50 to-muted rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))
        : items.length > 0
        ? items.map((post, index) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="aspect-square relative group cursor-pointer bg-muted rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-lg"
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'fadeInUp 0.5s ease-out forwards'
              }}
            >
              {post.type === 'VIDEO' ||
              /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(post.mediaUrl || '') ? (
                <video
                  src={post.mediaUrl}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={post.thumbnailUrl || post.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://via.placeholder.com/400x400/1f2937/9CA3AF?text=No+Image';
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex items-center space-x-6 text-white">
                  <span className="flex items-center backdrop-blur-sm bg-black/20 rounded-full px-3 py-1">
                    <Heart className="w-4 h-4 mr-1.5" />
                    {post.likesCount || 0}
                  </span>
                  <span className="flex items-center backdrop-blur-sm bg-black/20 rounded-full px-3 py-1">
                    <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
                    </svg>
                    {post.commentsCount || post._count?.comments || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))
        : (
          <div className="col-span-full text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <Grid className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg font-medium">{emptyMessage}</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Share your first moment!</p>
          </div>
        )}
    </div>
  );

  if (meLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-start gap-8 mb-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 lg:w-40 lg:h-40 bg-muted rounded-full" />
                <div className="text-center sm:text-left space-y-3">
                  <div className="h-8 bg-muted rounded w-48" />
                  <div className="h-4 bg-muted rounded w-64" />
                  <div className="h-4 bg-muted rounded w-32" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!me) return null;

  const followersCount = followersPack?.total ?? followers.length;
  const followingCount = followingPack?.total ?? following.length;
  const joinedDate = me.createdAt ? format(new Date(me.createdAt), 'MMMM yyyy') : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Enhanced Header */}
        <Card className="mb-8 overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm">
          <div className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-8">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-32 h-32 lg:w-40 lg:h-40 border-4 border-background shadow-xl ring-4 ring-primary/10">
                    <AvatarImage src={avatarPreview || me.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-foreground text-4xl lg:text-5xl font-bold">
                      {me.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute -bottom-2 -right-2 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:scale-110 transition-all duration-200"
                    onClick={() => setEditDialogOpen(true)}
                    title="Edit profile"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>

                {/* Mobile-first profile actions */}
                <div className="flex flex-col items-center sm:items-start gap-4">
                  <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      @{me.username}
                    </h1>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditDialogOpen(true)}
                      className="hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit profile
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-lg">{posts.length}</div>
                      <div className="text-muted-foreground">posts</div>
                    </div>
                    <button
                      className="hover:scale-105 transition-transform text-center"
                      onClick={() => setActiveTab('followers')}
                      title="View followers"
                    >
                      <div className="font-bold text-lg">{followersCount}</div>
                      <div className="text-muted-foreground hover:text-primary transition-colors">followers</div>
                    </button>
                    <button
                      className="hover:scale-105 transition-transform text-center"
                      onClick={() => setActiveTab('following')}
                      title="View following"
                    >
                      <div className="font-bold text-lg">{followingCount}</div>
                      <div className="text-muted-foreground hover:text-primary transition-colors">following</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="flex-1 space-y-4 text-center lg:text-left">
                {/* Bio */}
                {me.bio && (
                  <p className="text-base leading-relaxed text-foreground/90 max-w-md mx-auto lg:mx-0">
                    {me.bio}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-muted-foreground">
                  {me.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {me.location}
                    </div>
                  )}
                  {me.website && (
                    <div className="flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" />
                      <a href={me.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        {me.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {joinedDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {joinedDate}
                    </div>
                  )}
                </div>

                {/* Account Badge */}
                <div className="flex justify-center lg:justify-start">
                  <Badge 
                    variant={me.isPublic ? 'default' : 'secondary'} 
                    className="px-3 py-1 text-xs font-medium"
                  >
                    {me.isPublic ? '🌐 Public' : '🔒 Private'} Account
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger 
              value="posts" 
              className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="followers" 
              className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Followers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="following" 
              className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Following</span>
            </TabsTrigger>
            <TabsTrigger 
              value="about" 
              className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>
          </TabsList>

          {/* POSTS */}
          <TabsContent value="posts" className="mt-8">
            <PostGrid
              items={posts}
              emptyMessage="No posts yet"
              isLoading={postsPack?.isLoading || false}
            />
            {postsPack?.hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() =>
                    fetchByAuthor(meId, { page: (postsPack.page || 0) + 1, limit: 24 })
                  }
                  disabled={postsPack.isLoading}
                  className="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                >
                  {postsPack.isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* FOLLOWERS */}
          <TabsContent value="followers" className="mt-8">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <div className="p-6">
                <PeopleList
                  items={followers}
                  emptyMessage="No followers yet"
                  isLoading={followersPack?.isLoading}
                  onLoadMore={() =>
                    getFollowers?.(meId, { page: (followersPack?.page || 0) + 1, limit: 24 })
                  }
                  hasMore={!!followersPack?.hasMore}
                />
              </div>
            </Card>
          </TabsContent>

          {/* FOLLOWING */}
          <TabsContent value="following" className="mt-8">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <div className="p-6">
                <PeopleList
                  items={following}
                  emptyMessage="Not following anyone yet"
                  isLoading={followingPack?.isLoading}
                  onLoadMore={() =>
                    getFollowing?.(meId, { page: (followingPack?.page || 0) + 1, limit: 24 })
                  }
                  hasMore={!!followingPack?.hasMore}
                  actionLabel="Unfollow"
                  onAction={async (u) => {
                    try {
                      await unfollowUser(u.id);
                      // Refresh following list
                      await getFollowing(meId, { page: 1, limit: 24 });
                      toast({ 
                        title: '✓ Unfollowed', 
                        description: `You are no longer following @${u.username}` 
                      });
                    } catch (error) {
                      toast({ 
                        title: 'Error', 
                        description: 'Failed to unfollow user',
                        variant: 'destructive'
                      });
                    }
                  }}
                />
              </div>
            </Card>
          </TabsContent>

          {/* ABOUT */}
          <TabsContent value="about" className="mt-8">
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <div className="p-6">
                <div className="max-w-2xl space-y-6">
                  <h3 className="text-xl font-semibold mb-6">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Email</span>
                      <p className="text-base">{me.email || 'Not provided'}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Username</span>
                      <p className="text-base">@{me.username}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Account Type</span>
                      <p className="text-base">{me.isPublic ? 'Public' : 'Private'}</p>
                    </div>
                    {joinedDate && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                        <p className="text-base">{joinedDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enhanced Edit Profile Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
  <DialogContent className="sm:max-w-md !bg-white border-border/50 shadow-2xl">
    <DialogHeader className="p-6 pb-4">
      <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
      <DialogDescription className="text-muted-foreground">
        Update your details and profile photo.
      </DialogDescription>
    </DialogHeader>

    <div className="flex flex-col space-y-6 px-6">
      {/* Avatar Upload */}
      <div className="flex items-center space-x-4">
        <Avatar className="w-20 h-20 border-4 border-white shadow">
          <AvatarImage src={avatarPreview || me.avatar || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-2xl font-bold">
            {me.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <Button variant="outline" size="sm" asChild disabled={isUploading}>
              <span>
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Uploading…
                  </>
                ) : (
                  'Change photo'
                )}
              </span>
            </Button>
          </Label>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={editForm.bio}
          onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
          placeholder="Tell us about yourself..."
          className="bg-white border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
          rows={3}
          maxLength={150}
        />
        <p className="text-xs text-muted-foreground text-right">
          {editForm.bio.length}/150
        </p>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={editForm.location}
          onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
          placeholder="Where are you from?"
          className="bg-white border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
        />
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="url"
          value={editForm.website}
          onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))}
          placeholder="https://yourwebsite.com"
          className="bg-white border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
        />
      </div>

      {/* Public Account Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50">
        <div className="space-y-1">
          <Label htmlFor="public-account" className="font-medium">Public Account</Label>
          <p className="text-xs text-muted-foreground">Anyone can see your profile and posts</p>
        </div>
        <Switch
          className="bg-black border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
          id="public-account"
          checked={editForm.isPublic}
          onCheckedChange={(checked) => setEditForm((p) => ({ ...p, isPublic: checked }))}
        />
      </div>
    </div>

    <DialogFooter className="bg-muted/30 p-4 border-t border-border/50">
      <Button
        variant="outline"
        onClick={() => {
          setEditDialogOpen(false);
          setAvatarPreview('');
          setAvatarFile(null);
          setEditForm({
            bio: me.bio || '',
            isPublic: me.isPublic ?? true,
            location: me.location || '',
            website: me.website || '',
          });
        }}
      >
        Cancel
      </Button>
      <Button onClick={handleSaveProfile} disabled={meLoading || isUploading} className="min-w-[120px]">
        {meLoading || isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Saving…
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      </div>
    </div>
  );
}

/** Enhanced People List */
function PeopleList({ items, emptyMessage, isLoading, onLoadMore, hasMore, actionLabel, onAction }) {
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (user) => {
    setActionLoading(prev => ({ ...prev, [user.id]: true }));
    try {
      await onAction(user);
    } finally {
      setActionLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {isLoading && items.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {items.map((u, index) => (
            <li 
              key={u.id} 
              className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/30 transition-all duration-200"
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'fadeInUp 0.4s ease-out forwards'
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                  <AvatarImage src={u.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 font-medium">
                    {u.username?.[0]?.toUpperCase() || u.name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link 
                    href={`/u/${u.username || u.id}`} 
                    className="font-medium hover:text-primary transition-colors truncate block"
                  >
                    @{u.username || u.id}
                  </Link>
                  {u.bio && (
                    <div className="text-sm text-muted-foreground truncate mt-0.5">
                      {u.bio}
                    </div>
                  )}
                  {u.name && u.name !== u.username && (
                    <div className="text-xs text-muted-foreground/80 truncate">
                      {u.name}
                    </div>
                  )}
                </div>
              </div>
              
              {onAction && actionLabel && (
                <Button 
                  size="sm" 
                  variant={actionLabel === 'Unfollow' ? 'outline' : 'secondary'}
                  onClick={() => handleAction(u)}
                  disabled={actionLoading[u.id]}
                  className={`min-w-[80px] ${
                    actionLabel === 'Unfollow' 
                      ? 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive' 
                      : ''
                  }`}
                >
                  {actionLoading[u.id] ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    actionLabel
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="text-center pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onLoadMore}
            className="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

// Add CSS animations
const styles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('profile-animations');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'profile-animations';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}