// src/components/feed/CreatePost.jsx
'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Smile, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePostStore } from '@/store/postStore';
import { useFeedStore } from '@/store/feedStore';
import { useAuthStore } from '@/store/authStore';
import { useUploadStore } from '@/store/uploadStore';

export default function CreatePost() {
  const { user: currentUser } = useAuthStore();
  const { createPost, isLoading } = usePostStore();
  const { fetchHome, pagination } = useFeedStore();
  const { uploadFile, isUploading } = useUploadStore();

  const fileInputRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [media, setMedia] = useState(null); // { optimizedUrl, thumbnailUrl, fileType, publicId, ... }
  const [mediaPreview, setMediaPreview] = useState(null);

  if (!currentUser) return null;

  const pickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadFile(file);
      setMedia(res);
      setMediaPreview(res.optimizedUrl || res.originalUrl);
      setExpanded(true);
    } catch (err) {
      console.error(err);
    } finally {
      e.target.value = ''; // allow re-select same file
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !media) return;

    const payload = {
      content: content.trim() || undefined,
      title: title.trim() || undefined,
      tags,
      isPublic: true,
      isAnonymous: false,
      mediaUrl: media?.optimizedUrl || media?.originalUrl,
      thumbnailUrl: media?.thumbnailUrl || undefined,
      // 🔑 explicitly set post type so the FE can render reliably
      type: media ? (media.fileType === 'video' ? 'VIDEO' : 'IMAGE') : 'TEXT',
    };

    await createPost(payload);
    await fetchHome({ page: 1, limit: pagination.limit });

    // reset form
    setContent('');
    setTitle('');
    setTags([]);
    setTagInput('');
    setMedia(null);
    setMediaPreview(null);
    setExpanded(false);
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase();
      if (!tags.includes(t) && tags.length < 5) {
        setTags((prev) => [...prev, t]);
      }
      setTagInput('');
    }
  };

  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  return (
    <Card className="bg-card border-border mb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="p-4">
        <div className="flex space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={currentUser?.avatar} />
            <AvatarFallback>{currentUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setExpanded(true)}
              className="min-h-[60px] resize-none border-0 p-0 text-lg placeholder:text-muted-foreground focus-visible:ring-0"
            />

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-4"
                >
                  <Input
                    placeholder="Add a title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-medium"
                  />

                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-sm">
                          #{tag}
                          <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Add tags (press Enter)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagAdd}
                      className="text-sm"
                    />
                  </div>

                  {mediaPreview && (
                    <div className="relative">
                      {media?.fileType === 'video' ? (
                        <video
                          src={mediaPreview}
                          controls
                          className="w-full max-h-80 rounded-lg"
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Media preview"
                          className="w-full max-h-80 object-cover rounded-lg"
                        />
                      )}
                      <button
                        onClick={() => { setMedia(null); setMediaPreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between mt-4 pt-4 border-t border-border"
          >
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={pickFile} disabled={isUploading}>
                <Image className="w-4 h-4 mr-1" />
                {isUploading ? 'Uploading...' : 'Photo/Video'}
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="w-4 h-4 mr-1" />
                Record
              </Button>
              <Button variant="ghost" size="sm">
                <Smile className="w-4 h-4 mr-1" />
                Feeling
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || isUploading || (!content.trim() && !media)}
                size="sm"
              >
                {isLoading ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
}
