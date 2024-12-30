'use client';

import { motion } from 'framer-motion';
import { VideoRecorder } from '@/components/video/recorder/VideoRecorder';

interface RecordModeProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  isRecording: boolean;
  onStopRecording: () => void;
  onStartRecording: () => void;
}

export const RecordMode = ({
  onRecordingComplete,
  isRecording,
  onStopRecording,
  onStartRecording
}: RecordModeProps) => {
  return (
    <motion.div
      key="record-mode"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <VideoRecorder
          onRecordingComplete={onRecordingComplete}
          isRecording={isRecording}
          onStopRecording={onStopRecording}
          onStartRecording={onStartRecording}
        />
      </div>
    </motion.div>
  );
}; 