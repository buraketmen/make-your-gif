'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { VideoInput } from '@/components/video/input/VideoInput';
import { VideoWorkspace } from '@/components/video/workspace/VideoWorkspace';
import { useVideo } from '@/context/video-context';
import {Spinner, SpinnerText} from '@/components/Spinner';
import { TooltipProvider } from '@/components/ui/tooltip';

const ConversionAnimation = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-12 gap-2"
    >
      <div className="relative flex flex-col items-center justify-center gap-2">
        <Spinner size={12} />
        <SpinnerText text="Processing video..." />
      </div>
    </motion.div>
  );
};

export default function Home() {
  const { processes: { isConverting }, videoBlob } = useVideo();

  return (
      <div className="container mx-auto p-2 md:p-4 xl:px-0">
        {!videoBlob && (
          <div className="text-center pb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Make Your GIF</h1>
            <p className="text-gray-600">Record or upload a video and convert it to a GIF in seconds</p>
          </div>
        )}
        
        <TooltipProvider>
            <AnimatePresence mode="wait">
            {isConverting ? (
                <ConversionAnimation />
            ) : !videoBlob ? (
                <VideoInput />
            ) : (
                <VideoWorkspace />
            )}
            </AnimatePresence>
        </TooltipProvider>
      </div>
  );
}
