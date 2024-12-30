'use client';

import { Camera } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { CameraErrorProps } from './types';

export const CameraError = ({ errorMessage, onRetry }: CameraErrorProps) => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-4">
        <div className="mb-4">
          <Camera className="w-12 h-12 text-rose-500 mx-auto" />
        </div>
        <p className="text-sm text-red-500 mb-4">{errorMessage}</p>
        <Button
          onClick={onRetry}
          variant="outline"
          className="text-rose-500 hover:text-rose-600"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}; 