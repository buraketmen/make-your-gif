'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { EditorSection } from './EditorSection';
import { GifPreview } from './GifPreview';
import { DrawControl } from '@/components/editor/draw/DrawControl';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideo } from '@/context/video-context';

const RefreshButton = () => {
  const {
    generateGif,
    processes: { isGeneratingGif },
  } = useVideo();
  return (
    <Button
      variant="ghost"
      onClick={() => generateGif()}
      className="gap-2"
      disabled={isGeneratingGif}
    >
      {isGeneratingGif ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCcw className="h-4 w-4" />
      )}
      <span>{isGeneratingGif ? 'Processing...' : 'Refresh'}</span>
    </Button>
  );
};

export function VideoWorkspace() {
  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 gap-6 max-w-[1600px] mx-auto pb-10"
    >
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="col-span-2 lg:col-span-1 min-h-[400px] w-full order-2 lg:order-1"
      >
        <Card className="p-2 md:p-6 shadow-lg border-0 h-full">
          <EditorSection />
        </Card>
      </motion.div>

      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="col-span-2 lg:col-span-1 min-h-[400px] w-full order-1 lg:order-2"
      >
        <Card className="p-2 md:p-6 shadow-lg border-0 h-full">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900 h-[32px]">Preview</h2>
            <RefreshButton />
          </div>

          <GifPreview />
        </Card>
      </motion.div>

      <motion.div
        className="hidden lg:block col-span-2 min-h-[400px] w-full order-3"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <Card className="p-2 md:p-6 shadow-lg border-0 h-full">
          <DrawControl />
        </Card>
      </motion.div>
    </motion.div>
  );
}
