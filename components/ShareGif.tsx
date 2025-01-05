'use client';

import { Button } from "@/components/ui/button";
import { Share } from 'lucide-react';

interface ShareGifButtonProps {
  gifUrl: string | null;
  disabled?: boolean;
}

export const ShareGifButton = ({ gifUrl, disabled }: ShareGifButtonProps) => {
  const handleShare = async () => {
    if (!gifUrl) return;

    try {
      const response = await fetch(gifUrl);
      const blob = await response.blob();
      const file = new File([blob], 'animation.gif', { type: 'image/gif' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Share GIF',
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animation.gif';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleShare}
      disabled={disabled || !gifUrl}
      variant="outline"
      className="w-full gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Share className="h-4 w-4" />
      <span>Share</span>
    </Button>
  );
}; 