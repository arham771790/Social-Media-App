'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hash, Image, Smile, Sparkles, Type, Video, Wand2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAIStore } from '@/store/aiStore';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { usePostStore } from '@/store/postStore';
import { useUploadStore } from '@/store/uploadStore';

export default function CreatePost() {
  const { user: currentUser } = useAuthStore();
  const { createPost, isLoading } = usePostStore();
  const { fetchHome, pagination } = useFeedStore();
  const { uploadFile, isUploading } = useUploadStore();
  const {
    generateTags,
    suggestCaptions,
    suggestMediaAwareCaptions,
    titleFromContent,
    isGenerating,
  } = useAIStore();

  const fileInputRef = useRef(null);

  const [expanded, setExpanded] = useState(true);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [media, setMedia] = useState(null);
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
      toast.error('Upload failed');
    } finally {
      e.target.value = '';
    }
  };

  const handleAISuggestCaption = async () => {
    try {
      let captions;
      if (media?.optimizedUrl || media?.originalUrl) {
        captions = await suggestMediaAwareCaptions(media.optimizedUrl || media.originalUrl);
      } else if (content.trim()) {
        captions = await suggestCaptions(content);
      } else {
        toast.error('Add some text or media first!');
        return;
      }

      if (captions?.[0]) {
        setContent(captions[0]);
        toast.success('Caption suggested!');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAIGenerateTags = async () => {
    if (!content.trim()) {
      toast.error('Add some text first!');
      return;
    }
    try {
      const suggestedTags = await generateTags(content);
      if (suggestedTags?.length) {
        setTags((prev) => {
          const combined = [...new Set([...prev, ...suggestedTags.map((tag) => tag.toLowerCase())])];
          return combined.slice(0, 5);
        });
        toast.success('Tags generated!');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAIGenerateTitle = async () => {
    if (!content.trim()) {
      toast.error('Add some text first!');
      return;
    }
    try {
      const suggestedTitle = await titleFromContent(content);
      if (suggestedTitle) {
        setTitle(suggestedTitle);
        toast.success('Title generated!');
      }
    } catch (err) {
      toast.error(err.message);
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
      type: media ? (media.fileType === 'video' ? 'VIDEO' : 'IMAGE') : 'TEXT',
    };

    try {
      await createPost(payload);
      toast.success('Post created!');
      await fetchHome({ page: 1, limit: pagination.limit });

      setContent('');
      setTitle('');
      setTags([]);
      setTagInput('');
      setMedia(null);
      setMediaPreview(null);
      setExpanded(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag) && tags.length < 5) {
        setTags((prev) => [...prev, tag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((item) => item !== tag));

  return (
    <Card className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border-white/8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onFileChange}
      />

      <CardHeader className="border-b border-white/6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-12">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback>{currentUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Create
              </div>
              <CardTitle className="text-[2rem]">Publish something thoughtful</CardTitle>
              <CardDescription>
                Write a note, add a photo, or let the AI layer help with framing.
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className="shrink-0">Live composer</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="relative flex items-center gap-2">
              <Input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="pr-12 text-base font-medium"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 size-9 rounded-full"
                onClick={handleAIGenerateTitle}
                disabled={isGenerating}
                title="AI generate title"
              >
                <Type className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
              </Button>
            </div>

            <div className="rounded-[1.6rem] border border-white/7 bg-background/18 p-4">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (!expanded) setExpanded(true);
                }}
                onFocus={() => setExpanded(true)}
                className="min-h-[150px] border-0 bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0 sm:text-lg"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAISuggestCaption}
                  disabled={isGenerating}
                  className="rounded-full"
                >
                  <Wand2 className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                  Caption
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAIGenerateTags}
                  disabled={isGenerating}
                  className="rounded-full"
                >
                  <Hash className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                  Tags
                </Button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-5 overflow-hidden"
              >
                <div className="rounded-[1.5rem] border border-white/7 bg-background/14 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium tracking-[-0.01em] text-foreground">Tags</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Up to 5
                    </p>
                  </div>

                  {!!tags.length && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 rounded-full transition-colors hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Input
                    placeholder="Add tags and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagAdd}
                  />
                </div>

                {mediaPreview && (
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-white/7 bg-background/20">
                    {media?.fileType === 'video' ? (
                      <video
                        src={mediaPreview}
                        controls
                        className="max-h-[30rem] w-full object-cover"
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Media preview"
                        className="max-h-[30rem] w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMedia(null);
                        setMediaPreview(null);
                      }}
                      className="absolute right-4 top-4 rounded-full border border-white/12 bg-[rgba(10,12,17,0.58)] p-2.5 text-white backdrop-blur-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-4 border-t border-white/6 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={pickFile} disabled={isUploading} className="rounded-full">
                <Image className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Photo'}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="rounded-full">
                <Video className="mr-2 h-4 w-4" />
                Video
              </Button>
              <Button type="button" variant="ghost" size="sm" className="rounded-full">
                <Smile className="mr-2 h-4 w-4" />
                Mood
              </Button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExpanded((value) => !value)}
                className="rounded-full"
              >
                {expanded ? 'Collapse' : 'Expand'}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isUploading || isGenerating || (!content.trim() && !media)}
                size="sm"
                variant="gradient"
                className="rounded-full"
              >
                {isLoading ? 'Posting...' : 'Publish'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
