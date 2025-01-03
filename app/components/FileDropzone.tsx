import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
}

export const FileDropzone = ({ onFileSelected }: FileDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      onFileSelected(videoFile);
    }
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      onFileSelected(videoFile);
    }
  }, [onFileSelected]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 rounded-lg bg-white shadow-lg text-center"
    >
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          max-w-md mx-auto space-y-6 border-2 border-dashed rounded-lg p-8
          transition-colors duration-200
          ${isDragging ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-rose-500'}
        `}
      >
        <div className="p-6 bg-rose-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
          <Upload className="w-10 h-10 text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Video</h2>
          <p className="text-gray-600 mb-4">
            Drag and drop your video here, or click to select
          </p>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            className="hidden"
            id="video-input"
          />
          <Button
            onClick={() => document.getElementById('video-input')?.click()}
            variant="outline"
            className="text-rose-500 hover:text-rose-600"
          >
            Select Video
          </Button>
        </div>
      </div>
    </motion.div>
  );
}; 