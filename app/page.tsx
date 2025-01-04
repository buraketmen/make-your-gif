'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { VideoInput } from '@/components/video/input/VideoInput';
import { VideoWorkspace } from '@/components/video/workspace/VideoWorkspace';
import { useVideo } from '@/context/video-context';
import { Spinner, SpinnerText } from '@/components/Spinner';
import { TooltipProvider } from '@/components/ui/tooltip';

const ConversionAnimation = () => {
  const { videoProgress } = useVideo();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-12 gap-2"
    >
      <div className="relative flex flex-col items-center justify-center gap-2">
        <Spinner size={12} />
        <SpinnerText text={`Processing video... ${videoProgress}%`} />
      </div>
    </motion.div>
  );
};

export default function Home() {
  const {
    processes: { isConverting },
    blobIds,
  } = useVideo();

  const hasVideo = Boolean(blobIds.currentVideo);

  return (
    <div className="container mx-auto p-2 md:p-4 xl:px-0">
      {!hasVideo && (
        <div className="text-center pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Make Your GIF</h1>
          <p className="text-gray-600">
            Record or upload a video and convert it to a GIF in seconds
          </p>
        </div>
      )}
      {!hasVideo && (
        <a
          href="https://github.com/buraketmen/make-your-gif"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2  text-gray-400 hover:text-gray-300 transition-colors"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="black">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </motion.div>
        </a>
      )}

      <TooltipProvider>
        <AnimatePresence mode="wait">
          {isConverting ? <ConversionAnimation /> : !hasVideo ? <VideoInput /> : <VideoWorkspace />}
        </AnimatePresence>
      </TooltipProvider>
    </div>
  );
}
