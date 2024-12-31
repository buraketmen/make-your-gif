'use client';

import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import { useVideo } from '@/context/video-context';

export const UploadMode = () => {
    const { handleFileSelected } = useVideo();
  return (
    <motion.div
      key="upload-mode"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="aspect-video bg-black/5 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200"
    >
      <div className="text-center p-8">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelected}
          className="hidden"
          id="video-input"
        />
        <Button
          onClick={() => document.getElementById('video-input')?.click()}
          variant="outline"
          size="lg"
          className="bg-white hover:bg-gray-50 shadow-sm"
        >
          <Upload className="w-5 h-5 mr-2 text-rose-500" />
          Select Video
        </Button>
        <p className="mt-4 text-sm text-gray-500">
          Select or drag and drop a video file
        </p>
      </div>
    </motion.div>
  );
}; 