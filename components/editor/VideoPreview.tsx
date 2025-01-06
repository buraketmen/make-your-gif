'use client';

import { useRef, useEffect } from 'react';
import { useVideo } from '@/context/video-context';
import { CropBox } from '@/components/editor/crop/CropBox';
import { Crop, Scissors } from 'lucide-react';

const Video = () => {
  const {
    videoBlob,
    videoFilters: {
      crop: { isCropMode },
    },
    frames,
  } = useVideo();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !videoBlob) return;

    const videoUrl = URL.createObjectURL(videoBlob);
    videoRef.current.src = videoUrl;
    return () => URL.revokeObjectURL(videoUrl);
  }, [videoBlob]);

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