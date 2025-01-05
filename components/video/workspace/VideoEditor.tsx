'use client';

import { VideoPreview } from '@/components/editor/VideoPreview';
import { TrimControl } from '@/components/editor/TrimControl';
import { CropControl } from '@/components/editor/crop/CropControl';
import { DrawControl } from '@/components/editor/draw/DrawControl';

export const VideoEditor = () => {
  return (
    <div className="space-y-4">
      <VideoPreview />
      
      <div className="grid grid-cols-1 gap-4">
        <CropControl />
        <TrimControl />
        <div className='block lg:hidden'>
          <DrawControl />
        </div>
        
      </div>
    </div>
  );
}; 