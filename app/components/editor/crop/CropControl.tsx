'use client';

import { Button } from "@/components/ui/button";
import { Crop, RotateCcw } from 'lucide-react';
import { useVideo } from '@/context/video-context';

export const CropControl = () => {
  const {
    processes,
    videoFilters,
    setIsCropMode,
    handleCropVideo,
    handleResetCrop,
    
  } = useVideo();

  return (
    <div className="w-full max-h-[600px]">
      <div className="flex items-center justify-end gap-4">
        {videoFilters.crop.isCropMode ? (
          <>
            <Button
              onClick={() => setIsCropMode(false)}
              variant="ghost"
            >
              Discard
            </Button>

            <Button
              onClick={handleCropVideo}
              disabled={processes.isCropping}
              className="gap-2"
            >
              <Crop className="h-4 w-4" />
              {processes.isCropping ? 'Cropping...' : 'Apply Crop'}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setIsCropMode(true)}
              variant="ghost"
              className="gap-2"
            >
              <Crop className="h-4 w-4" />
              Crop
            </Button>

            {videoFilters.crop.isActive && (
              <Button
                onClick={handleResetCrop}
                variant="outline"
                className="text-rose-500 hover:text-rose-600 gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Crop
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 