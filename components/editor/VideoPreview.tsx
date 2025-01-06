'use client';

import { useRef, useEffect, useState } from 'react';
import { useVideo } from '@/context/video-context';
import { CropBox } from '@/components/editor/crop/CropBox';
import { Crop, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Video = () => {
  const { toast } = useToast();
  const {
    getVideoBlob,
    videoFilters: {
      crop: { isCropMode },
    },
    frames,
  } = useVideo();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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

  useEffect(() => {
    const loadVideo = async () => {
      if (!videoRef.current) return;

      try {
        const blob = await getVideoBlob();
        if (blob) {
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          videoRef.current.src = url;
        }
      } catch (error) {
        console.error('Error loading video.', error);
        setError('Error loading video.');
      }
    };

    loadVideo();

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getVideoBlob]);

  return (
    <video
      ref={videoRef}
      controls={!isCropMode}
      className="w-full h-full object-contain"
      playsInline
      poster={frames[0]?.imageData}
      style={{
        maxHeight: 480,
        maxWidth: '100%',
      }}
      preload="metadata"
    />
  );
};

export const VideoPreview = () => {
  const { videoFilters } = useVideo();
  return (
    <div className="w-full max-h-[600px] rounded-lg overflow-hidden bg-gray-100 relative flex items-center justify-center">
      <Video />
      {videoFilters.crop.isCropMode && (
        <div className="absolute inset-0 flex items-center justify-center">
          <CropBox />
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-2">
        {videoFilters.crop.isActive && (
          <div className="bg-black/50 text-white px-2 py-1 rounded-md flex items-center gap-1">
            <Crop className="w-4 h-4" />
            <span className="text-xs">Cropped</span>
          </div>
        )}
        {videoFilters.trim.isActive && (
          <div className="bg-black/50 text-white px-2 py-1 rounded-md flex items-center gap-1">
            <Scissors className="w-4 h-4" />
            <span className="text-xs">Trimmed</span>
          </div>
        )}
      </div>
    </div>
  );
};
