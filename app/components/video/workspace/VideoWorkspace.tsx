'use client';

import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { EditorSection } from './EditorSection';
import { GifPreview } from './GifPreview';

export function VideoWorkspace() {
  return (
    <motion.div
      key="editor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1400px] mx-auto"
    >
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="min-h-[600px] w-full"
      >
        <Card className="p-8 shadow-lg border-0 h-full">
          <EditorSection  />
        </Card>
      </motion.div>

      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="min-h-[600px] w-full"
      >
        <Card className="p-8 shadow-lg border-0 h-full">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900 h-[32px]">Preview</h2>
          </div>

          <GifPreview
          />
        </Card>
      </motion.div>
    </motion.div>
  );
} 