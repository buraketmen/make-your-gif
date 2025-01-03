import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { DRAWING_TOOLS, DrawingFrame, DrawingTool } from '@/types/draw';
import { extractVideoFrames, convertToDrawingFrames } from './video-frames';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CropCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropDimensions {
  pixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ffmpegFilter: string;
  relativeFilter: string;
}

export const calculateCropDimensions = (
  coordinates: CropCoordinates,
  videoWidth: number,
  videoHeight: number
): CropDimensions => {
  const cropX = Math.round((coordinates.x / 100) * videoWidth);
  const cropY = Math.round((coordinates.y / 100) * videoHeight);
  const cropWidth = Math.round((coordinates.width / 100) * videoWidth);
  const cropHeight = Math.round((coordinates.height / 100) * videoHeight);

  return {
    pixels: {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    },
    ffmpegFilter: `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`,
    relativeFilter: `crop=iw*${coordinates.width/100}:ih*${coordinates.height/100}:iw*${coordinates.x/100}:ih*${coordinates.y/100}`
  };
};

export const drawPath = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  penSize: number,
  tool: DrawingTool = DRAWING_TOOLS.PEN.id
) => {
  if (!points || points.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = penSize;
  
  switch (tool) {
    case DRAWING_TOOLS.PEN.id:
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      break;
    case DRAWING_TOOLS.LINE.id:
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      break;
    case DRAWING_TOOLS.RECTANGLE.id:
      ctx.rect(points[0].x, points[0].y, points[1].x - points[0].x, points[1].y - points[0].y);
      break;
    case DRAWING_TOOLS.CIRCLE.id:
      ctx.arc(points[0].x, points[0].y, Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)), 0, 2 * Math.PI);
      break;
    default:
      break;
  }
  ctx.stroke();
};

export const drawFrameToCanvas = (frame: DrawingFrame, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')!;
  const img = document.createElement('img');
  
  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const width = frame.width || img.naturalWidth;
      const height = frame.height || img.naturalHeight;
      
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      frame.drawings.forEach(drawing => {
        if (drawing.tool === DRAWING_TOOLS.PEN.id) {
          drawPath(ctx, drawing.points, drawing.color, drawing.penSize);
        } else if (drawing.points.length === 2) {
          ctx.beginPath();
          ctx.strokeStyle = drawing.color;
          ctx.lineWidth = drawing.penSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const [start, end] = drawing.points;
          switch (drawing.tool) {
            case DRAWING_TOOLS.LINE.id:
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(end.x, end.y);
              break;
            case DRAWING_TOOLS.RECTANGLE.id:
              const rectWidth = end.x - start.x;
              const rectHeight = end.y - start.y;
              ctx.rect(start.x, start.y, rectWidth, rectHeight);
              break;
            case DRAWING_TOOLS.CIRCLE.id:
              const radius = Math.sqrt(
                Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
              );
              ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
              break;
          }
          ctx.stroke();
        }
      });

      resolve();
    };

    img.onerror = () => {
      reject(new Error('Failed to load frame image'));
    };

    img.src = frame.imageData;
  });
};


export const extractFramesFromVideo = (
  video: HTMLVideoElement,
  fps: number = 30,
  startTime?: number,
  endTime?: number,
  onProgress?: (current: number, total: number) => void
): Promise<DrawingFrame[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const effectiveStart = startTime ?? 0;
      const effectiveEnd = endTime ?? video.duration;
      
      const videoFrames = await extractVideoFrames({
        video,
        format: 'image/jpeg',
        quality: 1,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        count: Math.floor((effectiveEnd - effectiveStart) * fps),
        onProgress: (current, total) => {
          if (onProgress) {
            onProgress(current, total);
          }
        },
      });

      const drawingFrames = convertToDrawingFrames(videoFrames);
      
      if (drawingFrames.length > 0) {
        const img = document.createElement('img');
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            drawingFrames.forEach(frame => {
              frame.width = img.width;
              frame.height = img.height;
            });
            resolve();
          };
          img.onerror = () => reject(new Error('Failed to load frame image'));
          img.src = drawingFrames[0].imageData;
        });
      }

      console.log(`Frame extraction complete. Captured ${drawingFrames.length} frames.`);
      resolve(drawingFrames);
    } catch (error) {
      console.error('Error during frame extraction:', error);
      reject(error);
    }
  });
}; 