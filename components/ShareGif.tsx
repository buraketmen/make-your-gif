'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ShareGifButtonProps {
  gifUrl: string | null;
  disabled?: boolean;
}

export const ShareGifButton = ({ gifUrl, disabled }: ShareGifButtonProps) => {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

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
      console.error('Error while sharing GIF.', error);
      setError('Error while sharing GIF.');
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
