'use client';

import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Video, StopCircle } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const RecordingControls = ({ 
  isRecording, 
  onStartRecording, 
  onStopRecording,
}: RecordingControlsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
    >
      <div className="p-2 rounded-full bg-black/50 backdrop-blur-sm">
        {!isRecording ? (
          <Button
            onClick={onStartRecording}
            variant="default"
            size="lg"
            className="bg-rose-500 hover:bg-rose-600 rounded-full"
          >
            <Video className="h-8 w-8" />
          </Button>
        ) : (
          <Button
            onClick={onStopRecording}
            variant="destructive"
            size="lg"
            className="rounded-full"
          >
            <StopCircle className="h-8 w-8" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}; 