'use client';

import { motion } from 'framer-motion';
import { RecordingProgressProps } from './types';

export const RecordingProgress = ({ recordingTime, maxRecordingDuration }: RecordingProgressProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-4 right-4 flex flex-col items-end gap-2"
    >
      <div className="relative w-48 h-1.5 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm">
        <motion.div 
          className="absolute left-0 top-0 h-full bg-rose-500"
          initial={{ width: "0%" }}
          animate={{ width: `${(recordingTime / maxRecordingDuration) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-sm text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
        {recordingTime}s / {maxRecordingDuration}s
      </p>
    </motion.div>
  );
}; 