'use client';

import { useRef, useEffect } from 'react';
import { useVideo } from '@/context/video-context';
import { CropBox } from '@/components/editor/crop/CropBox';
import { Crop, Scissors } from 'lucide-react';

export const VideoPreview = () => {
  const {
    videoBlob,
    videoFilters,
  } = useVideo();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !videoBlob) return;

    const videoUrl = URL.createObjectURL(videoBlob);
    videoRef.current.src = videoUrl;

    // Generate poster image
    const video = videoRef.current;
    video.currentTime = 0;
    video.addEventListener('loadeddata', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      video.poster = canvas.toDataURL();
    });

    return () => URL.revokeObjectURL(videoUrl);
  }, [videoBlob]);

  return (
    <div className="aspect-video w-full max-h-[600px] rounded-lg overflow-hidden bg-gray-100 relative flex items-center justify-center">
      <video
        ref={videoRef}
        controls={!videoFilters.crop.isCropMode}
        className="w-full h-full object-contain"
        playsInline
        preload="auto"
        style={{
          maxHeight: '100%',
          maxWidth: '100%'
        }}
      />
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