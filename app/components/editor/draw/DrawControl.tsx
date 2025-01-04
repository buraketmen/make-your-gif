import { useVideo } from '@/context/video-context';
import FrameGrid from '@/components/editor/FrameGrid';
import { DrawFrame } from './DrawFrame';
import { motion, AnimatePresence } from 'framer-motion';

export const DrawControl = () => {
  const { selectedFrame } = useVideo();

  const frameGridClass = selectedFrame ? 'row-span-1 md:col-span-2 lg:col-span-6' : 'col-span-12';

  const springConfig = {
    type: "spring",
    duration: 0.2,
    stiffness: 300,
    damping: 30
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm font-medium">
        <span className="text-gray-600">Draw on Frames</span>
      </div>
      <motion.div 
        layout="position"
        className="grid grid-cols-1 md:grid-cols-12 gap-4"
        transition={springConfig}
      >
        <motion.div
          layout="position"
          key="grid"
          className={frameGridClass}
          transition={springConfig}
        >
          <FrameGrid />
        </motion.div>

        <AnimatePresence initial={false} mode="sync">
          {selectedFrame && (
            <motion.div
              layout="position"
              initial={{ opacity: 1, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="row-span-1 md:col-span-10 lg:col-span-6"
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            >
              <DrawFrame />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}; 