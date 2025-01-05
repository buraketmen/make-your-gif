'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Drawing, DrawingFrame, PenSize, DrawingTool, DRAWING_TOOLS } from '@/types/draw';
import { drawPath } from '@/lib/utils';
import { useVideo } from './video-context';


interface DrawContextType {
  isDrawing: boolean;
  setIsDrawing: (value: boolean) => void;
  isSaving: boolean;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentPoints: Drawing[];
  setCurrentPoints: (points: Drawing[] | ((prev: Drawing[]) => Drawing[])) => void;
  drawingHistory: Drawing[][];
  setDrawingHistory: (history: Drawing[][] | ((prev: Drawing[][]) => Drawing[][])) => void;
  redoHistory: Drawing[][];
  setRedoHistory: (history: Drawing[][] | ((prev: Drawing[][]) => Drawing[][])) => void;
  penSize: PenSize;
  setPenSize: (size: PenSize) => void;
  currentTool: DrawingTool;
  setCurrentTool: (tool: DrawingTool) => void;
  startPoint: { x: number, y: number } | null;
  setStartPoint: (point: { x: number, y: number } | null) => void;

  clearAllDrawings: () => void;
  undoLastDrawing: () => void;
  redoLastDrawing: () => void;
  saveDrawing: () => void;
  discardDrawing: () => void;
  clearDrawings: () => void;
  drawFrame: (frame: DrawingFrame, canvas: HTMLCanvasElement) => void;
  copyFromPrevious: () => void;

  startDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => void;
  endDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => void;
}

interface DrawProviderProps {
  children: React.ReactNode;
}

const DrawContext = createContext<DrawContextType | null>(null);

export const DrawProvider = ({ children }: DrawProviderProps) => {
  const { frames, setFrames, selectedFrame,setSelectedFrame } = useVideo();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [currentPoints, setCurrentPoints] = useState<Drawing[]>([]);
  const [drawingHistory, setDrawingHistory] = useState<Drawing[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Drawing[][]>([]);
  const [penSize, setPenSize] = useState<PenSize>(4);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: DrawingTool, start: { x: number, y: number }, end: { x: number, y: number }) => {
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape) {
      case DRAWING_TOOLS.LINE.id:
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        break;
      case DRAWING_TOOLS.RECTANGLE.id:
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.rect(start.x, start.y, width, height);
        break;
      case DRAWING_TOOLS.CIRCLE.id:
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        break;
    }
    
    ctx.stroke();
  }, [currentColor, penSize]);

  const clearAllDrawings = useCallback(() => {
    setDrawingHistory([]);
    setRedoHistory([]);
    setCurrentPoints([]);
  }, []);

  const undoLastDrawing = useCallback(() => {
    if (drawingHistory.length === 0) return;
    
    const newHistory = [...drawingHistory];
    const lastDrawing = newHistory.pop();
    setDrawingHistory(newHistory);
    
    if (lastDrawing) {
      setRedoHistory(prev => [...prev, lastDrawing]);
      setCurrentPoints(prev => prev.slice(0, -1));
    }
  }, [drawingHistory]);

  const redoLastDrawing = useCallback(() => {
    if (redoHistory.length === 0) return;

    const newRedoHistory = [...redoHistory];
    const nextDrawing = newRedoHistory.pop();
    setRedoHistory(newRedoHistory);

    if (nextDrawing) {
      setDrawingHistory(prev => [...prev, nextDrawing]);
      setCurrentPoints(prev => [...prev, ...nextDrawing]);
    }
  }, [redoHistory]);

  const saveDrawing = useCallback(() => {
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
  }, [selectedFrame, currentPoints, setFrames, setSelectedFrame]);

  const discardDrawing = useCallback(() => {
    clearAllDrawings();
    setSelectedFrame(null);
  }, [clearAllDrawings, setSelectedFrame]);

  const clearDrawings = useCallback(() => {
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
  }, [selectedFrame, setFrames, discardDrawing]);

  const drawFrame = useCallback((frame: DrawingFrame, canvas: HTMLCanvasElement) => {
    const frameIndex = frames.findIndex((f) => f.id === frame.id);
    if (frameIndex === -1) return;

    const ctx = canvas.getContext('2d')!;
    const img = document.createElement('img');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (frameIndex > 0) {
        const prevFrame = frames[frameIndex - 1];
        if (prevFrame.drawings?.length > 0) {
          ctx.globalAlpha = 0.3;
          prevFrame.drawings.forEach(drawing => {
            if (drawing?.points?.length >= 2) {
              drawPath(ctx, drawing.points, drawing.color, drawing.penSize, drawing.tool as DrawingTool);
            }
          });
          ctx.globalAlpha = 1;
        }
      }

      if (frame.drawings?.length > 0) {
        frame.drawings.forEach(drawing => {
          if (drawing?.points?.length >= 2) {
            drawPath(ctx, drawing.points, drawing.color, drawing.penSize, drawing.tool as DrawingTool);
          }
        });
      }

      if (currentPoints?.length > 0) {
        currentPoints.forEach(drawing => {
          if (drawing?.points?.length >= 2) {
            drawPath(ctx, drawing.points, drawing.color, drawing.penSize, drawing.tool as DrawingTool);
          }
        });
      }
    };

    img.src = frames[frameIndex].imageData;
  }, [frames, currentPoints]);

  const copyFromPrevious = useCallback(() => {
    if (!selectedFrame || frames.length === 0) return;
    
    const currentIndex = frames.findIndex(f => f.id === selectedFrame.id);
    if (currentIndex <= 0) return;
    
    const previousFrame = frames[currentIndex - 1];
    if (!previousFrame.drawings.length) return;

    const newHistory = [...drawingHistory];
    previousFrame.drawings.forEach(drawing => {
      newHistory.push([drawing]);
      setCurrentPoints(prev => [...prev, drawing]);
    });
    
    setDrawingHistory(newHistory);
    setRedoHistory([]);
  }, [frames, selectedFrame, drawingHistory]);

  const getCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch?.clientX ?? 0;
      clientY = touch?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    if (selectedFrame === null) return;
    
    setRedoHistory([]);
    
    const { x, y } = getCoordinates(e, canvas);
    
    setIsDrawing(true);
    setStartPoint({ x, y });

    if (currentTool === DRAWING_TOOLS.PEN.id) {
      setCurrentPoints(prev => [...prev, {
        points: [{ x, y }],
        color: currentColor,
        penSize: penSize,
        tool: currentTool
      }]);
    }
  }, [selectedFrame, currentTool, currentColor, penSize, getCoordinates]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    if (!isDrawing || selectedFrame === null) return;

    const ctx = canvas.getContext('2d')!;
    const { x, y } = getCoordinates(e, canvas);

    if (currentTool === DRAWING_TOOLS.PEN.id) {
      setCurrentPoints(prev => {
        const newPoints = [...prev];
        const currentDrawing = newPoints[newPoints.length - 1];
        currentDrawing.points = [...currentDrawing.points, { x, y }];
        return newPoints;
      });
      
      ctx.beginPath();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const currentDrawing = currentPoints[currentPoints.length - 1];
      const points = currentDrawing.points;
      
      if (points.length >= 2) {
        const lastPoint = points[points.length - 2];
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else if (startPoint) {
      let tempCanvas = document.getElementById('temp-canvas') as HTMLCanvasElement;
      if (!tempCanvas) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.id = 'temp-canvas';
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.style.display = 'none';
        document.body.appendChild(tempCanvas);
      }
      
      const tempCtx = tempCanvas.getContext('2d')!;
      if (!tempCanvas.hasAttribute('data-copied')) {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
        tempCanvas.setAttribute('data-copied', 'true');
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      
      drawShape(ctx, currentTool, startPoint, { x, y });
    }
  }, [isDrawing, selectedFrame, currentTool, currentColor, penSize, currentPoints, startPoint, drawShape, getCoordinates]);

  const endDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    if (!isDrawing || selectedFrame === null || !startPoint) return;
    
    const { x, y } = getCoordinates(e, canvas);

    if (currentTool !== DRAWING_TOOLS.PEN.id) {
      const shapePoints = [
        startPoint,
        { x, y }
      ];
      
      setCurrentPoints(prev => [...prev, {
        points: shapePoints,
        color: currentColor,
        penSize: penSize,
        tool: currentTool
      }]);
      
      setDrawingHistory(prev => [...prev, [{
        points: shapePoints,
        color: currentColor,
        penSize: penSize,
        tool: currentTool
      }]]);
    } else if (currentPoints.length > 0) {
      const lastDrawing = currentPoints[currentPoints.length - 1];
      if (lastDrawing.points.length >= 2) {
        setDrawingHistory(prev => [...prev, [lastDrawing]]);
      }
    }

    // Clean up temporary canvas
    const tempCanvas = document.getElementById('temp-canvas');
    if (tempCanvas) {
      tempCanvas.removeAttribute('data-copied');
    }

    setIsDrawing(false);
    setStartPoint(null);
  }, [isDrawing, selectedFrame, startPoint, currentTool, currentColor, penSize, currentPoints, getCoordinates]);

  const value = {
    isDrawing,
    setIsDrawing,
    isSaving,
    currentColor,
    setCurrentColor,
    currentPoints,
    setCurrentPoints,
    drawingHistory,
    setDrawingHistory,
    redoHistory,
    setRedoHistory,
    penSize,
    setPenSize,
    currentTool,
    setCurrentTool,
    startPoint,
    setStartPoint,
    clearAllDrawings,
    undoLastDrawing,
    redoLastDrawing,
    saveDrawing,
    discardDrawing,
    clearDrawings,
    drawFrame,
    copyFromPrevious,
    startDrawing,
    draw,
    endDrawing
  };

  return (
    <DrawContext.Provider value={value}>
      {children}
    </DrawContext.Provider>
  );
};

export const useDraw = () => {
  const context = useContext(DrawContext);
  if (!context) {
    throw new Error('useDraw must be used within a DrawProvider');
  }
  return context;
}; 