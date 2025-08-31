// src/components/stories/CreateStoryModal.jsx
'use client';

import { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { useUploadStore } from '@/store/uploadStore';

export default function CreateStoryModal({ isOpen, onClose, onSubmit }) {
  const { uploadFile, isUploading } = useUploadStore();
  const [localUrl, setLocalUrl] = useState('');
  const [type, setType] = useState('IMAGE');
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const pickFromDevice = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const info = await uploadFile(file); // { optimizedUrl/originalUrl, fileType, ... }
      const url = info?.optimizedUrl || info?.originalUrl;
      setLocalUrl(url || '');
      const isVid = (info?.fileType || '').toLowerCase().includes('video');
      setType(isVid ? 'VIDEO' : 'IMAGE');
    } catch (e) {
      // error already handled in store
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localUrl.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ mediaUrl: localUrl, type, caption, isPublic });
      setLocalUrl('');
      setCaption('');
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[55] grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white text-lg font-semibold">Create Story</h2>
          <button className="text-white/70 hover:text-white" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Upload from device */}
          <div>
            <label className="block text-sm text-white/80 mb-2">Upload</label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => pickFromDevice(e.target.files?.[0])}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
                onClick={() => inputRef.current?.click()}
                disabled={busy || isUploading}
              >
                <Upload className="w-4 h-4" />
                Choose file
              </button>
              <input
                type="url"
                placeholder="or paste a media URL"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/80 mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white outline-none"
              >
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Public
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">Caption</label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white outline-none resize-none"
              placeholder="Say something…"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !localUrl.trim()}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
