'use client';

import { Button } from '@/components/ui/button';
import { Crop, RotateCcw } from 'lucide-react';
import { useVideo } from '@/context/video-context';

export const CropControl = () => {
  const { processes, videoFilters, setIsCropMode, handleCropVideo, handleResetCrop } = useVideo();

  return (
    <div className="w-full max-h-[600px]">
      <div className="flex items-center justify-end gap-4">
        {videoFilters.crop.isCropMode ? (
          <>
            <Button
              type="button"
              onClick={() => setIsCropMode(false)}
              variant="ghost"
              disabled={processes.isCropping || processes.isFrameExtracting}
            >
              Discard
            </Button>

            <Button
              type="button"
              onClick={handleCropVideo}
              disabled={processes.isCropping || processes.isFrameExtracting}
              className="gap-2"
            >
              <Crop className="h-4 w-4" />
              {processes.isCropping ? 'Cropping...' : 'Apply Crop'}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => setIsCropMode(true)}
              variant="ghost"
              disabled={processes.isCropping || processes.isFrameExtracting}
              className="gap-2"
            >
              <Crop className="h-4 w-4" />
              Crop
            </Button>

            {videoFilters.crop.isActive && (
              <Button
                type="button"
                onClick={handleResetCrop}
                variant="outline"
                disabled={processes.isCropping || processes.isFrameExtracting}
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
