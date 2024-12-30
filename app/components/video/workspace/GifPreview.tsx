'use client';

import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';

interface GifPreviewProps {
  isProcessing: boolean;
  gifUrl: string | null;
  onDownload: () => void;
}

export const GifPreview = ({ isProcessing, gifUrl, onDownload }: GifPreviewProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="aspect-video bg-black/5 rounded-xl overflow-hidden">
        {isProcessing ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Processing...</p>
            </div>
          </div>
        ) : gifUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={gifUrl}
              alt="GIF Preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Adjust the video to see the GIF preview
            </p>
          </div>
        )}
      </div>
      
      <div className="w-full flex gap-4 mt-4">
        {gifUrl && (
          <Button
            onClick={onDownload}
            className="w-full bg-rose-500 hover:bg-rose-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Download GIF
          </Button>
        )}
      </div>
    </div>
  );
}; 