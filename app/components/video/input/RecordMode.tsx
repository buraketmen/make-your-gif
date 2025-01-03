'use client';

import { motion } from 'framer-motion';
import { VideoRecorder } from '@/components/video/recorder/VideoRecorder';

export const RecordMode = () => {
  return (
    <motion.div
      key="record-mode"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <VideoRecorder
          
        />
      </div>
    </motion.div>
  );
}; 