'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Check, Loader2, Undo, Redo, EraserIcon } from 'lucide-react';
import { useVideo } from '@/context/video-context';
import { Drawing, DrawingFrame } from '@/types/draw';
import { drawPath } from '@/lib/utils';
import { DrawTools } from './DrawTools';


export const DrawFrame = () => {
  const { frames, setFrames, selectedFrame, setSelectedFrame } = useVideo();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [currentPoints, setCurrentPoints] = useState<Drawing[]>([]);
  const [drawingHistory, setDrawingHistory] = useState<Drawing[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Drawing[][]>([]);
  const [penSize, setPenSize] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clearAll = () => {
    setDrawingHistory([]);
    setRedoHistory([]);
    setCurrentPoints([]);
  }

  // Reset history when frame changes
  useEffect(() => {
    clearAll();
  }, [selectedFrame?.id]);

  const undoLastDrawing = () => {
    if (drawingHistory.length === 0) return;
    
    const newHistory = [...drawingHistory];
    const lastDrawing = newHistory.pop();
    setDrawingHistory(newHistory);
    
    if (lastDrawing) {
      setRedoHistory(prev => [...prev, lastDrawing]);
      setCurrentPoints(prev => prev.slice(0, -1));
    }
  };

  const redoLastDrawing = () => {
    if (redoHistory.length === 0) return;

    const newRedoHistory = [...redoHistory];
    const nextDrawing = newRedoHistory.pop();
    setRedoHistory(newRedoHistory);

    if (nextDrawing) {
      setDrawingHistory(prev => [...prev, nextDrawing]);
      setCurrentPoints(prev => [...prev, ...nextDrawing]);
    }
  };

  // Handle drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || selectedFrame === null) return;
    
    setRedoHistory([]); // Clear redo history on new drawing
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    setCurrentPoints(prev => [...prev, {
      points: [{ x, y }],
      color: currentColor,
      penSize: penSize
    }]);

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
    if (!isDrawing || !canvasRef.current || selectedFrame === null || currentPoints.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCurrentPoints(prev => {
      const newPoints = [...prev];
      const currentDrawing = newPoints[newPoints.length - 1];
      currentDrawing.points = [...currentDrawing.points, { x, y }];
      return newPoints;
    });
    
    // Draw the line segment directly
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing || selectedFrame === null) return;
    setIsDrawing(false);
    // Add current drawing to history when finished
    if (currentPoints.length > 0) {
      const lastDrawing = currentPoints[currentPoints.length - 1];
      if (lastDrawing.points.length >= 2) {
        setDrawingHistory(prev => [...prev, [lastDrawing]]);
      }
    }
  };

  const saveDrawing = () => {
    if (selectedFrame === null || currentPoints.length === 0) return;
    setIsSaving(true);
    setFrames((prev: DrawingFrame[]) => {
      const newFrames = [...prev];
      const frameIndex = newFrames.findIndex((frame) => frame.id === selectedFrame.id);
      if (frameIndex !== -1) {
        newFrames[frameIndex] = {
          ...selectedFrame,
          drawings: [...selectedFrame.drawings, ...currentPoints]
        };
      }
      return newFrames;
    });
    setIsSaving(false);
    setCurrentPoints([]);
    setSelectedFrame(null);
  };

  const discardDrawing = () => {
    clearAll()
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
        const prevFrame = frames[frameIndex - 1];
        if (prevFrame.drawings?.length > 0) {
          ctx.globalAlpha = 0.3;
          prevFrame.drawings.forEach(drawing => {
            if (drawing?.points?.length >= 2) {
              drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
            }
          });
          ctx.globalAlpha = 1;
        }
      }

      // Draw current frame's saved drawings
      if (frame.drawings?.length > 0) {
        frame.drawings.forEach(drawing => {
          if (drawing?.points?.length >= 2) {
            drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
          }
        });
      }

      // Draw current temp drawings if exists
      if (currentPoints?.length > 0) {
        currentPoints.forEach(drawing => {
          if (drawing?.points?.length >= 2) {
            drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
          }
        });
      }
    };

    img.src = frames[frameIndex].imageData;
  };


  useEffect(() => {
    if (selectedFrame !== null) {
      drawFrame(selectedFrame);
    }
  }, [selectedFrame, currentPoints]);

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
              <div className="text-sm font-medium text-gray-600 flex justify-between items-center">

                <span>Frame {selectedFrame.id + 1}</span>
                <div className='flex gap-2'>
                    <Button
                        onClick={undoLastDrawing}
                        variant="ghost"
                        size="sm"
                        disabled={drawingHistory.length === 0}
                    >
                        <Undo className="h-3 w-3" />
                    </Button>
                    <Button
                        onClick={redoLastDrawing}
                        variant="ghost"
                        size="sm"
                        disabled={redoHistory.length === 0}
                    >
                        <Redo className="h-3 w-3" />
                    </Button>
                </div>

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
            <div className="flex gap-2">
              <Button
                onClick={clearDrawings}
                variant="outline"
                size="sm"
                className="text-orange-600 gap-2"
                disabled={selectedFrame.drawings.length === 0 && currentPoints.length === 0}
              >
                <EraserIcon className="h-4 w-4 " />
                Clear
              </Button>
              
            </div>
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