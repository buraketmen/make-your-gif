'use client';

import { memo, useEffect, useRef, forwardRef } from 'react';
import { DrawingFrame } from '@/types/draw';
import { drawFrameToCanvas } from '@/lib/utils';
import { useVideo } from '@/context/video-context';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from '@/components/Spinner';
import { Pencil, Settings2Icon } from 'lucide-react';

interface FrameProps {
  frame: DrawingFrame;
}

const Frame = forwardRef<HTMLDivElement, FrameProps>(({ frame }, ref) => {
  const { selectedFrame, setSelectedFrame } = useVideo();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawFrameToCanvas(frame, canvasRef.current);
    }
  }, [frame]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className="relative cursor-pointer rounded-[4px]"
      onClick={() => setSelectedFrame(frame)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-[4px]"
        style={{ aspectRatio: frame.width / frame.height }}
      />
      <div className={`absolute inset-0 rounded-[4px] transition-colors duration-200 ${
        selectedFrame?.id === frame.id ? 'bg-rose-500/50' : 'bg-black/10 hover:bg-black/0'
      }`} />
      {frame.drawings.length > 0 && (
        <div className="absolute top-0.5 left-0.5 ">
            <div className="bg-black/50 text-white px-1 py-1 rounded-sm flex items-center gap-1">
                <Settings2Icon className="w-3 h-3 text-gray-200" />
                <span className="text-xs text-gray-200">Edited</span>
            </div>
      </div>
        
      )}
      <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-tl-[4px] rounded-br-[4px]">
        {frame.id + 1}
      </div>
    </motion.div>
  );
}); 

Frame.displayName = 'Frame';

const FrameGrid = () => {
  const { frames, processes: { isFrameExtracting }, selectedFrame } = useVideo();

  const frameGridClass = selectedFrame 
    ? 'max-h-[280px] grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-6 gap-4 overflow-y-auto xl:max-h-[440px]' 
    : 'max-h-[320px] grid grid-cols-4 lg:grid-cols-8 xl:grid-cols-12 gap-4 overflow-y-auto';

    const spinnerClass = selectedFrame 
    ? 'h-[280px] grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-6 gap-4 xl:h-[440px]' 
    : 'h-[280px] grid grid-cols-4 lg:grid-cols-8 xl:grid-cols-12 gap-4';

  if (isFrameExtracting) {
    return <div className={spinnerClass}>
      <div className="col-span-full h-full min-h-[280px] flex flex-col items-center justify-center gap-2">
        <Spinner size={12} />
        <p className="text-sm text-gray-500">Extracting frames..</p>
      </div>
    </div>
  }
  return (
    <motion.div 
      layout
      className={frameGridClass}
      transition={{ 
        layout: { duration: 0.2 },
        type: "spring",
        stiffness: 200,
        damping: 25
      }}
    >
      <AnimatePresence mode="popLayout">
        {frames.map((frame) => (
          <Frame key={frame.id} frame={frame} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default memo(FrameGrid);