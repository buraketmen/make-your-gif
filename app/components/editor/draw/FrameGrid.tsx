'use client';

import { useEffect, useRef } from 'react';
import { DrawingFrame } from './types';
import { drawFrameToCanvas } from './utils';

interface FrameGridProps {
  frame: DrawingFrame;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

export const FrameGrid = ({ frame, index, isSelected, onSelect }: FrameGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawFrameToCanvas(frame, canvasRef.current);
    }
  }, [frame]);

  return (
    <div
      className={`relative cursor-pointer border-2 ${
        isSelected ? 'border-blue-500' : 'border-transparent'
      }`}
      onClick={() => onSelect(index)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ aspectRatio: frame.width / frame.height }}
      />
      <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-tl">
        {index + 1}
      </div>
    </div>
  );
}; 