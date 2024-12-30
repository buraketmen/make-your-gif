'use client';

import { useRef, useEffect } from 'react';
import { useVideo } from '@/context/video-context';
import { CropBox } from '../CropBox';

export const VideoPreview = () => {
  const {
    videoBlob,
    croppedVideoUrl,
    isCropMode,
    setCrop
  } = useVideo();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (croppedVideoUrl) {
      videoRef.current.src = croppedVideoUrl;
    } else if (videoBlob) {
      const videoUrl = URL.createObjectURL(videoBlob);
      videoRef.current.src = videoUrl;
      return () => URL.revokeObjectURL(videoUrl);
    }
  }, [videoBlob, croppedVideoUrl]);

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-gray-100 relative">
      <video
        ref={videoRef}
        controls={!isCropMode}
        className="w-full h-full object-contain"
      />
      {isCropMode && (
        <div className="absolute inset-0">
          <CropBox onChange={setCrop} />
        </div>
      )}
    </div>
  );
}; 