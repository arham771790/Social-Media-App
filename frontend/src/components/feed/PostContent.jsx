'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PostContent({ title, content }) {
  const [showFull, setShowFull] = useState(false);
  const shouldClamp = (content?.length || 0) > 220;
  const contentPreview = shouldClamp ? `${content.slice(0, 220)}...` : content;

  if (!title && !content) return null;

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="font-display text-[1.9rem] leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[2.15rem]">
          {title}
        </h3>
      )}

      {content && (
        <div className="max-w-none">
          <p className="text-[15px] leading-7 text-foreground/88 sm:text-base">
            {showFull ? content : contentPreview}
          </p>
          {shouldClamp && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowFull((s) => !s)}
              className="mt-2 h-auto px-0 text-sm text-primary"
            >
              {showFull ? 'Show less' : 'Read more'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
