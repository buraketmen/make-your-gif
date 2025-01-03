'use client';

import { motion } from 'framer-motion';

interface RecordingIndicatorProps {
  isRecording: boolean;
}

export const RecordingIndicator = ({ isRecording }: RecordingIndicatorProps) => {
  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-2 md:top-4 left-2 md:left-4 flex items-center gap-2 bg-black/50 px-2 md:px-3 py-1 md:py-1.5 rounded-full backdrop-blur-sm"
    >
      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      <span className="text-white text-xs md:text-sm font-normal md:font-medium">Recording</span>
    </motion.div>
  );
}; 