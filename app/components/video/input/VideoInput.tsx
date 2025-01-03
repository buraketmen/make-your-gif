'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { useVideo } from '@/context/video-context';
import { SegmentedControl } from '@/components/SegmentedControl';
import { RecordMode } from './RecordMode';
import { FileDropzone } from './FileDropzone';

export function VideoInput() {
  const {
    isRecording,
    mode,
    setMode,
  } = useVideo();

  return (
    <motion.div
      key="recorder"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="max-w-4xl mx-auto"
    >
      <Card className="p-2 md:p-6 shadow-lg border-0">
        <div className="mb-6 flex justify-center">
          <SegmentedControl mode={mode} onChange={setMode} disabled={isRecording} />
        </div>

        <AnimatePresence mode="wait">
          {mode === 'record' ? (
            <RecordMode />
          ) : (
            <FileDropzone />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
} 