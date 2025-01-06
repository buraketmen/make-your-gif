import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { MAX_RECORDING_DURATION, useVideo } from '@/context/video-context';

const MAX_FILE_SIZE = 64 * 1024 * 1024; // 64MB

export const FileDropzone = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleFileSelected } = useVideo();

  const checkVideoDuration = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > MAX_RECORDING_DURATION) {
          resolve(`Video duration should be less than ${MAX_RECORDING_DURATION} seconds.`);
        }
        resolve(null);
      };

      video.onerror = () => {
        resolve('Error loading video metadata.');
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const validateFile = useCallback(async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('video/')) {
      return 'Please select a valid video file.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size should be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    const durationError = await checkVideoDuration(file);
    if (durationError) {
      return durationError;
    }

    return null;
  }, []);

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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError(null);

      const files = Array.from(e.dataTransfer.files);
      const videoFile = files[0];

      if (!videoFile) {
        setError('Please select a file.');
        return;
      }

      const validationError = await validateFile(videoFile);
      if (validationError) {
        console.error('Error validating file.', validationError);
        setError('Error validating file.');
        return;
      }

      handleFileSelected(videoFile);
    },
    [validateFile, handleFileSelected]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = Array.from(e.target.files || []);
      const videoFile = files[0];

      if (!videoFile) {
        setError('Please select a file.');
        return;
      }

      const validationError = await validateFile(videoFile);
      if (validationError) {
        console.error('Error validating file.', validationError);
        setError('Error validating file.');
        return;
      }

      handleFileSelected(videoFile);
    },
    [handleFileSelected, validateFile]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pb-2 pl-2 pr-2 pt-4 rounded-lg bg-white text-center"
    >
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('video-input')?.click()}
        className={`
          mx-auto space-y-6 border-2 border-dashed rounded-lg p-8
          transition-colors duration-200 cursor-pointer
          ${isDragging ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-rose-500'}
          ${error ? 'border-red-500 bg-red-50' : ''}

        `}
      >
        <div className="p-6 bg-rose-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
          <Upload className="w-10 h-10 text-rose-500" />
        </div>
        <div>
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Video</h2>
            <div className="flex flex-col gap-2">
              <p className="text-gray-600 mb-4">
                Drag and drop your video here, or click to select
              </p>
              {error && <p className="text-red-500 mb-4">{error}</p>}
            </div>
          </div>

          <input
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            className="hidden"
            id="video-input"
          />
        </div>
      </div>
    </motion.div>
  );
};
