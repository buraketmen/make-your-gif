'use client';

import { VideoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { CameraSelector } from './CameraSelector';

interface CameraErrorProps {
  errorMessage: string;
  onRetry: () => void;
} 

export const CameraError = ({ errorMessage, onRetry }: CameraErrorProps) => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-4">
        <div className="mb-4">
          <VideoIcon className="w-12 h-12 text-rose-500 mx-auto" />
        </div>
        <p className="text-sm text-red-500 mb-4">{errorMessage}</p>
        <div className="flex items-center justify-center gap-4">   
          
          
          <CameraSelector isController={false} />
          <Button
            onClick={onRetry}
        >
          Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}; 