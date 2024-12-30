'use client';

import { AnimatePresence } from 'framer-motion';
import { VideoInput } from './components/VideoInput';
import { VideoWorkspace } from './components/VideoWorkspace';
import { useVideo } from '@/context/video-context';

export default function Home() {
  const { videoBlob } = useVideo();

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="container mx-auto px-4 xl:px-0">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Make Your GIF</h1>
          <p className="text-gray-600">Record or upload a video and convert it to a GIF in seconds</p>
        </div>

        <AnimatePresence mode="wait">
          {!videoBlob ? <VideoInput /> : <VideoWorkspace />}
        </AnimatePresence>
      </div>
    </main>
  );
}
