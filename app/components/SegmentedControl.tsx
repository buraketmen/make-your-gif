import { motion } from 'framer-motion';
import { Camera, Upload } from 'lucide-react';

type Mode = 'record' | 'upload';

interface SegmentedControlProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export const SegmentedControl = ({ mode, onChange }: SegmentedControlProps) => {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      <button
        onClick={() => onChange('record')}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          mode === 'record'
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        {mode === 'record' && (
          <motion.div
            layoutId="segmented-highlight"
            className="absolute inset-0 bg-rose-500 rounded-md"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Camera className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Record</span>
      </button>

      <button
        onClick={() => onChange('upload')}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          mode === 'upload'
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        {mode === 'upload' && (
          <motion.div
            layoutId="segmented-highlight"
            className="absolute inset-0 bg-rose-500 rounded-md"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Upload className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Upload</span>
      </button>
    </div>
  );
}; 