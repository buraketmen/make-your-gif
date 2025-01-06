'use client';

import { memo, useEffect, useRef, forwardRef, useState } from 'react';
import { DrawingFrame } from '@/types/draw';
import { drawFrameToCanvas } from '@/lib/utils';
import { useVideo } from '@/context/video-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner, SpinnerText } from '@/components/Spinner';
import { Settings2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FrameProps {
  frame: DrawingFrame;
  onFrameSelect: (frame: DrawingFrame) => void;
}

const FrameSpinnerText = () => {
  const { frameProgress } = useVideo();
  return (
    <SpinnerText
      text={`Extracting frames... ${frameProgress.current}/${frameProgress.total ?? 1}`}
    />
  );
};

const FrameSpinner = () => {
  return (
    <div className="col-span-full h-[280px] w-full flex flex-col items-center justify-center gap-2">
      <Spinner size={12} />
      <FrameSpinnerText />
    </div>
  );
};

const Frame = forwardRef<HTMLDivElement, FrameProps>(({ frame, onFrameSelect }, ref) => {
  const { selectedFrame } = useVideo();
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
      className="relative cursor-pointer rounded-[4px] overflow-hidden"
      onClick={() => onFrameSelect(frame)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-[4px]"
        style={{ aspectRatio: frame.width / frame.height }}
      />
      <div
        className={`absolute inset-0 rounded-[4px] transition-colors duration-200 ${
          selectedFrame?.id === frame.id ? 'bg-rose-500/50' : 'bg-black/10 hover:bg-black/0'
        }`}
      />
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
  const {
    frames,
    processes: { isFrameExtracting },
    selectedFrame,
    setSelectedFrame,
  } = useVideo();
  const [showWarning, setShowWarning] = useState(false);
  const [pendingFrame, setPendingFrame] = useState<DrawingFrame | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest('.overflow-y-auto');
      if (!container) return;

      const isAtBottom =
        Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 1;
      if (isAtBottom) {
        e.preventDefault();
      }
    };

    grid.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      grid.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleFrameSelect = (frame: DrawingFrame) => {
    if (frame.id === selectedFrame?.id) return;

    const drawFrameElement = document.getElementById('draw-frame');
    const hasUnsavedDrawings = drawFrameElement?.getAttribute('data-has-unsaved') === 'true';

    if (hasUnsavedDrawings) {
      setPendingFrame(frame);
      setShowWarning(true);
    } else {
      setSelectedFrame(frame);
    }
  };

  const handleConfirmChange = () => {
    if (pendingFrame) {
      setSelectedFrame(pendingFrame);
      setPendingFrame(null);
    }
    setShowWarning(false);
  };

  const handleCancelChange = () => {
    setPendingFrame(null);
    setShowWarning(false);
  };

  const frameGridClass = selectedFrame
    ? 'max-h-[320px] grid grid-rows-1 h-max-[120px] md:h-max-auto md:grid-rows-none auto-cols-[120px] md:auto-cols-none grid-flow-col md:grid-flow-dense md:grid-cols-1 lg:grid-cols-4 xl:grid-cols-6 gap-2 md:gap-4 overflow-x-auto md:overflow-y-auto xl:max-h-[440px]'
    : 'max-h-[320px] grid grid-rows-1 md:grid-rows-none auto-cols-[120px] md:auto-cols-none grid-flow-col md:grid-flow-dense md:grid-cols-4 lg:grid-cols-8 xl:grid-cols-12 gap-2 md:gap-4 overflow-x-auto md:overflow-y-auto';

  if (isFrameExtracting) {
    return <FrameSpinner />;
  }

  return (
    <>
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved drawings on the current frame. If you switch frames now, your changes
              will be lost. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChange}
              className="bg-rose-500 hover:bg-rose-600"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <motion.div
        ref={gridRef}
        layout
        className={frameGridClass}
        transition={{
          layout: { duration: 0.2 },
          type: 'spring',
          stiffness: 200,
          damping: 25,
        }}
      >
        <AnimatePresence mode="popLayout">
          {frames.map((frame) => (
            <Frame key={frame.id} frame={frame} onFrameSelect={handleFrameSelect} />
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default memo(FrameGrid);
