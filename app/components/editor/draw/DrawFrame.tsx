'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Check, Loader2 } from 'lucide-react';
import { useVideo } from '@/context/video-context';
import { Point, Drawing, DrawingFrame } from '@/types/draw';
import { drawPath } from '@/lib/utils';
import { DrawTools } from './DrawTools';


export const DrawFrame = () => {
  const { frames, setFrames, selectedFrame, setSelectedFrame } = useVideo();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [penSize, setPenSize] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || selectedFrame === null) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);

    // Start new path
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || selectedFrame === null) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCurrentPoints(prev => [...prev, { x, y }]);
    
    // Draw the line segment directly
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing || selectedFrame === null) return;
    setIsDrawing(false);
  };

  const saveDrawing = () => {
    if (selectedFrame === null || currentPoints.length < 2) return;
        setIsSaving(true);
    setFrames((prev: DrawingFrame[]) => {
      const newFrames = [...prev];
      const currentDrawing: Drawing = {
        points: [...currentPoints],
        color: currentColor,
        penSize: penSize
      };
      
      // Find the index of the frame we want to update
      const frameIndex = newFrames.findIndex((frame) => frame.id === selectedFrame.id);
      if (frameIndex !== -1) {
        // Update the frame at the found index
        newFrames[frameIndex] = {
          ...selectedFrame,
          drawings: [...selectedFrame.drawings, currentDrawing]
        };
      }
      return newFrames;
    });
    setIsSaving(false);
    discardDrawing();
  };

  const discardDrawing = () => {
    setCurrentPoints([]);
    setSelectedFrame(null);
  };

  const clearDrawings = () => {
    if (selectedFrame === null) return;
    
    setFrames((prev: DrawingFrame[]) => {
      const newFrames = [...prev];
      const frameIndex = newFrames.findIndex((frame) => frame.id === selectedFrame.id);
      if (frameIndex !== -1) {
        newFrames[frameIndex] = {
          ...selectedFrame,
          drawings: []
        };
      }
      return newFrames;
    });
    discardDrawing();
  };

  const drawFrame = (frame: DrawingFrame) => {
    const frameIndex = frames.findIndex((f) => f.id === frame.id);
    
    if (!canvasRef.current || frameIndex === -1) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = document.createElement('img');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw previous frame's drawings with reduced opacity
      if (frameIndex > 0) {
        ctx.globalAlpha = 0.3;
        frames[frameIndex-1].drawings.forEach(drawing => {
            drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
        });
        ctx.globalAlpha = 1;
      }

      // Draw current frame's drawings
      frame.drawings.forEach(drawing => {
        drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
      });

      // Draw current temp drawing if exists
      if (currentPoints.length > 0) {
        drawPath(ctx, currentPoints, currentColor, penSize);
      }
    };

    img.src = frames[frameIndex].imageData;
  };


  useEffect(() => {
    if (selectedFrame !== null) {
      drawFrame(selectedFrame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrame, currentPoints]);

  if (selectedFrame === null) return null;
  return (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="text-sm font-medium text-gray-600">
                Frame {selectedFrame.id + 1}
              </div>
              <div className="relative aspect-video bg-black/5 rounded-lg overflow-hidden flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  className="w-full h-full cursor-crosshair"
                />
              </div>
            </div>
           <DrawTools currentColor={currentColor} setCurrentColor={setCurrentColor} penSize={penSize} setPenSize={setPenSize} />
          </div>
          <div className="flex justify-between gap-2">
            <Button
              onClick={clearDrawings}
              variant="outline"
              size="sm"
              className="text-orange-600 gap-2"
              disabled={selectedFrame.drawings.length === 0}
            >
              <X className="h-4 w-4 " />
              Clear
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={discardDrawing}
                variant="outline"
                size="sm"
                className="text-gray-600"
              >
                Discard
              </Button>
              <Button
                onClick={saveDrawing}
                variant="default"
                size="sm"
                className="bg-rose-500 hover:bg-rose-600 gap-2"
                disabled={currentPoints.length < 2 || isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      
  );
}; 