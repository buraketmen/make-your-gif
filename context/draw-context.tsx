'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Drawing, DrawingFrame, PenSize, DrawingTool, DRAWING_TOOLS } from '@/types/draw';
import { drawPath } from '@/lib/video-frames';
import { useVideo } from './video-context';
import { useToast } from '@/hooks/use-toast';

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
  startPoint: { x: number; y: number } | null;
  setStartPoint: (point: { x: number; y: number } | null) => void;

  clearAllDrawings: () => void;
  undoLastDrawing: () => void;
  redoLastDrawing: () => void;
  saveDrawing: () => void;
  discardDrawing: () => void;
  clearDrawings: () => void;
  drawFrame: (frame: DrawingFrame, canvas: HTMLCanvasElement) => void;
  copyFromPrevious: () => void;

  startDrawing: (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => void;
  draw: (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => void;
  endDrawing: (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => void;
}

interface DrawProviderProps {
  children: React.ReactNode;
}

const DrawContext = createContext<DrawContextType | null>(null);

export const DrawProvider = ({ children }: DrawProviderProps) => {
  const { toast } = useToast();
  const { frames, setFrames, selectedFrame, setSelectedFrame } = useVideo();
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [currentPoints, setCurrentPoints] = useState<Drawing[]>([]);
  const [drawingHistory, setDrawingHistory] = useState<Drawing[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Drawing[][]>([]);
  const [penSize, setPenSize] = useState<PenSize>(4);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const drawShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      shape: DrawingTool,
      start: { x: number; y: number },
      end: { x: number; y: number }
    ) => {
      try {
        if (!ctx || !shape || !start || !end) return;

        const path = new Path2D();

        Object.assign(ctx, {
          strokeStyle: currentColor,
          lineWidth: penSize,
          lineCap: 'round',
          lineJoin: 'round',
        });

        switch (shape) {
          case DRAWING_TOOLS.LINE.id:
            path.moveTo(start.x, start.y);
            path.lineTo(end.x, end.y);
            break;
          case DRAWING_TOOLS.RECTANGLE.id:
            path.rect(start.x, start.y, end.x - start.x, end.y - start.y);
            break;
          case DRAWING_TOOLS.CIRCLE.id:
            const radius = Math.hypot(end.x - start.x, end.y - start.y);
            path.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            break;
          default:
            return;
        }

        ctx.stroke(path);
      } catch (error) {
        console.error('Error drawing shape.', error);
        setError('Error drawing shape.');
      }
    },
    [currentColor, penSize]
  );

  const getCoordinates = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
      canvas: HTMLCanvasElement
    ) => {
      try {
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const { left, top } = rect;
        const { clientX = 0, clientY = 0 } =
          'touches' in e ? e.touches[0] || e.changedTouches[0] || {} : e;

        return {
          x: (clientX - left) * scaleX,
          y: (clientY - top) * scaleY,
        };
      } catch (error) {
        console.error('Error getting coordinates.', error);
        setError('Error getting coordinates.');
        return { x: 0, y: 0 };
      }
    },
    []
  );

  const clearAllDrawings = useCallback(() => {
    setDrawingHistory([]);
    setRedoHistory([]);
    setCurrentPoints([]);
  }, []);

  const undoLastDrawing = useCallback(() => {
    try {
      if (drawingHistory.length === 0) return;

      const newHistory = [...drawingHistory];
      const lastDrawing = newHistory.pop();
      setDrawingHistory(newHistory);

      if (lastDrawing) {
        setRedoHistory((prev) => [...prev, lastDrawing]);
        setCurrentPoints((prev) => prev.slice(0, -1));
      }
    } catch (error) {
      console.error('Error undoing last drawing.', error);
      setError('Error undoing last drawing.');
    }
  }, [drawingHistory]);

  const redoLastDrawing = useCallback(() => {
    try {
      if (redoHistory.length === 0) return;

      const newRedoHistory = [...redoHistory];
      const nextDrawing = newRedoHistory.pop();
      setRedoHistory(newRedoHistory);

      if (nextDrawing) {
        setDrawingHistory((prev) => [...prev, nextDrawing]);
        setCurrentPoints((prev) => [...prev, ...nextDrawing]);
      }
    } catch (error) {
      console.error('Error redoing last drawing.', error);
      setError('Error redoing last drawing.');
    }
  }, [redoHistory]);

  const saveDrawing = useCallback(() => {
    try {
      if (selectedFrame === null || currentPoints.length === 0) return;
      setIsSaving(true);
      setFrames((prev: DrawingFrame[]) => {
        const newFrames = [...prev];
        const frameIndex = newFrames.findIndex((frame) => frame.id === selectedFrame.id);
        if (frameIndex !== -1) {
          newFrames[frameIndex] = {
            ...selectedFrame,
            drawings: [...selectedFrame.drawings, ...currentPoints],
          };
        }
        return newFrames;
      });
      setIsSaving(false);
      setCurrentPoints([]);
      setSelectedFrame(null);
    } catch (error) {
      console.error('Error saving drawing.', error);
      setError('Error saving drawing.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrame, currentPoints, setFrames, setSelectedFrame]);

  const discardDrawing = useCallback(() => {
    clearAllDrawings();
    setSelectedFrame(null);
  }, [clearAllDrawings, setSelectedFrame]);

  const clearDrawings = useCallback(() => {
    if (selectedFrame === null) return;

    try {
      setFrames((prev: DrawingFrame[]) => {
        const newFrames = [...prev];
        const frameIndex = newFrames.findIndex((frame) => frame.id === selectedFrame.id);
        if (frameIndex !== -1) {
          newFrames[frameIndex] = {
            ...selectedFrame,
            drawings: [],
          };
        }
        return newFrames;
      });
      discardDrawing();
    } catch (error) {
      console.error('Error clearing drawings.', error);
      setError('Error clearing drawings.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrame, setFrames, discardDrawing]);

  const drawFrame = useCallback(
    (frame: DrawingFrame, canvas: HTMLCanvasElement) => {
      if (!frame || !canvas) return;

      const frameIndex = frames.findIndex((f) => f.id === frame.id);
      if (frameIndex === -1) return;

      const ctx = canvas.getContext('2d', { alpha: false })!;
      if (!ctx) return;

      const img = new Image();

      const renderFrame = async () => {
        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = frames[frameIndex].imageData;
          });

          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          if (frameIndex > 0) {
            const prevFrame = frames[frameIndex - 1];
            if (prevFrame.drawings?.length > 0) {
              ctx.save();
              ctx.globalAlpha = 0.3;

              prevFrame.drawings.forEach((drawing) => {
                if (drawing?.points?.length >= 2) {
                  drawPath(
                    ctx,
                    drawing.points,
                    drawing.color,
                    drawing.penSize,
                    drawing.tool as DrawingTool
                  );
                }
              });

              ctx.restore();
            }
          }

          if (frame.drawings?.length > 0) {
            frame.drawings.forEach((drawing) => {
              if (drawing?.points?.length >= 2) {
                drawPath(
                  ctx,
                  drawing.points,
                  drawing.color,
                  drawing.penSize,
                  drawing.tool as DrawingTool
                );
              }
            });
          }

          if (currentPoints?.length > 0) {
            currentPoints.forEach((drawing) => {
              if (drawing?.points?.length >= 2) {
                drawPath(
                  ctx,
                  drawing.points,
                  drawing.color,
                  drawing.penSize,
                  drawing.tool as DrawingTool
                );
              }
            });
          }
        } catch (error) {
          console.error('Error rendering frame.', error);
          setError('Error rendering frame.');
        }
      };

      renderFrame();
    },
    [frames, currentPoints]
  );

  const copyFromPrevious = useCallback(() => {
    try {
      if (!selectedFrame || frames.length === 0) return;

      const currentIndex = frames.findIndex((f) => f.id === selectedFrame.id);
      if (currentIndex <= 0) return;

      const previousFrame = frames[currentIndex - 1];
      if (!previousFrame.drawings.length) return;

      const newHistory = [...drawingHistory];
      previousFrame.drawings.forEach((drawing) => {
        newHistory.push([drawing]);
        setCurrentPoints((prev) => [...prev, drawing]);
      });

      setDrawingHistory(newHistory);
      setRedoHistory([]);
    } catch (error) {
      console.error('Error copying from previous frame.', error);
      setError('Error copying from previous frame.');
    }
  }, [frames, selectedFrame, drawingHistory]);

  const startDrawing = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
      canvas: HTMLCanvasElement
    ) => {
      try {
        if (!canvas?.getContext('2d') || selectedFrame === null) return;
        const coords = getCoordinates(e, canvas);
        if (!coords || (coords.x === 0 && coords.y === 0)) return;

        requestAnimationFrame(() => {
          setRedoHistory([]);
          setIsDrawing(true);
          setStartPoint(coords);

          if (currentTool === DRAWING_TOOLS.PEN.id) {
            const newDrawing = {
              points: [coords],
              color: currentColor,
              penSize,
              tool: currentTool,
            };

            setCurrentPoints((prev) => [...prev, newDrawing]);
          }
        });
      } catch (error) {
        console.error('Error starting drawing.', error);
        setError('Error starting drawing.');
      }
    },
    [selectedFrame, currentTool, currentColor, penSize, getCoordinates]
  );

  const draw = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
      canvas: HTMLCanvasElement
    ) => {
      try {
        if (!isDrawing || !canvas || selectedFrame === null) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const coords = getCoordinates(e, canvas);
        if (!coords || (coords.x === 0 && coords.y === 0)) return;

        if (currentTool === DRAWING_TOOLS.PEN.id) {
          setCurrentPoints((prev) => {
            const newPoints = [...prev];
            const currentDrawing = newPoints[newPoints.length - 1];

            if (!currentDrawing?.points) return prev;

            currentDrawing.points = [...currentDrawing.points, coords];
            return newPoints;
          });

          const contextSettings = {
            strokeStyle: currentColor,
            lineWidth: penSize,
            lineCap: 'round',
            lineJoin: 'round',
          };
          Object.assign(ctx, contextSettings);

          const currentDrawing = currentPoints[currentPoints.length - 1];
          const points = currentDrawing?.points;

          if (points?.length >= 2) {
            const lastPoint = points[points.length - 2];
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
          }
          return;
        }

        if (startPoint) {
          let tempCanvas = document.getElementById('temp-canvas') as HTMLCanvasElement;

          if (!tempCanvas) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.id = 'temp-canvas';
            Object.assign(tempCanvas, {
              width: canvas.width,
              height: canvas.height,
              style: { display: 'none' },
            });
            document.body.appendChild(tempCanvas);
          }

          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) return;

          if (!tempCanvas.hasAttribute('data-copied')) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
            tempCanvas.setAttribute('data-copied', 'true');
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempCanvas, 0, 0);
          drawShape(ctx, currentTool, startPoint, coords);
        }
      } catch (error) {
        console.error('Error drawing.', error);
        setError('Error drawing.');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      isDrawing,
      selectedFrame,
      currentTool,
      currentColor,
      penSize,
      currentPoints,
      startPoint,
      drawShape,
      getCoordinates,
    ]
  );

  const endDrawing = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
      canvas: HTMLCanvasElement
    ) => {
      try {
        if (!isDrawing || !canvas || selectedFrame === null || !startPoint) return;

        const coords = getCoordinates(e, canvas);
        if (!coords || (coords.x === 0 && coords.y === 0)) return;

        requestAnimationFrame(() => {
          if (currentTool !== DRAWING_TOOLS.PEN.id) {
            const shapeDrawing = {
              points: [startPoint, coords],
              color: currentColor,
              penSize,
              tool: currentTool,
            };

            setCurrentPoints((prev) => [...prev, shapeDrawing]);
            setDrawingHistory((prev) => [...prev, [shapeDrawing]]);
          } else if (currentPoints.length > 0) {
            const lastDrawing = currentPoints[currentPoints.length - 1];
            if (lastDrawing?.points?.length >= 2) {
              setDrawingHistory((prev) => [...prev, [lastDrawing]]);
            }
          }

          const tempCanvas = document.getElementById('temp-canvas');
          if (tempCanvas) {
            tempCanvas.removeAttribute('data-copied');
            tempCanvas.remove();
          }

          setIsDrawing(false);
          setStartPoint(null);
        });
      } catch (error) {
        console.error('Error ending drawing.', error);
        setError('Error ending drawing.');
      }
    },
    [
      isDrawing,
      selectedFrame,
      startPoint,
      currentTool,
      currentColor,
      penSize,
      currentPoints,
      getCoordinates,
    ]
  );

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
    endDrawing,
  };

  return <DrawContext.Provider value={value}>{children}</DrawContext.Provider>;
};

export const useDraw = () => {
  const context = useContext(DrawContext);
  if (!context) {
    throw new Error('useDraw must be used within a DrawProvider');
  }
  return context;
};
