'use client';

import { VideoPreview } from './editor/VideoPreview';
import { TrimControl } from './editor/TrimControl';
import { CropControl } from './editor/CropControl';

export const VideoEditor = () => {
  return (
    <div className="space-y-6">
      <VideoPreview />
      
      <div className="grid grid-cols-1 gap-4">
        <TrimControl />
        <CropControl />

      </div>
    </div>
  );
}; 