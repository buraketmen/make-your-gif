'use client';

import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Video, StopCircle, FlipHorizontal, RotateCwSquareIcon } from 'lucide-react';
import { useVideo } from "@/context/video-context";
import { CameraSelector } from './CameraSelector';

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
  const { isMirrored, setIsMirrored, isLandscape, setIsLandscape } = useVideo();

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute left-4 bottom-4 flex gap-2"
      >
        <CameraSelector isController={true} />

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-rose-700/25 backdrop-blur-sm border-rose-500/25 hover:bg-rose-700 hover:border-rose-500"
          onClick={() => setIsMirrored(!isMirrored)}
          disabled={isRecording}
        >
          <FlipHorizontal className="h-4 w-4 text-white/80 hover:text-white" />
        </Button>

        {/*<Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-rose-700/25 backdrop-blur-sm border-rose-500/25 hover:bg-rose-700 hover:border-rose-500"
          onClick={() => setIsLandscape(!isLandscape)}
          disabled={isRecording}
        >
          <RotateCwSquareIcon className={`h-4 w-4 text-white/80 hover:text-white ${isLandscape ? 'rotate-90' : ''}`} />
        </Button> */}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
      >
        <div className="p-2 rounded-full bg-black/50 backdrop-blur-sm">
          {!isRecording ? (
            <Button
              type="button"
              onClick={onStartRecording}
              variant="default"
              className="bg-rose-500 hover:bg-rose-600 rounded-full py-2 md:py-3 px-6 md:px-8"
            >
              <Video className="!h-4 !w-4 md:!h-5 md:!w-5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onStopRecording}
              variant="destructive"
              className="rounded-full py-2 md:py-3 px-6 md:px-8"
            >
              <StopCircle className="!h-5 !w-5 animate-pulse" />
            </Button>
          )}
        </div>
      </motion.div>
    </>
  );
}; 