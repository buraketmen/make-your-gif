'use client';

import { motion } from 'framer-motion';
import { VideoEditor } from './VideoEditor';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVideo } from '@/context/video-context';
import { Download } from 'lucide-react';
import Image from 'next/image';

export function VideoWorkspace() {
  const {
    mode,
    handleBack,
    gifUrl,
    isProcessing,
    handleDownloadGif
  } = useVideo();

  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1400px] mx-auto"
    >
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="min-h-[600px] w-full"
      >
        <Card className="p-8 shadow-lg border-0 h-full">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Editor</h2>
            <Button
              onClick={handleBack}
              variant="outline"
              size="sm"
              className="text-rose-500 hover:text-rose-600"
            >
              Back to {mode === 'record' ? 'Recording' : 'Upload'}
            </Button>
          </div>
          
          <VideoEditor />
        </Card>
      </motion.div>

      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="min-h-[600px] w-full"
      >
        <Card className="p-8 shadow-lg border-0 h-full">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900 h-[32px]">Preview</h2>
          </div>

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
            onClick={handleDownloadGif}
            className="w-full bg-rose-500 hover:bg-rose-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Download GIF
          </Button>
        )}
          </div>
          
        </Card>
      </motion.div>
    </motion.div>
  );
} 