'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { VideoInput } from '@/components/video/input/VideoInput';
import { VideoWorkspace } from '@/components/video/workspace/VideoWorkspace';
import { useVideo } from '@/context/video-context';
import Spinner from '@/components/Spinner';

const ConversionAnimation = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-12 gap-2"
    >
      <div className="relative">
        <Spinner size={12} />
      </div>
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className="text-gray-600 text-center"
      >
        Processing video...
      </motion.p>
    </motion.div>
  );
};

export default function Home() {
  const { processes: { isConverting }, videoBlob } = useVideo();

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="container mx-auto px-4 xl:px-0">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Make Your GIF</h1>
          <p className="text-gray-600">Record or upload a video and convert it to a GIF in seconds</p>
        </div>

        <AnimatePresence mode="wait">
          {isConverting ? (
            <ConversionAnimation />
          ) : !videoBlob ? (
            <VideoInput />
          ) : (
            <VideoWorkspace />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
