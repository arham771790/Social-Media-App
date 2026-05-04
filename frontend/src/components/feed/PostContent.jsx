'use client';

import { useState } from 'react';

export default function PostContent({ title, content }) {
    const [showFull, setShowFull] = useState(false);
    const contentPreview = content?.length > 200 ? `${content.substring(0, 200)}...` : content;

    return (
        <div className="px-3 sm:px-4 py-2">
            {title && (
                <h3 className="text-base sm:text-lg font-semibold text-foreground break-words mb-2">
                    {title}
                </h3>
            )}
            {content && (
                <>
                    <p className={`text-sm sm:text-base text-foreground leading-relaxed ${!showFull ? 'line-clamp-3 sm:line-clamp-none' : ''}`}>
                        {showFull ? content : contentPreview}
                    </p>
                    {content.length > 200 && (
                        <button
                            onClick={() => setShowFull(!showFull)}
                            className="mt-1 text-primary hover:underline text-sm font-medium"
                        >
                            {showFull ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
