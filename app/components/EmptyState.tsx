import { motion } from 'framer-motion';
import { Camera, Upload, Wand2 } from 'lucide-react';
import { Card, CardContent } from "./ui/card";

const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  hover: { scale: 1.1 }
};

export const EmptyState = () => {
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="p-2 md:p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <motion.div
            className="relative w-24 h-24"
            initial="initial"
            animate="animate"
            whileHover="hover"
          >
            {/* Animated circle background */}
            <motion.div
              className="absolute inset-0 bg-rose-50 rounded-full"
              initial={{ scale: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Icons */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              variants={iconVariants}
              transition={{ delay: 0.1 }}
            >
              <Camera className="w-8 h-8 text-rose-500" />
            </motion.div>
            
            <motion.div
              className="absolute inset-0 flex items-center justify-start"
              variants={iconVariants}
              transition={{ delay: 0.2 }}
            >
              <Upload className="w-8 h-8 text-rose-400" />
            </motion.div>
            
            <motion.div
              className="absolute inset-0 flex items-center justify-end"
              variants={iconVariants}
              transition={{ delay: 0.3 }}
            >
              <Wand2 className="w-8 h-8 text-rose-300" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No Video Selected
            </h3>
            <p className="text-sm text-gray-500">
              Record from your camera or upload a video to create a GIF
            </p>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}; 