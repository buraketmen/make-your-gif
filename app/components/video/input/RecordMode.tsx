'use client';

import { motion } from 'framer-motion';
import { VideoRecorder } from '@/components/video/recorder/VideoRecorder';
import { useVideo } from '@/context/video-context';

export const RecordMode = () => {
    const { deviceId } = useVideo();

  return (
    <motion.div

      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="aspect-video  rounded-xl overflow-hidden ">
        <VideoRecorder key={deviceId} device={deviceId} />
      </div>
    </motion.div>
  );
}; 