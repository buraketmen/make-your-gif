'use client';

import { VideoPreview } from '@/components/editor/VideoPreview';
import { TrimControl } from '@/components/editor/TrimControl';
import { CropControl } from '@/components/editor/CropControl';
import { DrawControl } from '@/components/editor/draw/DrawControl';

export const VideoEditor = () => {
  return (
    <div className="space-y-6">
      <VideoPreview />
      
      <div className="grid grid-cols-1 gap-4">
        <TrimControl />
        <CropControl />
        <DrawControl />
      </div>
    </div>
  );
}; 