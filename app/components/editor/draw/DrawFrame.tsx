'use client';

import { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Loader2, Undo, Redo } from "lucide-react";
import { useVideo } from '@/context/video-context';
import { useDraw } from '@/context/draw-context';
import { DrawTools } from './DrawTools';
import { DrawClearButton } from './ButtonClear';
import { DrawCopyFromPreviousButton } from './ButtonCopyFromPrevious';

export const DrawFrame = () => {
  const { selectedFrame } = useVideo();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    isSaving,
    currentPoints,
    drawingHistory,
    redoHistory,
    clearAllDrawings,
    undoLastDrawing,
    redoLastDrawing,
    saveDrawing,
    discardDrawing,
    drawFrame,
    startDrawing,
    draw,
    endDrawing
  } = useDraw();

  useEffect(() => {
    clearAllDrawings();
  }, [selectedFrame?.id, clearAllDrawings]);

  useEffect(() => {
    if (selectedFrame !== null && canvasRef.current) {
      drawFrame(selectedFrame, canvasRef.current);
      
      // Add non-passive touch event listeners
      const canvas = canvasRef.current;
      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        startDrawing(e as unknown as React.TouchEvent<HTMLCanvasElement>, canvas);
      };
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        draw(e as unknown as React.TouchEvent<HTMLCanvasElement>, canvas);
      };
      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        endDrawing(e as unknown as React.TouchEvent<HTMLCanvasElement>, canvas);
      };

      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [selectedFrame, currentPoints, drawFrame, draw, startDrawing, endDrawing]);

  useEffect(() => {
    const drawFrame = document.getElementById('draw-frame');
    if (drawFrame) {
      drawFrame.setAttribute('data-has-unsaved', currentPoints.length > 0 ? "true" : "false");
    }
  }, [currentPoints]);

  if (selectedFrame === null) return null;

  return (
    <div id="draw-frame" className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="text-xs md:text-sm font-medium text-gray-600 flex justify-between items-center">
            <span>Frame {selectedFrame.id + 1}</span>
            <div className='flex gap-1 md:gap-2'>
              <Button
                onClick={undoLastDrawing}
                variant="ghost"
                size="sm"
                disabled={drawingHistory.length === 0}
              >
                <Undo className="h-2 w-2 md:h-4 md:w-4" />
              </Button>
              <Button
                onClick={redoLastDrawing}
                variant="ghost"
                size="sm"
                disabled={redoHistory.length === 0}
              >
                <Redo className="h-2 w-2 md:h-4 md:w-4" />
              </Button>
              <DrawCopyFromPreviousButton />
            </div>
          </div>
          <div 
            className="relative bg-black/5 rounded-lg overflow-hidden flex items-center justify-center max-h-[600px] touch-none"
            style={{ 
              aspectRatio: selectedFrame ? `${selectedFrame.width}/${selectedFrame.height}` : '16/9',
              width: '100%',
              maxHeight: 480,
              touchAction: 'none'
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={(e) => startDrawing(e, canvasRef.current!)}
              onMouseMove={(e) => draw(e, canvasRef.current!)}
              onMouseUp={(e) => endDrawing(e, canvasRef.current!)}
              onMouseLeave={(e) => endDrawing(e, canvasRef.current!)}
              className="w-full h-full cursor-crosshair object-contain"
            />
          </div>
        </div>
        <DrawTools />
      </div>
      <div className="flex justify-between gap-2">
        <DrawClearButton />
        <div className="flex gap-2">
          <Button
            onClick={discardDrawing}
            variant="ghost"
            size="sm"
          >
            Discard
          </Button>
          <Button
            onClick={saveDrawing}
            variant="default"
            size="sm"
            className="gap-2"
            disabled={currentPoints.length < 1 || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}; 