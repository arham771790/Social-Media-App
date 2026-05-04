'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Smile, X, Sparkles, Wand2, Hash, Type } from 'lucide-react';
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
import { useAIStore } from '@/store/aiStore';
import { toast } from 'react-hot-toast';

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
    isGenerating 
  } = useAIStore();

  const fileInputRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
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
      toast.error("Upload failed");
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
        toast.error("Add some text or media first!");
        return;
      }
      
      if (captions?.[0]) {
        setContent(captions[0]);
        toast.success("Caption suggested!");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAIGenerateTags = async () => {
    if (!content.trim()) {
      toast.error("Add some text first!");
      return;
    }
    try {
      const suggestedTags = await generateTags(content);
      if (suggestedTags?.length) {
        setTags(prev => {
          const combined = [...new Set([...prev, ...suggestedTags.map(t => t.toLowerCase())])];
          return combined.slice(0, 5);
        });
        toast.success("Tags generated!");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAIGenerateTitle = async () => {
    if (!content.trim()) {
      toast.error("Add some text first!");
      return;
    }
    try {
      const suggestedTitle = await titleFromContent(content);
      if (suggestedTitle) {
        setTitle(suggestedTitle);
        toast.success("Title generated!");
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
      toast.success("Post created!");
      await fetchHome({ page: 1, limit: pagination.limit });

      setContent('');
      setTitle('');
      setTags([]);
      setTagInput('');
      setMedia(null);
      setMediaPreview(null);
      setExpanded(false);
    } catch (err) {
      toast.error(err.message);
    }
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
    <Card className="bg-card border-border/50 mb-6 hover:shadow-lg transition-all duration-300 w-full max-w-2xl mx-auto sm:rounded-2xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-primary/20">
            <AvatarImage src={currentUser?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {currentUser?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="relative group">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setExpanded(true)}
                className="min-h-[60px] resize-none border-0 p-0 text-base sm:text-lg placeholder:text-muted-foreground focus-visible:ring-0 bg-transparent mb-2"
              />
              {expanded && (
                <div className="flex gap-2 mb-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                    onClick={handleAISuggestCaption}
                    disabled={isGenerating}
                    title="AI Suggest Caption"
                  >
                    <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                    onClick={handleAIGenerateTags}
                    disabled={isGenerating}
                    title="AI Generate Tags"
                  >
                    <Hash className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 sm:mt-6 space-y-4"
                >
                  <div className="relative flex items-center gap-2">
                    <Input
                      placeholder="Add a title (optional)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-base sm:text-lg font-medium border-2 pr-10"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                      onClick={handleAIGenerateTitle}
                      disabled={isGenerating}
                      title="AI Generate Title"
                    >
                      <Type className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs sm:text-sm hover:scale-105 transition-transform duration-200"
                        >
                          #{tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-2 hover:text-destructive transition-colors duration-200 p-0.5 rounded-full hover:bg-destructive/10"
                          >
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
                      className="text-sm border-2"
                    />
                  </div>

                  {mediaPreview && (
                    <div className="relative group">
                      {media?.fileType === 'video' ? (
                        <video
                          src={mediaPreview}
                          controls
                          className="w-full max-h-64 sm:max-h-80 rounded-xl shadow-lg object-contain"
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Media preview"
                          className="w-full max-h-64 sm:max-h-80 object-cover rounded-xl shadow-lg"
                        />
                      )}
                      <button
                        onClick={() => {
                          setMedia(null);
                          setMediaPreview(null);
                        }}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full hover:scale-110 transition-all duration-200 backdrop-blur-sm"
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
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50 gap-3 sm:gap-0"
          >
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={pickFile}
                disabled={isUploading}
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Image className="w-4 h-4 mr-1 sm:mr-2" />
                {isUploading ? 'Uploading...' : 'Photo/Video'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Video className="w-4 h-4 mr-1 sm:mr-2" />
                Record
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Smile className="w-4 h-4 mr-1 sm:mr-2" />
                Feeling
              </Button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(false)}
                className="hover:bg-muted transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || isUploading || isGenerating || (!content.trim() && !media)}
                size="sm"
                variant="gradient"
                className="transition-all duration-200 hover:scale-105"
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
