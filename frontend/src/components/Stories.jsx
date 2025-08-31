'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSocialStore } from '@/store/socialStore';
import { useAuthStore } from '@/store/authStore';
import { useUploadStore } from '@/store/uploadStore';
import { Plus, Play, Pause, X, ChevronLeft, ChevronRight, Image as ImageIcon, Upload as UploadIcon, Link as LinkIcon } from 'lucide-react';

/* ---------------------------
   Small utilities
---------------------------- */
const safeDate = (d) => {
  const t = new Date(d);
  return isNaN(t.getTime()) ? null : t;
};
const mediaTypeFromUpload = (uploadMeta) => {
  // uploadMeta example (from your uploadStore): { fileType, resourceType, originalUrl, optimizedUrl, thumbnailUrl }
  const t = (uploadMeta?.resourceType || uploadMeta?.fileType || '').toString().toLowerCase();
  if (t.includes('video')) return 'VIDEO';
  return 'IMAGE';
};
const pickBestUrl = (uploadMeta) =>
  uploadMeta?.optimizedUrl || uploadMeta?.originalUrl || uploadMeta?.thumbnailUrl || '';

/* ---------------------------
   Story Ring
---------------------------- */
const StoryRing = ({ user, hasStory, isViewed, onClick, showAddButton = false }) => (
  <div className="flex flex-col items-center space-y-2 cursor-pointer group" onClick={onClick}>
    <div
      className={[
        'relative w-16 h-16 rounded-full p-0.5 transition-all duration-200',
        hasStory && !isViewed ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500' : '',
        hasStory && isViewed ? 'bg-gray-600' : '',
        !hasStory ? 'bg-gray-700' : '',
        'group-hover:scale-105',
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
          />
        )}
      </div>
      {showAddButton && (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-black">
          <Plus className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
    <span className="text-xs text-center max-w-[70px] truncate">
      {showAddButton ? 'Your story' : user?.username || 'User'}
    </span>
  </div>
);

/* ---------------------------
   Story Viewer
---------------------------- */
const StoryViewer = ({ stories, currentIndex, onClose, onNext, onPrevious }) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const progressInterval = useRef(null);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds

  useEffect(() => {
    if (!currentStory) return;
    if (!isPaused && isPlaying) {
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (100 / (STORY_DURATION / 50));
          if (next >= 100) {
            if (currentIndex < stories.length - 1) onNext();
            else onClose();
            return 0;
          }
          return next;
        });
      }, 50);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [currentIndex, isPaused, isPlaying, currentStory, onNext, onClose, stories.length]);

  useEffect(() => setProgress(0), [currentIndex]);

  const handlePausePlay = () => {
    if (currentStory?.type === 'VIDEO') {
      setIsPaused((p) => !p);
      setIsPlaying((p) => !p);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'ArrowRight' && currentIndex < stories.length - 1) onNext();
    if (e.key === 'ArrowLeft' && currentIndex > 0) onPrevious();
    if (e.key === 'Escape') onClose();
    if (e.key === ' ') {
      e.preventDefault();
      handlePausePlay();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, stories.length]);

  if (!currentStory) return null;

  const createdAt = safeDate(currentStory.createdAt);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white hover:text-gray-300">
        <X className="w-6 h-6" />
      </button>

      {/* Nav */}
      {currentIndex > 0 && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Progress + header */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex space-x-1 mb-4">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <img
            src={currentStory.user?.avatar || currentStory.user?.profilePicture || '/default-avatar.png'}
            alt={currentStory.user?.username || 'user'}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-white font-semibold">{currentStory.user?.username || 'User'}</span>
          {createdAt && (
            <span className="text-gray-300 text-sm">
              {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center" onClick={handlePausePlay}>
        {currentStory.type === 'VIDEO' ? (
          <video
            src={currentStory.mediaUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop={false}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <img src={currentStory.mediaUrl} alt="Story" className="w-full h-full object-cover" />
        )}

        {currentStory.type === 'VIDEO' && isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <Play className="w-16 h-16 text-white opacity-80" />
          </div>
        )}

        {currentStory.caption && (
          <div className="absolute bottom-20 left-4 right-4 text-white">
            <p className="text-sm bg-black bg-opacity-50 p-2 rounded">{currentStory.caption}</p>
          </div>
        )}
      </div>

      {/* Click areas */}
      <div className="absolute inset-0 flex">
        <div
          className="flex-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (currentIndex > 0) onPrevious();
          }}
        />
        <div
          className="flex-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (currentIndex < stories.length - 1) onNext();
            else onClose();
          }}
        />
      </div>
    </div>
  );
};

/* ---------------------------
   Create Story Modal
---------------------------- */
const CreateStoryModal = ({ isOpen, onClose, onSubmit }) => {
  const [tab, setTab] = useState('upload'); // 'upload' | 'link'
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const { uploadFile, isUploading, error: uploadError } = useUploadStore();

  useEffect(() => {
    // cleanup preview
    return () => {
      if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const onPickFile = (f) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setFilePreview(url);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) onPickFile(f);
  };

  const onBrowse = (e) => {
    const f = e.target.files?.[0];
    if (f) onPickFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isBusy) return;

    try {
      setIsBusy(true);

      let finalUrl = mediaUrl;
      let finalType = 'IMAGE';

      if (tab === 'upload') {
        if (!file) return;
        const meta = await uploadFile(file); // { originalUrl, optimizedUrl, fileType|resourceType, ... }
        finalUrl = pickBestUrl(meta);
        finalType = mediaTypeFromUpload(meta);
      } else {
        if (!mediaUrl.trim()) return;
        // infer type from url extension if possible
        const isVideo = /\.(mp4|mov|webm|mkv|avi)$/i.test(mediaUrl);
        finalType = isVideo ? 'VIDEO' : 'IMAGE';
      }

      await onSubmit({ mediaUrl: finalUrl, type: finalType, caption, isPublic });

      // reset & close
      setFile(null);
      if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
      setFilePreview('');
      setMediaUrl('');
      setCaption('');
      onClose();
    } catch (err) {
      console.error('Create story failed:', err);
    } finally {
      setIsBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={onDrop}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl w-full max-w-lg p-6 shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Create Story
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              tab === 'upload' ? 'bg-purple-600/20 text-purple-300 border border-purple-600/40' : 'bg-gray-800 text-gray-300 border border-gray-700',
            ].join(' ')}
            onClick={() => setTab('upload')}
          >
            <UploadIcon className="w-4 h-4" />
            Upload
          </button>
          <button
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              tab === 'link' ? 'bg-purple-600/20 text-purple-300 border border-purple-600/40' : 'bg-gray-800 text-gray-300 border border-gray-700',
            ].join(' ')}
            onClick={() => setTab('link')}
          >
            <LinkIcon className="w-4 h-4" />
            Link
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {tab === 'upload' ? (
            <>
              {/* Dropzone / Preview */}
              <label
                className="block border-2 border-dashed border-gray-700 rounded-xl p-5 bg-gray-800/40 text-gray-300 hover:border-purple-500/60 hover:bg-gray-800/60 transition cursor-pointer"
              >
                {filePreview ? (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                    {/* show preview naively by type */}
                    {/\.(mp4|mov|webm|mkv|avi)$/i.test(file?.name || '') ? (
                      <video src={filePreview} className="w-full h-full object-cover" autoPlay muted loop />
                    ) : (
                      <img src={filePreview} alt="preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <UploadIcon className="w-7 h-7" />
                    <div className="text-sm">
                      Drag & drop or <span className="text-purple-300 underline">browse</span>
                    </div>
                    <div className="text-xs text-gray-400">Images (JPG/PNG/WebP) or Videos (MP4/WebM)</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={onBrowse}
                />
              </label>

              {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Media URL</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://example.com/image-or-video"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-2">Caption (optional)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Add a caption..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-300">
              Make story public
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || (tab === 'upload' ? !file : !mediaUrl.trim()) || isUploading}
              className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBusy || isUploading ? 'Posting…' : 'Post Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------------------
   Main Stories
---------------------------- */
const Stories = () => {
  const { user } = useAuthStore();

  const {
    storiesByUser,
    fetchPublicStories,
    createStory,
    error: socialError,
  } = useSocialStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentStoryGroup, setCurrentStoryGroup] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewedStories, setViewedStories] = useState(() => new Set());

  const publicStories = storiesByUser?.public?.items || [];
  const isLoadingPublic = storiesByUser?.public?.isLoading || false;

  // Group stories by user with safe fallbacks for story.user
  const storyGroups = useMemo(() => {
    const groups = {};
    for (const story of publicStories) {
      const uid = story?.userId || story?.user?.id || '__unknown__';
      if (!groups[uid]) {
        const u = story?.user || {};
        groups[uid] = {
          user: {
            id: u?.id || story?.userId || uid,
            username: u?.username || 'User',
            avatar: u?.avatar || null,
            profilePicture: u?.avatar || null,
          },
          stories: [],
        };
      }
      groups[uid].stories.push(story);
    }
    // sort each group by createdAt desc (just in case)
    Object.values(groups).forEach((g) =>
      g.stories.sort((a, b) => {
        const ta = safeDate(a?.createdAt)?.getTime() || 0;
        const tb = safeDate(b?.createdAt)?.getTime() || 0;
        return tb - ta;
      })
    );
    return groups;
  }, [publicStories]);

  useEffect(() => {
    fetchPublicStories().catch(() => {});
  }, [fetchPublicStories]);

  const openStoryViewer = (userGroup, startIndex = 0) => {
    setCurrentStoryGroup(userGroup.stories);
    setCurrentStoryIndex(startIndex);
    setViewerOpen(true);
    // mark viewed
    setViewedStories((prev) => {
      const next = new Set(prev);
      userGroup.stories.forEach((s) => s?.id && next.add(s.id));
      return next;
    });
  };

  const closeStoryViewer = () => {
    setViewerOpen(false);
    setCurrentStoryGroup([]);
    setCurrentStoryIndex(0);
  };

  const nextStory = () => {
    if (currentStoryIndex < currentStoryGroup.length - 1) {
      setCurrentStoryIndex((i) => i + 1);
    } else {
      closeStoryViewer();
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((i) => i - 1);
    }
  };

  const handleCreateStory = async (storyData) => {
    await createStory(storyData);
    // optional: refresh feed explicitly if you want
    // await fetchPublicStories();
  };

  const openCreateModal = () => setCreateModalOpen(true);
  const closeCreateModal = () => setCreateModalOpen(false);

  return (
    <>
      <div className="w-full bg-black border-b border-gray-800">
        <div className="flex space-x-4 p-4 overflow-x-auto scrollbar-hide">
          {/* Add story */}
          <StoryRing user={user} showAddButton onClick={openCreateModal} />

          {/* Story rings */}
          {Object.values(storyGroups).map((group, idx) => (
            <StoryRing
              key={group.user?.id || idx}
              user={group.user}
              hasStory={group.stories.length > 0}
              isViewed={group.stories.every((s) => s?.id && viewedStories.has(s.id))}
              onClick={() => openStoryViewer(group)}
            />
          ))}
        </div>

        {(socialError) && (
          <div className="px-4 pb-2">
            <p className="text-red-400 text-sm">{socialError}</p>
          </div>
        )}
      </div>

      {/* Viewer */}
      {viewerOpen && (
        <StoryViewer
          stories={currentStoryGroup}
          currentIndex={currentStoryIndex}
          onClose={closeStoryViewer}
          onNext={nextStory}
          onPrevious={previousStory}
        />
      )}

      {/* Create Modal */}
      <CreateStoryModal isOpen={createModalOpen} onClose={closeCreateModal} onSubmit={handleCreateStory} />
    </>
  );
};

export default Stories;
