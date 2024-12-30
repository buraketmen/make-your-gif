'use client';

import { memo, useEffect, useRef } from 'react';
import { DrawingFrame } from '@/types/draw';
import { drawFrameToCanvas } from '@/lib/utils';
import { useVideo } from '@/context/video-context';

interface FrameProps {
  frame: DrawingFrame;
  index: number;
}

const Frame = ({ frame, index }: FrameProps) => {
  const { selectedFrame, setSelectedFrame } = useVideo();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawFrameToCanvas(frame, canvasRef.current);
    }
  }, [frame]);

  return (
    <div
      className={`relative cursor-pointer border-2 ${
        selectedFrame ? 'border-blue-500' : 'border-transparent'
      }`}
      onClick={() => setSelectedFrame(frame)}
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

const FrameGrid = () => {
    const { frames } = useVideo();
  return (
    <div className="grid grid-cols-4 gap-4">
      {frames.map((frame, index) => (
        <Frame key={index} frame={frame} index={index} />
      ))}
    </div>
  );
};

export default memo(FrameGrid);
