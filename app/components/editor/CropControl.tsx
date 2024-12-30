'use client';

import { Button } from "../ui/button";
import { Crop, RotateCcw } from 'lucide-react';
import { useVideo } from '@/context/video-context';
import { CropBox } from '../CropBox';

export const CropControl = () => {
  const {
    isCropMode,
    setIsCropMode,
    croppedVideoUrl,
    handleCropVideo,
    handleResetCrop,
    isProcessing,
    setCrop,
    videoBlob
  } = useVideo();

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white/50">
      <div className="flex justify-between text-sm font-medium">
        <span>Crop Video</span>
      </div>

      <div className="flex gap-4">
        {isCropMode ? (
          <>
            <Button
              onClick={() => setIsCropMode(false)}
              variant="outline"
              className="text-gray-600"
            >
              Discard
            </Button>

            <Button
              onClick={handleCropVideo}
              disabled={isProcessing}
              className="bg-rose-500 hover:bg-rose-600"
            >
              <Crop className="mr-2 h-4 w-4" />
              {isProcessing ? 'Cropping...' : 'Apply Crop'}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setIsCropMode(true)}
              variant="outline"
            >
              <Crop className="mr-2 h-4 w-4" />
              Crop Video
            </Button>

            {croppedVideoUrl && (
              <Button
                onClick={handleResetCrop}
                variant="outline"
                className="text-yellow-600"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Crop
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 