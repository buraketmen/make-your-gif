'use client';

import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { useVideo } from '@/context/video-context';
import Spinner from '@/components/Spinner';
import SizeControl from '@/components/editor/gif/SizeControl';

export const GifPreview = () => {
    const { gifUrl, processes, handleDownloadGif } = useVideo();

    const getInformationText = () => {
        if (gifUrl) {
            return "GIF preview";
        } else if (processes.isCropping) {
            return "Cropping...";
        } else if (processes.isFrameExtracting) {
            return "Extracting frames...";
        } else if (processes.isTrimming) {
            return "Trimming...";
        } else {
            return "Processing...";
        }
    }
  return (
    <div className="flex flex-col h-full">
      <div className="aspect-video bg-black/5 rounded-xl overflow-hidden">
        {processes.isGeneratingGif ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center flex flex-col items-center justify-center gap-2">
              <Spinner size={12} />
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
                {getInformationText()}
            </p>
          </div>
        )}
      </div>
      
      {gifUrl && (
        <div className="space-y-4 mt-4">
          <SizeControl />
          <Button
            onClick={handleDownloadGif}
            disabled={processes.isGeneratingGif || processes.isCropping || processes.isFrameExtracting}
            className="w-full bg-rose-500 hover:bg-rose-600 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Download GIF
          </Button>
        </div>
      )}
    </div>
  );
}; 